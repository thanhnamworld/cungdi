
import React, { useState, useEffect, useRef } from 'react';
import { X, Car, Plus, Loader2, Edit3, Trash2, Save, Sparkles, UploadCloud, Crop, AlertTriangle, Database, Copy, CheckCircle2 } from 'lucide-react';
import { Profile } from '../types';
import { supabase } from '../lib/supabase';
import { getVehicleConfig, UnifiedDropdown } from './SearchTrips';
import CopyableCode from './CopyableCode';
import imageCompression from 'browser-image-compression';

interface Vehicle {
  id: string;
  user_id: string;
  vehicle_type: string;
  license_plate: string;
  image_url?: string;
}

interface VehicleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onVehiclesUpdated: () => void;
  showAlert: (config: any) => void;
}

const vehicleOptions = [
  { label: 'Sedan 4 chỗ', value: 'Sedan 4 chỗ' },
  { label: 'SUV 7 chỗ', value: 'SUV 7 chỗ' },
  { label: 'Limo Green 7 chỗ', value: 'Limo Green 7 chỗ' },
  { label: 'Limousine 9 chỗ', value: 'Limousine 9 chỗ' },
];

const FIX_SQL = `
-- Tạo bucket 'vehicle-images' (Public)
insert into storage.buckets (id, name, public) 
values ('vehicle-images', 'vehicle-images', true)
on conflict (id) do nothing;

-- Thiết lập Policy cho phép truy cập công khai
create policy "Public Access" on storage.objects for select using ( bucket_id = 'vehicle-images' );
create policy "Public Insert" on storage.objects for insert with check ( bucket_id = 'vehicle-images' );
create policy "Public Update" on storage.objects for update using ( bucket_id = 'vehicle-images' );
create policy "Public Delete" on storage.objects for delete using ( bucket_id = 'vehicle-images' );
`;

// Style chuẩn cho ô nhập liệu
const INPUT_STYLE = "w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-400";

const VehicleManagementModal: React.FC<VehicleManagementModalProps> = ({ isOpen, onClose, profile, onVehiclesUpdated, showAlert }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBucketFix, setShowBucketFix] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [vehicleType, setVehicleType] = useState('Sedan 4 chỗ');
  const [licensePlate, setLicensePlate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const resetForm = () => {
    setVehicleType('Sedan 4 chỗ');
    setLicensePlate('');
    setImageUrl('');
    setIsAdding(false);
    setEditingVehicle(null);
    setError(null);
    setShowBucketFix(false);
    setUploading(false);
  };

  const fetchVehicles = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVehicles();
    } else {
      resetForm();
    }
  }, [isOpen]);

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleType(vehicle.vehicle_type);
    setLicensePlate(vehicle.license_plate);
    setImageUrl(vehicle.image_url || '');
    setIsAdding(false);
  };

  // Bước 1: Cắt ảnh 1:1 bằng Canvas
  // Bước 2: Nén ảnh bằng browser-image-compression
  const processAndCompressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          // 1. Cắt ảnh hình vuông (1:1) từ tâm
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas error')); return; }

          // Kích thước cạnh ngắn nhất để tạo hình vuông
          const size = Math.min(img.width, img.height);
          
          // Tính toán tọa độ để cắt từ tâm
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;

          // Giới hạn kích thước canvas tối đa 1024x1024 để tối ưu
          const MAX_DIMENSION = 1024;
          canvas.width = MAX_DIMENSION;
          canvas.height = MAX_DIMENSION;

          // Vẽ ảnh đã cắt vào canvas
          ctx.drawImage(img, startX, startY, size, size, 0, 0, MAX_DIMENSION, MAX_DIMENSION);

          // Chuyển canvas thành File để đưa vào thư viện nén
          canvas.toBlob(async (blob) => {
            if (!blob) { reject(new Error('Lỗi xử lý ảnh')); return; }
            
            const croppedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });

            // 2. Nén ảnh bằng thư viện chuyên dụng
            const options = {
              maxSizeMB: 0.2, // Mục tiêu dưới 0.2MB (200KB)
              maxWidthOrHeight: 1024,
              useWebWorker: true,
              fileType: 'image/jpeg'
            };

            try {
              const compressedFile = await imageCompression(croppedFile, options);
              console.log(`Đã nén ảnh: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
              resolve(compressedFile);
            } catch (error) {
              console.error("Lỗi nén ảnh:", error);
              // Nếu nén lỗi, trả về ảnh đã cắt (fallback)
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);
      setShowBucketFix(false);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Vui lòng chọn một ảnh để tải lên.');
      }

      const originalFile = event.target.files[0];
      
      // Xử lý: Cắt vuông -> Nén
      const processedFile = await processAndCompressImage(originalFile);

      const fileExt = 'jpg';
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-images') 
        .upload(filePath, processedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('vehicle-images').getPublicUrl(filePath);
      
      setImageUrl(data.publicUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      const errMsg = error.message || '';
      
      if (errMsg.includes('not found') || errMsg.includes('Bucket')) {
        setError('Bucket "vehicle-images" không tồn tại trong Supabase.');
        setShowBucketFix(true);
      } else {
        setError(errMsg || 'Lỗi khi tải ảnh lên.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(FIX_SQL);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !licensePlate) {
      setError("Vui lòng điền đầy đủ thông tin Biển số xe.");
      return;
    }
    
    if (!imageUrl) {
        setError("Vui lòng tải lên hình ảnh xe.");
        return;
    }

    setLoading(true);
    setError(null);
    
    const payload = {
      vehicle_type: vehicleType,
      license_plate: licensePlate.toUpperCase(),
      image_url: imageUrl || null,
    };

    try {
      if (editingVehicle) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editingVehicle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicles').insert({ ...payload, user_id: profile.id });
        if (error) throw error;
      }
      resetForm();
      fetchVehicles();
      onVehiclesUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    showAlert({
        title: "Xoá xe",
        message: "Bạn có chắc muốn xoá xe này?",
        variant: "danger",
        confirmText: "Xoá",
        cancelText: "Hủy",
        onConfirm: async () => {
            setLoading(true);
            try {
                const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
                if (error) throw error;
                fetchVehicles();
                onVehiclesUpdated();
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
    });
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl h-[85vh] animate-in zoom-in-95 duration-300">
        <div ref={modalRef} className="bg-white w-full h-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
            
            <div className="p-8 bg-gradient-to-r from-emerald-50 via-white to-teal-50 shrink-0 border-b border-emerald-100">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white border border-emerald-100 shadow-sm rounded-2xl text-emerald-600"><Car size={24} /></div>
                <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-800">Quản lý đội xe</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Thêm, sửa, xoá thông tin các xe bạn sở hữu.</p>
                </div>
            </div>
            </div>
            
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-2 overflow-y-auto custom-scrollbar p-8 bg-slate-50">
                <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-slate-700">Danh sách xe ({vehicles.length})</h4>
                <button 
                    onClick={handleStartAdd} 
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-200/50"
                >
                    <Plus size={14} /> Thêm xe mới
                </button>
                </div>
                
                {loading && vehicles.length === 0 ? (
                <div className="text-center py-20"><Loader2 className="animate-spin text-slate-300 mx-auto" size={32} /></div>
                ) : vehicles.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
                    <Car size={40} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-400">Chưa có xe nào được lưu.</p>
                </div>
                ) : (
                <div className="space-y-3">
                    {vehicles.map(v => {
                    const config = getVehicleConfig(v.vehicle_type);
                    const VIcon = config.icon;
                    return (
                        <div key={v.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${editingVehicle?.id === v.id ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-200' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                        <div className="flex items-center gap-4">
                            {/* Hình ảnh xe hiển thị 1:1 */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden bg-slate-50 ${config.style}`}>
                            {v.image_url ? (
                                <img src={v.image_url} alt={v.license_plate} className="w-full h-full object-cover" />
                            ) : (
                                <VIcon size={24} />
                            )}
                            </div>
                            <div className="flex flex-col items-start gap-1.5">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${config.style}`}>
                                <VIcon size={12} /> {v.vehicle_type}
                            </div>
                            <div className="inline-flex items-center bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-black tracking-wider">
                                <CopyableCode code={v.license_plate} label={v.license_plate} className="text-[10px]" />
                            </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleStartEdit(v)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors"><Edit3 size={14} /></button>
                            <button onClick={() => handleDelete(v.id)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-rose-100 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                        </div>
                        </div>
                    );
                    })}
                </div>
                )}
            </div>
            
            <div className="p-8 bg-white border-l border-slate-100 flex flex-col overflow-y-auto custom-scrollbar">
                {(isAdding || editingVehicle) ? (
                <form onSubmit={handleSubmit} className="space-y-5 flex flex-col flex-1">
                    <h4 className="font-bold text-slate-800 text-lg">{editingVehicle ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h4>
                    
                    {error && (
                    <div className="text-xs text-rose-500 bg-rose-50 p-3 rounded-xl font-bold border border-rose-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0" /> {error}
                        </div>
                        {showBucketFix && (
                        <div className="mt-1 pt-2 border-t border-rose-100/50">
                            <p className="mb-2 text-rose-600">Sao chép SQL bên dưới và chạy trong Supabase SQL Editor để sửa lỗi:</p>
                            <div className="relative group">
                            <textarea 
                                readOnly 
                                value={FIX_SQL}
                                className="w-full h-24 p-2 bg-rose-100/50 text-[10px] font-mono rounded-lg border border-rose-200 text-rose-800 outline-none resize-none"
                            />
                            <button 
                                type="button" 
                                onClick={handleCopySQL}
                                className="absolute top-2 right-2 p-1.5 bg-white rounded-md shadow-sm border border-rose-100 text-rose-500 hover:text-emerald-600 transition-colors"
                            >
                                {copySuccess ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                            </button>
                            </div>
                            <a 
                            href="https://supabase.com/dashboard/project/_/sql" 
                            target="_blank" 
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[10px] bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 transition-colors"
                            >
                            <Database size={10} /> Mở Supabase SQL Editor
                            </a>
                        </div>
                        )}
                    </div>
                    )}
                    
                    {/* Unified Dropdown Integration with Badge */}
                    <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">Loại xe</label>
                    <UnifiedDropdown
                        label="Chọn loại xe"
                        icon={Car}
                        value={vehicleType}
                        width="w-full"
                        showCheckbox={false}
                        isVehicle={true}
                        options={vehicleOptions}
                        onChange={(val: string) => setVehicleType(val)}
                    />
                    </div>
                    
                    <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">Biển kiểm soát</label>
                    <input 
                        type="text" 
                        value={licensePlate} 
                        onChange={e => setLicensePlate(e.target.value.toUpperCase())} 
                        placeholder="VD: 29A-123.45" 
                        required 
                        className={INPUT_STYLE}
                    />
                    </div>

                    {/* Image Upload Section - Vuông 1:1 */}
                    <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">Hình ảnh xe (Tự động cắt vuông & Nén)</label>
                    <div className="w-full flex justify-center">
                        {imageUrl ? (
                        <div className="relative group rounded-2xl overflow-hidden border border-slate-200 w-48 h-48 bg-slate-50 shadow-sm">
                            <img src={imageUrl} alt="Vehicle preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                                type="button" 
                                onClick={() => setImageUrl('')}
                                className="px-4 py-2 bg-white text-rose-600 rounded-xl font-bold text-xs shadow-lg hover:bg-rose-50 transition-colors"
                            >
                                Xoá ảnh
                            </button>
                            </div>
                        </div>
                        ) : (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-48 h-48 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer group bg-slate-50/50"
                        >
                            {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="animate-spin text-emerald-500" size={24} />
                                <span className="text-[10px] font-bold text-emerald-600 text-center px-4">Đang cắt & nén ảnh...</span>
                            </div>
                            ) : (
                            <>
                                <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 group-hover:scale-110 transition-transform relative">
                                <UploadCloud size={20} />
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
                                    <Crop size={8} />
                                </div>
                                </div>
                                <div className="text-center px-4">
                                <span className="text-[10px] font-bold block">Tải ảnh lên</span>
                                <span className="text-[9px] font-medium opacity-70">Tự động cắt 1:1</span>
                                </div>
                            </>
                            )}
                        </div>
                        )}
                        <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        />
                    </div>
                    </div>

                    <div className="mt-auto pt-6 space-y-3">
                    <button type="submit" disabled={loading || uploading} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-200">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {editingVehicle ? 'Lưu thay đổi' : 'Thêm vào đội xe'}
                    </button>
                    <button type="button" onClick={resetForm} className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">Hủy bỏ</button>
                    </div>
                </form>
                ) : (
                <div className="text-center my-auto flex flex-col items-center p-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <Sparkles size={32} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">Chọn một xe để sửa</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">Hoặc thêm xe mới để bắt đầu nhận chuyến.</p>
                </div>
                )}
            </div>
            </div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 md:-top-4 md:-right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[210] border-2 border-white">
          <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default VehicleManagementModal;
