
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Shield, Search, Phone, Loader2, ArrowUpDown, Trash2, ChevronDown, Check, Car, Ticket, 
  Trophy, Star, Medal, Zap, CalendarDays, User, Settings, ShieldAlert, Edit3, X, Save, Clock, Crown, LayoutList, LayoutGrid, Key, Mail, CheckSquare, Square, Gem, Heart, Award, ToggleLeft, ToggleRight, Sliders, Layers, Handshake
} from 'lucide-react';
import { Profile, UserRole, MembershipTier } from '../types.ts';
import { supabase } from '../lib/supabase.ts';
import CopyableCode from './CopyableCode.tsx';
import { UnifiedDropdown } from './SearchTrips.tsx';

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
};

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

interface UserWithStats extends Profile {
  trips_count: number;
  bookings_count: number;
  last_activity_at?: string;
  created_at?: string; 
  email?: string;
}

// 1. Hàm lấy Style cho Avatar & Nhãn dựa trên Quyền hạn (Thêm mô tả chi tiết cho Tooltip)
const getRoleStyle = (role: UserRole) => {
  switch (role) {
    case 'admin': 
      return { label: 'Quản trị', style: 'bg-rose-50 text-rose-600 border-rose-100', icon: Shield, desc: 'Quản trị viên: Có toàn quyền kiểm soát hệ thống, cấu hình người dùng và quản lý dữ liệu.' };
    case 'manager': 
      return { label: 'Điều phối', style: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: Settings, desc: 'Điều phối viên: Chịu trách nhiệm giám sát các chuyến xe, đơn hàng và hỗ trợ tài xế/khách hàng.' };
    case 'driver': 
      return { label: 'Tài xế', style: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: Car, desc: 'Đối tác lái xe: Có quyền đăng chuyến, quản lý phương tiện và nhận yêu cầu từ hành khách.' };
    default: 
      return { label: 'Thành viên', style: 'bg-sky-50 text-sky-600 border-sky-100', icon: User, desc: 'Thành viên phổ thông: Có thể tìm kiếm chuyến xe, đăng yêu cầu tìm xe và theo dõi lịch trình.' };
  }
};

// Hàm lấy config cho Membership Tier (Hardcoded Discounts)
const getTierConfig = (tier: MembershipTier = 'standard') => {
    switch (tier) {
        case 'silver': return { label: 'Bạc', icon: Award, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', discountVal: 10, discountLabel: '10%', desc: 'Ưu đãi cấp độ Bạc: Giảm giá 10% trên tổng hóa đơn (áp dụng tại các đối tác hỗ trợ).' };
        case 'gold': return { label: 'Vàng', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', discountVal: 20, discountLabel: '20%', desc: 'Ưu đãi cấp độ Vàng: Giảm giá 20% trên tổng hóa đơn, ưu tiên xử lý yêu cầu khẩn cấp.' };
        case 'diamond': return { label: 'Kim Cương', icon: Gem, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100', discountVal: 30, discountLabel: '30%', desc: 'Ưu đãi Kim Cương: Giảm giá 30%, hỗ trợ chăm chăm sóc khách hàng đặc biệt 24/7.' };
        case 'family': return { label: 'Gia Đình', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', discountVal: 80, discountLabel: '80%', desc: 'Cấp độ Gia Đình: Ưu đãi đặc biệt giảm 80% chi phí cho các thành viên trong nhóm liên kết.' };
        default: return { label: 'Thường', icon: User, color: 'text-slate-400', bg: 'bg-white', border: 'border-slate-100', discountVal: 0, discountLabel: '0%', desc: 'Thành viên mới/Tiêu chuẩn: Tận hưởng dịch vụ kết nối xe tiện chuyến nhanh chóng.' };
    }
};

// 2. Hàm phân cấp màu sắc cho số lượng (Heatmap levels)
const getCountLevelStyle = (count: number) => {
  if (count === 0) return 'bg-slate-50 text-slate-300 border-slate-100'; // Inactive
  if (count < 5) return 'bg-sky-50 text-sky-600 border-sky-100'; // Starter (1-4)
  if (count < 10) return 'bg-emerald-50 text-emerald-600 border-emerald-100'; // Active (5-9)
  if (count < 20) return 'bg-amber-50 text-amber-600 border-amber-100'; // Frequent (10-19)
  if (count < 50) return 'bg-rose-50 text-rose-600 border-rose-100'; // High (20-49)
  return 'bg-purple-50 text-purple-600 border-purple-100'; // Elite (50+)
};

const CircleCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
      checked 
        ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-200 scale-105' 
        : 'bg-white border-slate-300 hover:border-indigo-400'
    }`}
  >
    {checked && <Check size={12} className="text-white" strokeWidth={3} />}
  </button>
);

const RoleSelector = ({ value, onChange, disabled, compact = false, direction = 'down' }: { value: UserRole, onChange: (role: UserRole) => void, disabled?: boolean, compact?: boolean, direction?: 'up' | 'down' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const roles: { label: string, value: UserRole, icon: any, color: string, style: string }[] = [
    { label: 'Quản trị', value: 'admin', icon: Shield, color: 'text-rose-600', style: 'bg-rose-50 text-rose-600 border-rose-100' },
    { label: 'Điều phối', value: 'manager', icon: Settings, color: 'text-indigo-600', style: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { label: 'Tài xế', value: 'driver', icon: Car, color: 'text-emerald-600', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { label: 'Thành viên', value: 'user', icon: User, color: 'text-sky-600', style: 'bg-sky-50 text-sky-600 border-sky-100' },
  ];
  
  const filteredRoles = roles.filter(r => removeAccents(r.label).includes(removeAccents(search)));
  const currentRole = roles.find(r => r.value === value) || roles[3];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full h-full" ref={dropdownRef}>
      <button 
        type="button" 
        disabled={disabled} 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-full h-full flex items-center rounded-xl transition-all duration-300 relative z-10 ${disabled ? 'opacity-80 cursor-not-allowed' : ''} ${ compact ? 'p-2.5 justify-center md:px-3 md:py-2 md:justify-between bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100' : 'px-3 py-1.5 justify-between border hover:brightness-95 ' + currentRole.style } ${isOpen && !compact ? 'ring-2 ring-indigo-100 border-indigo-400 shadow-sm' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <currentRole.icon size={14} className={currentRole.color.split(' ')[0]} />
          <span className={`text-[10px] font-bold truncate ${compact ? 'hidden md:inline' : ''}`}>{compact ? 'Chọn: ' + currentRole.label : currentRole.label}</span>
        </div>
        <ChevronDown size={12} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''} ${compact ? 'text-slate-400 hidden md:inline-block' : 'opacity-50'}`} />
      </button>
      
      {isOpen && (
        <div 
          className={`absolute ${direction === 'up' ? 'bottom-full mb-3' : 'top-full mt-1'} right-0 w-52 bg-white rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.3)] border border-slate-100 z-[1000] p-1.5 animate-in fade-in zoom-in-95 ${direction === 'up' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} duration-200`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1 mb-1 relative">
            <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              autoFocus 
              placeholder="Tìm quyền..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-0.5 p-0.5 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
            {filteredRoles.length > 0 ? filteredRoles.map((role) => (
              <button key={role.value} type="button" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(role.value); setIsOpen(false); setSearch(''); }}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all ${value === role.value ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}>
                <div className="flex items-center gap-3">
                  <role.icon size={14} className={value === role.value ? 'text-white' : role.color.split(' ')[0]} />
                  <span className="text-[11px] font-bold">{role.label}</span>
                </div>
                {value === role.value && <Check size={14} className="text-white" strokeWidth={3} />}
              </button>
            )) : (
              <div className="p-4 text-center text-[10px] text-slate-400 italic font-medium">Không tìm thấy kết quả</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Updated TierSelector with Search, consistent direction logic and style
const TierSelector = ({ value, onChange, disabled, compact = false, direction = 'down' }: { value: MembershipTier, onChange: (tier: MembershipTier) => void, disabled?: boolean, compact?: boolean, direction?: 'up' | 'down' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const tiers: MembershipTier[] = ['standard', 'silver', 'gold', 'diamond', 'family'];

    const filteredTiers = tiers.filter(t => {
        const config = getTierConfig(t);
        return removeAccents(config.label).includes(removeAccents(search));
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const currentConfig = getTierConfig(value || 'standard');

    return (
        <div className="relative w-full h-full" ref={dropdownRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`w-full h-full flex items-center rounded-xl transition-all duration-300 relative z-10 ${disabled ? 'opacity-80 cursor-not-allowed' : ''} ${ compact ? 'p-2.5 justify-center md:px-3 md:py-2 md:justify-between bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100' : 'px-3 py-1.5 justify-between border hover:brightness-95 ' + currentConfig.bg + ' ' + currentConfig.border } ${isOpen && !compact ? 'ring-2 ring-indigo-100 border-indigo-400 shadow-sm' : ''}`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <currentConfig.icon size={14} className={currentConfig.color} />
                    <span className={`text-[10px] font-bold truncate ${compact ? 'hidden md:inline text-slate-700' : currentConfig.color.replace('text-','text-slate-800 ')}`}>{compact ? 'Chọn: ' + currentConfig.label : currentConfig.label}</span>
                </div>
                <ChevronDown size={12} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''} ${compact ? 'text-slate-400 hidden md:inline-block' : 'opacity-50'}`} />
            </button>

            {isOpen && !disabled && (
                <div 
                    className={`absolute ${direction === 'up' ? 'bottom-full mb-3' : 'top-full mt-1'} right-0 w-52 bg-white rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.3)] border border-slate-100 z-[1000] p-1.5 animate-in fade-in zoom-in-95 ${direction === 'up' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} duration-200`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-1 mb-1 relative">
                        <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                        type="text" 
                        autoFocus 
                        placeholder="Tìm cấp độ..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                        />
                    </div>
                    <div className="space-y-0.5 p-0.5 max-h-56 overflow-y-auto custom-scrollbar">
                    {filteredTiers.length > 0 ? filteredTiers.map(tier => {
                        const config = getTierConfig(tier);
                        return (
                            <button
                                key={tier}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(tier); setIsOpen(false); setSearch(''); }}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-all ${value === tier ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <config.icon size={12} className={value === tier ? 'text-white' : config.color} />
                                    <span className="text-[11px] font-bold">{config.label}</span>
                                </div>
                                {value === tier && <Check size={12} className="text-white" />}
                            </button>
                        )
                    }) : (
                        <div className="p-4 text-center text-[10px] text-slate-400 italic font-medium">Không tìm thấy kết quả</div>
                    )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ToggleSelector = ({ value, onChange, label, direction = 'down' }: { value: boolean, onChange: (val: boolean) => void, label: string, direction?: 'up' | 'down' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative w-full h-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
                className="w-full h-full flex items-center justify-center md:justify-between p-2.5 md:px-3 md:py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all"
            >
                <div className="flex items-center gap-2">
                    {value ? <ToggleRight size={14} className="text-emerald-500" /> : <ToggleLeft size={14} className="text-slate-400" />}
                    <span className="text-[10px] font-bold hidden md:inline">{value ? 'Đang Bật' : 'Đang Tắt'}</span>
                </div>
                <ChevronDown size={12} className={`text-slate-400 transition-transform hidden md:inline-block ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className={`absolute ${direction === 'up' ? 'bottom-full mb-3' : 'top-full mt-1'} right-0 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 z-[1000] p-1 animate-in fade-in zoom-in-95`}>
                    <button onClick={() => { onChange(true); setIsOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold ${value ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                        <span className="flex items-center gap-2"><ToggleRight size={14}/> Bật {label}</span>
                        {value && <Check size={12}/>}
                    </button>
                    <button onClick={() => { onChange(false); setIsOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold ${!value ? 'bg-rose-50 text-rose-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                        <span className="flex items-center gap-2"><ToggleLeft size={14}/> Tắt {label}</span>
                        {!value && <Check size={12}/>}
                    </button>
                </div>
            )}
        </div>
    );
}

interface AdminPanelProps {
    showAlert: (config: any) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ showAlert }) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ full_name: '', phone: '' });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState<string[]>(['ALL']);
  const [tierFilter, setTierFilter] = useState<string[]>(['ALL']); 
  const [activityTimeFilter, setActivityTimeFilter] = useState<string[]>(['ALL']); 
  
  const [sortOrder, setSortOrder] = useState('NAME_ASC');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'full_name', direction: 'asc' });

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Bulk Action Mode
  const [bulkActionType, setBulkActionType] = useState<'ROLE' | 'TIER' | 'DISCOUNT'>('ROLE');
  const [pendingBulkRole, setPendingBulkRole] = useState<UserRole>('user');
  const [pendingBulkTier, setPendingBulkTier] = useState<MembershipTier>('standard');
  const [pendingBulkDiscount, setPendingBulkDiscount] = useState<boolean>(false);

  // Password Reset UI State
  const [passwordResetUser, setPasswordResetUser] = useState<UserWithStats | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
      if (profileError) throw profileError;

      const { data: tripsData } = await supabase.from('trips').select('driver_id, created_at').order('created_at', { ascending: false });
      const { data: bookingsData } = await supabase.from('bookings').select('passenger_id, created_at').order('created_at', { ascending: false });

      const userStats = (profiles || []).map(p => {
        const userTrips = tripsData?.filter(t => t.driver_id === p.id) || [];
        const userBookings = bookingsData?.filter(b => b.passenger_id === p.id) || [];
        
        const lastTripAt = userTrips[0]?.created_at;
        const lastBookingAt = userBookings[0]?.created_at;
        
        let lastActivity = undefined;
        if (lastTripAt && lastBookingAt) {
          lastActivity = new Date(lastTripAt) > new Date(lastBookingAt) ? lastTripAt : lastBookingAt;
        } else {
          lastActivity = lastTripAt || lastBookingAt;
        }

        return {
          ...p,
          trips_count: userTrips.length,
          bookings_count: userBookings.length,
          last_activity_at: lastActivity,
          created_at: p.created_at,
          membership_tier: p.membership_tier || 'standard',
          is_discount_provider: p.is_discount_provider || false
        };
      });
      setUsers(userStats);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const filteredUsers = useMemo(() => {
    const searchNormalized = removeAccents(searchTerm);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1); 
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7); 

    let filtered = users.filter(u => {
      const nameMatch = removeAccents(u.full_name || '').includes(searchNormalized);
      const phoneMatch = u.phone?.includes(searchTerm);
      const emailMatch = u.email && removeAccents(u.email).includes(searchNormalized);
      const matchesSearch = nameMatch || phoneMatch || emailMatch;
      
      const matchesRole = roleFilter.includes('ALL') || roleFilter.includes(u.role);
      const matchesTier = tierFilter.includes('ALL') || tierFilter.includes(u.membership_tier || 'standard');

      let matchesActivityTime = activityTimeFilter.includes('ALL');
      if (!matchesActivityTime && u.last_activity_at) {
        const lastActivityDate = new Date(u.last_activity_at);
        if (activityTimeFilter.includes('TODAY') && lastActivityDate >= today) matchesActivityTime = true;
        if (activityTimeFilter.includes('YESTERDAY') && (lastActivityDate >= yesterday && lastActivityDate < today)) matchesActivityTime = true;
        if (activityTimeFilter.includes('WEEK') && lastActivityDate >= weekAgo) matchesActivityTime = true;
      } else if (!matchesActivityTime && !u.last_activity_at) { 
          matchesActivityTime = false;
      }
      
      return matchesSearch && matchesRole && matchesTier && matchesActivityTime;
    });

    filtered.sort((a: any, b: any) => {
      if (sortOrder === 'NEWEST') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortOrder === 'OLDEST') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (sortOrder === 'NAME_ASC') return (a.full_name || '').localeCompare(b.full_name || '');
      if (sortOrder === 'NAME_DESC') return (b.full_name || '').localeCompare(a.full_name || '');
      if (sortOrder === 'JOIN_DATE_ASC') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      }
      if (sortOrder === 'LAST_ACTIVITY_DESC') {
        const dateA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const dateB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return dateB - dateA;
      }
      if (sortOrder === 'TRIPS_COUNT_DESC') return b.trips_count - a.trips_count;
      if (sortOrder === 'BOOKINGS_COUNT_DESC') return b.bookings_count - a.bookings_count;
      return 0;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'created_at' || sortConfig.key === 'last_activity_at') {
            valA = valA ? new Date(valA).getTime() : 0;
            valB = valB ? new Date(valB).getTime() : 0;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [users, searchTerm, roleFilter, tierFilter, activityTimeFilter, sortOrder, sortConfig]);

  // --- SELECTION LOGIC ---
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleBulkExecute = async () => {
    setIsBulkProcessing(true);
    try {
        let updateData = {};
        let successMessage = "";

        if (bulkActionType === 'ROLE') {
            updateData = { role: pendingBulkRole };
            successMessage = `Đã cập nhật quyền cho ${selectedIds.length} người dùng.`;
        } else if (bulkActionType === 'TIER') {
            updateData = { membership_tier: pendingBulkTier };
            successMessage = `Đã cập nhật cấp độ cho ${selectedIds.length} người dùng.`;
        } else if (bulkActionType === 'DISCOUNT') {
            updateData = { is_discount_provider: pendingBulkDiscount };
            successMessage = `Đã ${pendingBulkDiscount ? 'bật' : 'tắt'} ưu đãi cho ${selectedIds.length} người dùng.`;
        }

        const { error } = await supabase.from('profiles').update(updateData).in('id', selectedIds);
        if (error) throw error;
        
        // Update local state
        setUsers(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, ...updateData } : u));
        setSelectedIds([]);
        showAlert({ title: 'Thành công', message: successMessage, variant: 'success' });
    } catch (err: any) {
        showAlert({ title: 'Lỗi', message: err.message, variant: 'danger' });
    } finally {
        setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    showAlert({
        title: 'Xoá hàng loạt?',
        message: `Bạn có chắc muốn xoá ${selectedIds.length} người dùng đang chọn? Hành động này không thể hoàn tác.`,
        variant: 'danger',
        confirmText: 'Xoá ngay',
        cancelText: 'Hủy',
        onConfirm: async () => {
            setIsBulkProcessing(true);
            try {
                const { error } = await supabase.from('profiles').delete().in('id', selectedIds);
                if (error) throw error;
                setUsers(prev => prev.filter(u => !selectedIds.includes(u.id)));
                setSelectedIds([]);
                showAlert({ title: 'Thành công', message: 'Đã xoá người dùng thành công.', variant: 'success' });
            } catch (err: any) {
                showAlert({ title: 'Lỗi', message: 'Không thể xoá người dùng (có thể do ràng buộc dữ liệu).', variant: 'danger' });
            } finally {
                setIsBulkProcessing(false);
            }
        }
    });
  };

  const handleEditSelected = () => {
    if (selectedIds.length !== 1) return;
    const userToEdit = users.find(u => u.id === selectedIds[0]);
    if (userToEdit) {
      handleStartEdit(userToEdit);
      setSelectedIds([]); // Clear selection after entering edit mode
    }
  };

  const handleStartEdit = (user: UserWithStats) => {
    setEditingId(user.id);
    setEditData({ full_name: user.full_name, phone: user.phone || '' });
  };

  const handleSaveInfo = async (userId: string) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ 
        full_name: editData.full_name, 
        phone: editData.phone 
      }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...editData } : u));
      setEditingId(null);
    } catch (err: any) { alert(err.message); } finally { setUpdatingId(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: { label: string, sortKey: string, width?: string, textAlign?: string }) => (
    <th style={{ width }} className={`px-4 py-4 text-[11px] font-bold text-slate-400 cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  const roleOptions = [
    {label:'Tất cả quyền hạn', value:'ALL', icon: ShieldAlert, style: 'bg-slate-100 text-slate-600 border-slate-200'}, 
    {label:'Quản trị', value:'admin', icon: Shield, style: 'bg-rose-50 text-rose-600 border-rose-100'}, 
    {label:'Điều phối', value:'manager', icon: Settings, style: 'bg-indigo-50 text-indigo-600 border-indigo-100'}, 
    {label:'Tài xế', value:'driver', icon: Car, style: 'bg-emerald-50 text-emerald-600 border-emerald-100'}, 
    {label:'Thành viên', value:'user', icon: User, style: 'bg-sky-50 text-sky-600 border-sky-100'} 
  ];

  const tierOptions = [
    {label: 'Tất cả cấp độ', value: 'ALL', icon: Layers},
    {label: 'Thường', value: 'standard', icon: User},
    {label: 'Bạc', value: 'silver', icon: Award},
    {label: 'Vàng', value: 'gold', icon: Trophy},
    {label: 'Kim Cương', value: 'diamond', icon: Gem},
    {label: 'Gia Đình', value: 'family', icon: Heart},
  ];

  return (
    <div className="space-y-4 animate-slide-up relative">
      <div className="bg-gradient-to-br from-emerald-50/80 to-indigo-50/60 p-6 rounded-[32px] border border-emerald-100 shadow-sm space-y-5 backdrop-blur-sm relative z-30">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-3 w-full md:flex-1">
               <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
                  <input 
                    type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 h-[42px] bg-white/80 border border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50/50 rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm" 
                  />
               </div>
               
               <div className="flex-1 md:w-48 md:flex-none shrink-0">
                  <UnifiedDropdown 
                    label="Sắp xếp" icon={ArrowUpDown} value={sortOrder} width="w-full" showCheckbox={false}
                    options={[
                      { label: 'Mới nhất', value: 'NEWEST' },
                      { label: 'Cũ nhất', value: 'OLDEST' },
                      { label: 'Tên (A-Z)', value: 'NAME_ASC' },
                      { label: 'Tên (Z-A)', value: 'NAME_DESC' },
                      { label: 'Tham gia sớm', value: 'JOIN_DATE_ASC' },
                      { label: 'Hoạt động gần', value: 'LAST_ACTIVITY_DESC' }
                    ]}
                    onChange={setSortOrder}
                  />
               </div>
            </div>
            
            <div className="hidden md:flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm items-center shrink-0 h-[42px]">
              <button onClick={() => setViewMode('list')} className={`p-2 h-full aspect-square flex items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutList size={18} />
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-2 h-full aspect-square flex items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-3 w-full">
            <UnifiedDropdown label="Quyền hạn" icon={Shield} value={roleFilter} onChange={setRoleFilter} width="w-full lg:w-48" showCheckbox={true}
              isRole={true} roleConfig={roleOptions} options={roleOptions} />
            <UnifiedDropdown label="Cấp độ" icon={Medal} value={tierFilter} onChange={setTierFilter} width="w-full lg:w-48" showCheckbox={true}
              options={tierOptions} />
            <UnifiedDropdown label="Hoạt động" icon={CalendarDays} value={activityTimeFilter} onChange={setActivityTimeFilter} width="w-full lg:w-48" showCheckbox={true}
              options={[{label:'Tất cả thời gian', value:'ALL'}, {label:'Hôm nay', value:'TODAY'}, {label:'Hôm qua', value:'YESTERDAY'}, {label:'7 ngày qua', value:'WEEK'}]} />
          </div>
        </div>
      </div>
      
      {/* Password Reset Modal */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl p-6 relative">
                <button onClick={() => setPasswordResetUser(null)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400" /></button>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-amber-50 rounded-full text-amber-600 border border-amber-100"><Key size={24} /></div>
                    <h3 className="text-lg font-bold text-slate-800">Cấp lại mật khẩu</h3>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                    <p className="text-xs text-slate-500 mb-1">Người dùng:</p>
                    <p className="font-bold text-slate-800">{passwordResetUser.full_name}</p>
                    <p className="text-xs text-slate-400">{passwordResetUser.phone ? passwordResetUser.phone.replace(/^\+?84/, '0') : 'Không có SĐT'}</p>
                </div>

                <div className="space-y-4">
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800">
                        <p className="font-bold mb-1">⚠️ Lưu ý dành cho Admin</p>
                        <p>Vì lý do bảo mật, bạn không thể đổi mật khẩu người khác trực tiếp tại đây. Vui lòng copy ID bên dưới và thực hiện trong trang quản trị Supabase.</p>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 block">User ID (UUID)</label>
                        <div className="relative flex items-center bg-slate-100 border border-slate-200 rounded-lg group">
                            <span className="flex-1 px-3 py-2 text-xs font-mono text-slate-600 truncate">{passwordResetUser.id}</span>
                            <CopyableCode code={passwordResetUser.id} label="" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors mr-1" />
                        </div>
                    </div>

                    <a href={`https://supabase.com/dashboard/project/_/auth/users`} target="_blank" rel="noreferrer" className="w-full py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
                        Mở trang quản trị Auth <ArrowUpDown size={14} className="rotate-90"/>
                    </a>
                </div>
            </div>
        </div>
      )}

      {/* Dynamic Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-6 fade-in duration-300 w-[95%] md:w-auto">
            <div className="bg-white/95 backdrop-blur-md text-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200/80 px-2.5 py-2.5 flex items-center gap-2">
                <div className="flex items-center gap-3 pr-3 border-r border-slate-200 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-md">
                        {selectedIds.length}
                    </div>
                    <span className="text-xs font-bold text-slate-600 hidden md:inline">Đã chọn</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="w-10 md:w-auto shrink-0">
                        <UnifiedDropdown 
                            label="Thao tác" 
                            icon={Sliders} 
                            value={bulkActionType}
                            width="w-full md:w-32"
                            mobileIconOnly={true}
                            showCheckbox={false}
                            direction="up"
                            options={[
                                { label: 'Đổi quyền', value: 'ROLE' },
                                { label: 'Đổi cấp độ', value: 'TIER' },
                                { label: 'Cài đặt ưu đãi', value: 'DISCOUNT' },
                            ]}
                            onChange={(val: any) => setBulkActionType(val)}
                        />
                    </div>

                    <div className="w-10 md:w-44 shrink-0 relative h-full">
                        {bulkActionType === 'ROLE' && (
                            <RoleSelector value={pendingBulkRole} onChange={setPendingBulkRole} compact={true} disabled={isBulkProcessing} direction="up" />
                        )}
                        {bulkActionType === 'TIER' && (
                            <TierSelector value={pendingBulkTier} onChange={setPendingBulkTier} compact={true} disabled={isBulkProcessing} direction="up" />
                        )}
                        {bulkActionType === 'DISCOUNT' && (
                            <ToggleSelector value={pendingBulkDiscount} onChange={setPendingBulkDiscount} label="Ưu đãi" direction="up" />
                        )}
                    </div>
                    
                    <button 
                        onClick={handleBulkExecute}
                        disabled={isBulkProcessing}
                        className="p-2.5 md:px-4 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                       {isBulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} <span className="hidden md:inline">Thực hiện</span>
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    <button 
                        onClick={handleEditSelected}
                        disabled={selectedIds.length !== 1 || isBulkProcessing}
                        className={`p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                            selectedIds.length === 1 && !isBulkProcessing
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-700' 
                            : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                        }`}
                        title="Sửa thông tin cơ bản"
                    >
                       <Edit3 size={14} /> <span className="hidden md:inline">Sửa</span>
                    </button>
                    
                    <button 
                        onClick={handleBulkDelete}
                        disabled={isBulkProcessing}
                        className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 hover:text-rose-700 transition-all text-xs font-bold flex items-center gap-1.5 shrink-0"
                        title="Xoá người dùng"
                    >
                       {isBulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} <span className="hidden md:inline">Xoá</span>
                    </button>
                    
                    <button 
                        onClick={() => setSelectedIds([])}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-1"
                        title="Hủy chọn"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Mobile List View (Cards) */}
      <div className="md:hidden space-y-3 pb-24">
        {filteredUsers.length > 0 ? filteredUsers.map(user => {
            const isSelected = selectedIds.includes(user.id);
            const userCode = `C${user.id.substring(0,5).toUpperCase()}`;
            const roleStyle = getRoleStyle(user.role);
            const tierConfig = getTierConfig(user.membership_tier);
            const TierIcon = tierConfig.icon;
            const AvatarIcon = roleStyle.icon;
            
            return (
                <div key={user.id} className={`p-4 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`} onClick={() => toggleSelectUser(user.id)}>
                    <div className="flex items-center gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                            <CircleCheckbox checked={isSelected} onChange={() => toggleSelectUser(user.id)} />
                        </div>
                        
                        <div className="relative shrink-0">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-100 shadow-sm transition-all ${roleStyle.style}`}>
                                <AvatarIcon size={18} />
                            </div>
                            <div className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm border border-white ${tierConfig.bg} ${tierConfig.color}`}>
                                <TierIcon size={10} />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{user.full_name}</h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="text-[10px] font-bold text-slate-400">{userCode}</div>
                                        {user.phone && (
                                            <div className="flex items-center gap-1.5">
                                                <a href={`tel:${user.phone}`} onClick={(e) => e.stopPropagation()} className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0">
                                                    <Phone size={8} />
                                                </a>
                                                <CopyableCode code={user.phone || ''} className="text-[9px] font-bold text-indigo-600 truncate" label={user.phone.replace(/^\+?84/, '0') || 'N/A'} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className={`px-2 py-0.5 rounded text-[9px] font-bold border ${roleStyle.style} bg-opacity-50 border-opacity-50 flex items-center gap-1`} title={roleStyle.desc}>
                                        <AvatarIcon size={8} />
                                        {roleStyle.label}
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-[9px] font-bold border ${tierConfig.bg} ${tierConfig.color} ${tierConfig.border} flex items-center gap-1`} title={tierConfig.desc}>
                                        <TierIcon size={8} /> {tierConfig.label}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }) : (
            <div className="px-6 py-20 text-center italic text-slate-500 text-[11px] font-bold">Không tìm thấy người dùng nào</div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className={`hidden md:${viewMode === 'list' ? 'block' : 'hidden'} bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-visible min-h-[500px]`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-4 w-[50px] text-center">
                    <CircleCheckbox 
                        checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.includes(u.id))}
                        onChange={toggleSelectAll}
                    />
                </th>
                <SortHeader label="Thành viên & Mã" sortKey="full_name" width="18%" />
                <SortHeader label="Quyền hạn" sortKey="role" width="10%" textAlign="text-center" />
                <SortHeader label="Cấp độ" sortKey="membership_tier" width="10%" textAlign="text-center" />
                <SortHeader label="Ưu đãi" sortKey="is_discount_provider" width="8%" textAlign="text-center" />
                <SortHeader label="Số điện thoại" sortKey="phone" width="10%" />
                <SortHeader label="Email" sortKey="email" width="14%" />
                <SortHeader label="Chuyến xe" sortKey="trips_count" width="7%" textAlign="text-center" />
                <SortHeader label="Yêu cầu" sortKey="bookings_count" width="7%" textAlign="text-center" />
                <SortHeader label="Ngày tham gia" sortKey="created_at" width="9%" textAlign="text-center" />
                <SortHeader label="Hoạt động" sortKey="last_activity_at" width="9%" textAlign="text-center"/>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 text-right pr-8">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length > 0 ? filteredUsers.map(user => {
                const userCode = `C${user.id.substring(0,5).toUpperCase()}`;
                const isEditing = editingId === user.id;
                const roleStyle = getRoleStyle(user.role);
                const AvatarIcon = roleStyle.icon;
                const tripsColor = getCountLevelStyle(user.trips_count);
                const bookingsColor = getCountLevelStyle(user.bookings_count);
                const displayPhone = user.phone ? user.phone.replace(/^\+?84/, '0') : '';
                const isSelected = selectedIds.includes(user.id);
                const tierConfig = getTierConfig(user.membership_tier);
                const TierIcon = tierConfig.icon;

                return (
                  <tr key={user.id} className={`transition-colors group/row ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/30'} ${isEditing ? 'bg-indigo-50/20' : ''}`} onClick={() => !isEditing && toggleSelectUser(user.id)}>
                    <td className="px-4 py-4 text-center">
                        <CircleCheckbox 
                            checked={isSelected}
                            onChange={() => toggleSelectUser(user.id)}
                        />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-100 shadow-sm transition-all ${roleStyle.style}`}>
                             <AvatarIcon size={16} />
                          </div>
                          {/* Avatar Badge replaced by Tier Icon */}
                          <div className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm border border-white ${tierConfig.bg} ${tierConfig.color}`}>
                            <TierIcon size={10} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <input 
                              type="text" value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 text-[12px] font-bold text-slate-800 border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                            />
                          ) : (
                            <p className="text-[12px] font-bold text-slate-800 truncate mb-1">{user.full_name}</p>
                          )}
                          <div className="inline-flex items-center bg-[#7B68EE10] text-[#7B68EE] px-2 py-0.5 rounded-md border border-[#7B68EE30] shadow-sm">
                            <CopyableCode code={userCode} className="text-[9px] font-black" label={userCode} />
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Role Column with Tooltip */}
                    <td className="px-4 py-4 text-center">
                        <div 
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all shadow-sm ${roleStyle.style}`}
                            title={roleStyle.desc} 
                        >
                            <AvatarIcon size={12} />
                            {roleStyle.label}
                        </div>
                    </td>
                    {/* Tier Column with Tooltip */}
                    <td className="px-4 py-4 text-center">
                        <div 
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all shadow-sm ${tierConfig.bg} ${tierConfig.border} ${tierConfig.color.replace('text-','text-slate-800 ')}`}
                            title={tierConfig.desc}
                        >
                            <TierIcon size={12} className={tierConfig.color} />
                            {tierConfig.label}
                        </div>
                    </td>
                    {/* Discount Column */}
                    <td className="px-4 py-4 text-center">
                        {user.role === 'driver' ? (
                            user.is_discount_provider ? (
                                <div className="text-amber-500" title="Đang bật ưu đãi"><Handshake size={18} /></div>
                            ) : (
                                <div className="text-slate-200" title="Tắt ưu đãi"><X size={16} /></div>
                            )
                        ) : (
                            <span className="text-slate-200">-</span>
                        )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
                            <Phone size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="tel" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})}
                              className="w-full pl-6 pr-2 py-1 text-[12px] font-bold text-slate-800 border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                            />
                          </div>
                        ) : (
                          <>
                            {user.phone && (
                              <a href={`tel:${user.phone}`} onClick={(e) => e.stopPropagation()} className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0">
                                 <Phone size={10} />
                              </a>
                            )}
                            <CopyableCode code={user.phone || ''} className="text-[11px] font-bold text-indigo-600 truncate" label={displayPhone || 'N/A'} />
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                            {user.email && <Mail size={10} className="text-slate-400 shrink-0" />}
                            <CopyableCode code={user.email || ''} className="text-[11px] font-bold text-slate-600 truncate" label={user.email || 'N/A'} />
                        </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-lg text-[10px] font-black border shadow-sm ${tripsColor}`}>
                        {user.trips_count}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-lg text-[10px] font-black border shadow-sm ${bookingsColor}`}>
                        {user.bookings_count}
                      </span>
                    </td>
                    {/* Created At Column */}
                    <td className="px-4 py-4 text-center">
                        <span className="text-[10px] font-bold text-slate-500">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '-'}
                        </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                        {user.last_activity_at ? (
                            <div className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-600 px-2 py-1 rounded-lg border border-sky-100 shadow-sm">
                            <Clock size={10} />
                            <span className="text-[10px] font-bold whitespace-nowrap">{new Date(user.last_activity_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                        ) : (
                            <span className="text-[10px] font-bold text-slate-400 italic">Chưa có</span>
                        )}
                    </td>
                    <td className="px-4 py-4 text-right pr-8">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveInfo(user.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100"><Check size={14} /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg border border-slate-200"><X size={14} /></button>
                          </>
                        ) : (
                          <button onClick={() => setPasswordResetUser(user)} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 hover:bg-amber-600 hover:text-white transition-all" title="Cấp lại mật khẩu"><Key size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={11} className="px-6 py-20 text-center italic text-slate-500 text-[11px] font-bold">Không tìm thấy người dùng nào</td></tr>
              )}
            </tbody>
          </table>
          <div className="h-40"></div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
