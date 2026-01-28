
import React, { useState, useEffect } from 'react';
import { X, Settings, Calendar, Eye, EyeOff, Save, RotateCcw, History } from 'lucide-react';

export interface AppSettings {
  showCancelled: boolean;
  showPastTrips: boolean;
  historyDays: number;
}

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings({ showCancelled: false, showPastTrips: false, historyDays: 30 });
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-visible border border-white/20 animate-in zoom-in-95 duration-300 relative">
        
        {/* Updated Close Button (Floating Style) */}
        <button 
          onClick={onClose} 
          className="absolute -top-4 -right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[210] border-2 border-white"
        >
          <X size={20} strokeWidth={3} />
        </button>

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center bg-slate-50/50 rounded-t-[28px]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Cài đặt hiển thị</h3>
              <p className="text-xs text-slate-500 font-medium">Tùy chỉnh dữ liệu bạn muốn xem</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Option 1: Show/Hide Past Trips */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <History size={16} className="text-blue-500" />
              Lịch sử chuyến đi
            </label>
            <div 
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${localSettings.showPastTrips ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
              onClick={() => setLocalSettings(prev => ({ ...prev, showPastTrips: !prev.showPastTrips }))}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${localSettings.showPastTrips ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                  {localSettings.showPastTrips ? <Eye size={18} /> : <EyeOff size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Hiển thị chuyến đã qua</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Bao gồm các chuyến có giờ khởi hành trong quá khứ</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors relative ${localSettings.showPastTrips ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${localSettings.showPastTrips ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>

          {/* Option 2: Show/Hide Cancelled */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Eye size={16} className="text-emerald-500" />
              Trạng thái chuyến xe
            </label>
            <div 
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${localSettings.showCancelled ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
              onClick={() => setLocalSettings(prev => ({ ...prev, showCancelled: !prev.showCancelled }))}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${localSettings.showCancelled ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                  {localSettings.showCancelled ? <Eye size={18} /> : <EyeOff size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Hiển thị chuyến đã huỷ</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Bao gồm các chuyến xe và đơn hàng bị huỷ</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors relative ${localSettings.showCancelled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${localSettings.showCancelled ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>

          {/* Option 3: History Days */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Calendar size={16} className="text-amber-500" />
              Phạm vi dữ liệu
            </label>
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">Giới hạn thời gian</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tải dữ liệu trong khoảng này (Mặc định: 30 ngày)</p>
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                  {localSettings.historyDays} ngày
                </div>
              </div>
              <input 
                type="range" 
                min="7" 
                max="180" 
                step="1" 
                value={localSettings.historyDays} 
                onChange={(e) => setLocalSettings(prev => ({ ...prev, historyDays: parseInt(e.target.value) }))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
                <span>7 ngày</span>
                <span>3 tháng</span>
                <span>6 tháng</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-[28px]">
          <button 
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 flex items-center gap-2 transition-colors"
          >
            <RotateCcw size={14} /> Mặc định
          </button>
          <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
            >
                Hủy
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
            >
                <Save size={16} /> Lưu cài đặt
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GlobalSettingsModal;
