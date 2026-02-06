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
    <div className="fixed inset-0 z-[250] flex items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-[calc(100%-24px)] md:w-full max-w-4xl h-[90vh] md:h-[85vh] mx-3 md:mx-0 animate-in zoom-in-95 duration-300">
        <div ref={modalRef} className="bg-white w-full h-full rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
            
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
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-slate-100 overflow-hidden border border-slate-200 shrink-0`}>
                                {v.image_url ? (
                                    <img src={v.image_url} alt="Xe" className="w-full h-full object-cover" />
                                ) : (
                                    <Car size={24} className="text-slate-300" />
                                )}
                            </div>
                            <div>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-bold mb-1 ${config.style}`}>
                                    <VIcon size={10} /> {v.vehicle_type}
                                </div>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-wider">{v.license_plate}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleStartEdit(v)}
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                                <Edit3 size={16} />
                            </button>
                            <button 
                                onClick={() => handleDelete(v.id)}
                                className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        </div>
                    );
                    })}
                </div>
                )}
            </div>

            {/* Right Side: Form */}
            <div className="border-l border-slate-100 bg-white p-8 flex flex-col overflow-y-auto custom-scrollbar">
                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    {isAdding ? <Plus size={18} className="text-emerald-500" /> : editingVehicle ? <Edit3 size={18} className="text-indigo-500" /> : <Sparkles size={18} className="text-slate-400" />}
                    {isAdding ? 'Thêm xe mới' : editingVehicle ? 'Cập nhật xe' : 'Chi tiết xe'}
                </h4>

                {!isAdding && !editingVehicle ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                        <Car size={64} strokeWidth={1} />
                        <p className="text-xs text-center px-10">Chọn một xe để chỉnh sửa hoặc nhấn "Thêm xe mới".</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold flex items-start gap-2">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <div>{error}</div>
                            </div>
                        )}

                        {showBucketFix && (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
                                <p className="text-[10px] text-amber-800 font-bold flex items-center gap-1.5"><Database size={12}/> Cần cấu hình Storage</p>
                                <div className="relative">
                                    <textarea readOnly value={FIX_SQL} className="w-full h-20 text-[9px] font-mono bg-white border border-amber-200 rounded p-2 outline-none resize-none" />
                                    <button type="button" onClick={handleCopySQL} className="absolute top-1 right-1 p-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200">{copySuccess ? <CheckCircle2 size={10}/> : <Copy size={10}/>}</button>
                                </div>
                                <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noreferrer" className="block text-center text-[10px] bg-amber-600 text-white py-1.5 rounded font-bold hover:bg-amber-700">Mở SQL Editor</a>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 ml-1">Loại xe</label>
                            <UnifiedDropdown 
                                label="Chọn loại xe" 
                                icon={Car} 
                                value={vehicleType} 
                                onChange={setVehicleType} 
                                width="w-full" 
                                showCheckbox={false}
                                options={vehicleOptions}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 ml-1">Biển kiểm soát</label>
                            <input 
                                type="text" 
                                value={licensePlate} 
                                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                                placeholder="VD: 30A-123.45"
                                className={INPUT_STYLE}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 ml-1">Hình ảnh xe (Bắt buộc)</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${imageUrl ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50'}`}
                            >
                                {imageUrl ? (
                                    <>
                                        <img src={imageUrl} alt="Vehicle" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                                                <UploadCloud size={14} /> Thay ảnh
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 text-indigo-500 group-hover:scale-110 transition-transform">
                                            {uploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">Nhấn để tải ảnh lên</p>
                                    </>
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

                        <div className="pt-2 flex gap-3">
                            {editingVehicle && (
                                <button 
                                    type="button" 
                                    onClick={() => { resetForm(); setIsAdding(true); }}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                                >
                                    Hủy
                                </button>
                            )}
                            <button 
                                type="submit" 
                                disabled={loading || uploading}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {editingVehicle ? 'Lưu thay đổi' : 'Thêm xe'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            </div>
        </div>
        <button 
          onClick={onClose} 
          className="absolute -top-4 -right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[260] border-2 border-white"
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default VehicleManagementModal;