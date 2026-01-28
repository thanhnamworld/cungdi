
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  User, Phone, ShieldCheck, Save, Loader2, Clock, 
  CheckCircle2, Navigation, Ticket, ArrowRight, AlertCircle, 
  History, Calendar, LucideIcon, Bookmark, Camera, Car, Shield, Settings, X, Sparkles, MapPin, Copy, LogOut,
  Timer, Play, Ban, Map as MapIcon, Database, UploadCloud, Lock, Key, Mail, AlertTriangle, Link, Medal, Trophy, Gem, Heart
} from 'lucide-react';
import { Profile, UserRole, Trip, Booking, MembershipTier } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { getTripStatusDisplay } from './SearchTrips';
import { statusOptions as bookingStatusOptions } from './OrderManagement';
import imageCompression from 'browser-image-compression';

interface ProfileManagementProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onUpdate: () => void;
  stats: {
    tripsCount: number;
    bookingsCount: number;
  };
  allTrips: Trip[];
  userBookings: Booking[];
  onManageVehicles: () => void;
}

interface ActivityItem {
  id: string;
  type: 'trip' | 'booking';
  title: string;
  description: string;
  timestamp: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  raw: Trip | Booking;
}

const AVATAR_FIX_SQL = `
-- Tạo bucket 'avatars' (Public)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Thiết lập Policy cho phép truy cập công khai
create policy "Public Access Avatars" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Public Insert Avatars" on storage.objects for insert with check ( bucket_id = 'avatars' );
create policy "Public Update Avatars" on storage.objects for update using ( bucket_id = 'avatars' );
create policy "Public Delete Avatars" on storage.objects for delete using ( bucket_id = 'avatars' );
`;

const getTierConfig = (tier: MembershipTier = 'standard') => {
    switch (tier) {
        case 'silver': return { label: 'Bạc', icon: Medal, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', discountVal: 10, discountLabel: '10%' };
        case 'gold': return { label: 'Vàng', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', discountVal: 20, discountLabel: '20%' };
        case 'diamond': return { label: 'Kim Cương', icon: Gem, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100', discountVal: 30, discountLabel: '30%' };
        case 'family': return { label: 'Gia Đình', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', discountVal: 80, discountLabel: '80%' };
        default: return { label: 'Thường', icon: User, color: 'text-slate-400', bg: 'bg-white', border: 'border-slate-100', discountVal: 0, discountLabel: '0%' };
    }
};

const ProfileManagement: React.FC<ProfileManagementProps> = ({ isOpen, onClose, profile, onUpdate, stats, allTrips, userBookings, onManageVehicles }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [originalEmail, setOriginalEmail] = useState(profile?.email || '');
  
  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [activeFilter, setActiveFilter] = useState<'all' | 'trip' | 'booking'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showAvatarFix, setShowAvatarFix] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone?.replace(/^(?:\+84|84)/, '0') || '');
      // Fetch User Email securely from current session as well
      supabase.auth.getUser().then(({ data }) => {
        const userEmail = data.user?.email || profile.email || '';
        setEmail(userEmail);
        setOriginalEmail(userEmail);
      });
    }
  }, [profile, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];
    const myTrips = allTrips.filter(t => t.driver_id === profile?.id);
    myTrips.forEach(t => {
      items.push({
        id: `trip-${t.id}`,
        type: 'trip',
        title: 'Đăng chuyến',
        description: `${t.origin_name} → ${t.dest_name}`,
        timestamp: t.created_at || t.departure_time,
        icon: Navigation,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        raw: t
      });
    });

    userBookings.forEach(b => {
      items.push({
        id: `booking-${b.id}`,
        type: 'booking',
        title: 'Đặt chỗ',
        description: `Mã đơn: S${b.id.substring(0, 5).toUpperCase()}`,
        timestamp: b.created_at,
        icon: Ticket,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        raw: b
      });
    });

    let sorted = items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (activeFilter !== 'all') {
      sorted = sorted.filter(item => item.type === activeFilter);
    }
    return sorted.slice(0, 10);
  }, [allTrips, userBookings, profile, activeFilter]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setMessage(null);
    try {
      // 1. Đồng bộ Email & Info vào bảng 'profiles' ngay lập tức
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
            full_name: fullName, 
            phone: phone,
            email: email.trim() // Đồng bộ Email lên hệ thống công khai
        })
        .eq('id', profile.id);
      
      if (profileError) throw profileError;

      let authUpdates: any = {};
      let successMsg = 'Cập nhật thông tin thành công!';
      let requiresReAuth = false;

      // 2. Cập nhật Auth Email (Dành cho đăng nhập)
      if (email && email.trim() !== originalEmail) {
         authUpdates.email = email.trim();
         successMsg += ' Vui lòng kiểm tra hộp thư mới để xác nhận liên kết Email.';
      }

      // 3. Cập nhật Mật khẩu
      if (newPassword) {
        if (newPassword.length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
        if (newPassword !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp');
        authUpdates.password = newPassword;
      }

      if (Object.keys(authUpdates).length > 0) {
         const { error: authError } = await supabase.auth.updateUser(authUpdates);
         
         if (authError) {
             // Xử lý lỗi Session JWT đặc biệt
             if (authError.message.includes('session_id') || authError.message.includes('JWT')) {
                 requiresReAuth = true;
                 throw new Error('Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để cập nhật Email/Mật khẩu.');
             }
             throw authError;
         }
      }

      setMessage({ type: 'success', text: successMsg });
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      
      // Cập nhật trạng thái Email gốc để xóa cảnh báo UI
      if (email.trim() !== originalEmail) {
          setOriginalEmail(email.trim());
      }
      
      onUpdate();
      setTimeout(() => setMessage(null), 6000);
    } catch (err: any) {
      console.error("Update error:", err);
      setMessage({ type: 'error', text: err.message || 'Đã có lỗi xảy ra khi đồng bộ dữ liệu.' });
      
      // Nếu là lỗi session, gợi ý làm mới trang
      if (err.message.includes('đăng nhập lại')) {
          setTimeout(() => {
              if (window.confirm("Bạn có muốn đăng xuất và đăng nhập lại ngay bây giờ?")) {
                  supabase.auth.signOut().then(() => window.location.reload());
              }
          }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const processAndCompressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas error')); return; }

          const size = Math.min(img.width, img.height);
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;

          const MAX_DIMENSION = 512;
          canvas.width = MAX_DIMENSION;
          canvas.height = MAX_DIMENSION;

          ctx.drawImage(img, startX, startY, size, size, 0, 0, MAX_DIMENSION, MAX_DIMENSION);

          canvas.toBlob(async (blob) => {
            if (!blob) { reject(new Error('Lỗi xử lý ảnh')); return; }
            
            const croppedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });

            const options = {
              maxSizeMB: 0.15,
              maxWidthOrHeight: 512,
              useWebWorker: true,
              fileType: 'image/jpeg'
            };

            try {
              const compressedFile = await imageCompression(croppedFile, options);
              resolve(compressedFile);
            } catch (error) {
              console.error("Lỗi nén ảnh:", error);
              resolve(croppedFile);
            }
          }, 'image/jpeg', 0.95);
        };
        img.onerror = () => reject(new Error('Lỗi tải ảnh'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Lỗi đọc file'));
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !event.target.files || event.target.files.length === 0) return;
    
    try {
      setUploading(true);
      setAvatarError(null);
      setShowAvatarFix(false);

      const originalFile = event.target.files[0];
      const processedFile = await processAndCompressImage(originalFile);

      const fileExt = 'jpg';
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, processedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      onUpdate(); 
      setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });

    } catch (error: any) {
      console.error('Avatar upload error:', error);
      const errMsg = error.message || '';
      
      if (errMsg.includes('not found') || errMsg.includes('Bucket')) {
        setAvatarError('Bucket "avatars" chưa được tạo trong Supabase.');
        setShowAvatarFix(true);
      } else {
        setMessage({ type: 'error', text: errMsg || 'Lỗi khi tải ảnh lên.' });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(AVATAR_FIX_SQL);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getRoleBadgeConfig = (role?: UserRole) => {
    switch(role) {
      case 'admin': return { label: 'Quản trị viên', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: Shield };
      case 'driver': return { label: 'Tài xế', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: Car };
      case 'manager': return { label: 'Điều phối', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', icon: Settings };
      default: return { label: 'Thành viên', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', icon: User };
    }
  };

  if (!isOpen) return null;

  const userCode = `C${profile?.id.substring(0, 5).toUpperCase() || '00000'}`;
  const roleInfo = getRoleBadgeConfig(profile?.role);
  const RoleIcon = roleInfo.icon;
  const isPhoneUser = !originalEmail; // Cảnh báo nếu chưa có email
  const tierConfig = getTierConfig(profile?.membership_tier);
  const TierIcon = tierConfig.icon;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] md:h-auto md:max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div 
            ref={modalRef}
            className="bg-[#F8FAFC] w-full h-full rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-white"
        >
            <div className="h-32 bg-gradient-to-r from-emerald-50/80 via-white/90 to-indigo-50/80 relative shrink-0 border-b border-emerald-50">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mt-28 pt-16 px-6 pb-8 relative z-10">
            
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8 mb-6 relative">
                
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-[28px] bg-white p-1 shadow-lg shrink-0 -mt-16 md:-mt-0 md:absolute md:-top-12 md:left-6">
                    <div 
                    className="w-full h-full rounded-[24px] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-4xl font-bold text-slate-300 border border-slate-100 overflow-hidden relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    >
                    {uploading ? (
                        <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-emerald-500" size={24} />
                        <span className="text-[8px] font-bold text-emerald-600 mt-1">Đang xử lý</span>
                        </div>
                    ) : null}
                    
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-indigo-500">{profile?.full_name?.charAt(0) || 'U'}</span>
                    )}
                    
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                        <Camera size={24} className="text-white drop-shadow-md" />
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                    />
                    </div>
                </div>

                <div className="hidden md:block w-28 shrink-0"></div>

                <div className="flex-1 text-center md:text-left min-w-0 w-full">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3 truncate">{profile?.full_name}</h2>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
                    <div className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}>
                        <RoleIcon size={12} /> {roleInfo.label}
                    </div>

                    {/* Tier Badge */}
                    <div className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border ${tierConfig.bg} ${tierConfig.color.replace('text-','text-slate-800 ')} ${tierConfig.border}`}>
                        <TierIcon size={12} className={tierConfig.color} /> 
                        {tierConfig.label} 
                        {tierConfig.discountVal > 0 && <span className="bg-white/50 px-1 rounded text-rose-600">-{tierConfig.discountLabel}</span>}
                    </div>

                    <div className="group relative">
                        <div className="relative px-3 py-1.5 w-24 justify-center rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100 transition-colors">
                            <CopyableCode code={userCode} className="font-bold" />
                        </div>
                    </div>

                    <div className="group relative">
                        <div className="relative px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 cursor-pointer hover:bg-emerald-100 transition-colors">
                            <Phone size={12} />
                            <CopyableCode code={profile?.phone || ''} label={profile?.phone?.replace(/^(?:\+84|84)/, '0') || 'Chưa có SĐT'} className="font-bold" />
                        </div>
                    </div>
                    </div>
                </div>

                <div className="flex gap-3 shrink-0">
                    <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 text-center min-w-[70px]">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Chuyến đi</p>
                    <p className="text-lg font-black text-slate-700 leading-none mt-0.5">{stats.tripsCount}</p>
                    </div>
                    <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 text-center min-w-[70px]">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Chuyến đặt</p>
                    <p className="text-lg font-black text-slate-700 leading-none mt-0.5">{stats.bookingsCount}</p>
                    </div>
                </div>
            </div>

            {showAvatarFix && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-2 text-rose-600 font-bold text-sm">
                    <AlertCircle size={16} />
                    Lỗi hệ thống: {avatarError}
                </div>
                <p className="text-xs text-slate-600 mb-3">Vui lòng chạy đoạn mã SQL sau trong Supabase Editor để tạo bucket lưu trữ ảnh đại diện:</p>
                
                <div className="relative group">
                    <textarea 
                    readOnly 
                    value={AVATAR_FIX_SQL}
                    className="w-full h-32 p-3 bg-white text-[10px] font-mono rounded-xl border border-rose-200 text-slate-700 outline-none resize-none shadow-sm"
                    />
                    <button 
                    type="button" 
                    onClick={handleCopySQL}
                    className="absolute top-2 right-2 p-1.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                    {copySuccess ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                </div>
                <div className="mt-2 text-right">
                    <a 
                    href="https://supabase.com/dashboard/project/_/sql" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition-colors font-bold"
                    >
                    <Database size={12} /> Mở Supabase SQL Editor
                    </a>
                </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings size={16} className="text-indigo-500" />
                        <h3 className="text-sm font-bold text-slate-800">Cài đặt tài khoản</h3>
                    </div>
                    
                    <form onSubmit={handleUpdate} className="space-y-3">
                        {message && (
                            <div className={`p-3 rounded-xl text-[10px] font-bold border flex items-center gap-2 animate-in fade-in zoom-in-95 ${
                            message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                            {message.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            {message.text}
                            </div>
                        )}

                        {/* Link Email Warning for Phone Users */}
                        {isPhoneUser && (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-[10px] text-amber-800 flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-bold"><Link size={12}/> Liên kết Email</div>
                            <p>Bạn đang đăng nhập bằng Số điện thoại. Vui lòng thêm Email để có thể tự khôi phục mật khẩu nếu quên.</p>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">Tên hiển thị</label>
                            <input 
                            type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">Số điện thoại (Công khai)</label>
                            <input 
                            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-50 transition-all"
                            />
                        </div>
                        
                        {/* Email Linking Field */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block flex justify-between">
                            Email (Dùng để đăng nhập & Khôi phục)
                            {email && email === originalEmail && originalEmail !== '' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10}/> Đã xác thực</span>}
                            </label>
                            <div className="relative">
                            <input 
                                type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="nhap@email.com"
                                className={`w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-50 transition-all ${isPhoneUser ? 'border-amber-200 bg-amber-50 focus:border-amber-400 focus:ring-amber-100' : ''}`}
                            />
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        {/* Password Change Section */}
                        <div className="pt-2">
                            <button 
                            type="button"
                            onClick={() => setIsChangingPassword(!isChangingPassword)}
                            className="flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-2 ml-1"
                            >
                            {isChangingPassword ? <X size={12} /> : <Key size={12} />}
                            {isChangingPassword ? 'Hủy đổi mật khẩu' : 'Đổi mật khẩu'}
                            </button>
                            
                            {isChangingPassword && (
                            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in slide-in-from-top-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">Mật khẩu mới</label>
                                    <input 
                                        type="password" 
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Ít nhất 6 ký tự"
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-300 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">Xác nhận mật khẩu</label>
                                    <input 
                                        type="password" 
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Nhập lại mật khẩu"
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-300 transition-all"
                                    />
                                </div>
                            </div>
                            )}
                        </div>

                        <button 
                            type="submit" disabled={loading}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Lưu thay đổi
                        </button>
                    </form>
                </div>

                {profile?.role === 'driver' && (
                    <button onClick={onManageVehicles} className="w-full p-4 bg-slate-800 text-white rounded-[24px] shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-lg"><Car size={16} /></div>
                            <div className="text-left">
                            <p className="text-xs font-bold">Quản lý đội xe</p>
                            <p className="text-[9px] text-slate-400">Thêm, sửa, xóa xe</p>
                            </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </button>
                )}
                
                <button 
                    onClick={() => supabase.auth.signOut()} 
                    className="w-full p-4 bg-white border border-rose-100 text-rose-500 rounded-[24px] hover:bg-rose-50 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                >
                    <LogOut size={14} /> Đăng xuất tài khoản
                </button>
                </div>

                <div className="lg:col-span-7">
                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <History size={16} className="text-emerald-500" />
                            <h3 className="text-sm font-bold text-slate-800">Hoạt động gần đây</h3>
                        </div>
                        <div className="flex gap-1">
                            {['all', 'trip', 'booking'].map((t) => (
                            <button 
                                key={t}
                                onClick={() => setActiveFilter(t as any)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${activeFilter === t ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                            >
                                {t === 'all' ? 'Tất cả' : t === 'trip' ? 'Chuyến' : 'Đơn'}
                            </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 relative min-h-[300px]">
                        <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-slate-100"></div>
                        {activities.length > 0 ? activities.map((item) => {
                            const isTrip = item.type === 'trip';
                            let statusConfig;
                            
                            if (isTrip) {
                            statusConfig = getTripStatusDisplay(item.raw as Trip);
                            } else {
                            const statusVal = (item.raw as Booking).status;
                            statusConfig = bookingStatusOptions.find(s => s.value === statusVal) || { 
                                label: statusVal, 
                                style: 'bg-slate-100 text-slate-500 border-slate-200', 
                                icon: AlertCircle 
                            };
                            }
                            
                            const StatusIcon = statusConfig.icon;

                            return (
                            <div key={item.id} className="relative pl-12 py-2 group">
                                <div className={`absolute left-[11px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${item.bgColor} flex items-center justify-center`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${item.color.replace('text-', 'bg-')}`}></div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-sm transition-all">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-800">{item.title}</p>
                                        <p className="text-[9px] text-slate-500 truncate max-w-[150px] sm:max-w-[200px]">{item.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-slate-400 mb-1">{new Date(item.timestamp).toLocaleDateString('vi-VN')}</p>
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-bold uppercase ${statusConfig.style}`}>
                                        <StatusIcon size={10} />
                                        {statusConfig.label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            );
                        }) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <History size={32} className="mb-2" />
                            <p className="text-[10px] font-bold">Chưa có dữ liệu</p>
                            </div>
                        )}
                    </div>
                </div>
                </div>

            </div>
            </div>
        </div>
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 md:-top-4 md:-right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[210] border-2 border-white"
        >
            <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default ProfileManagement;
