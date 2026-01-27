
import React from 'react';
import { Clock } from 'lucide-react';

interface CustomTimePickerProps {
  selectedTime: string; // HH:mm format
  onSelect: (time: string) => void;
  onClose: () => void;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({ selectedTime, onSelect, onClose }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const [currentH, currentM] = selectedTime.split(':');

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-2xl p-5 w-[320px] animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="p-1.5 bg-indigo-50 rounded-lg">
          <Clock size={14} className="text-indigo-600" />
        </div>
        <span className="text-[10px] font-black text-slate-400 tracking-widest">
          Chọn giờ khởi hành
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[9px] font-bold text-slate-300 mb-2 ml-1">Giờ</p>
          <div className="grid grid-cols-6 gap-1.5">
            {hours.map(hour => (
              <button
                key={hour}
                type="button"
                onClick={() => onSelect(`${hour}:${currentM}`)}
                className={`h-9 rounded-xl text-xs font-bold transition-all ${
                  currentH === hour 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105' 
                  : 'hover:bg-indigo-50 text-slate-600 bg-slate-50/50'
                }`}
              >
                {hour}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-bold text-slate-300 mb-2 ml-1">Phút</p>
          <div className="grid grid-cols-4 gap-2">
            {minutes.map(min => (
              <button
                key={min}
                type="button"
                onClick={() => {
                  onSelect(`${currentH}:${min}`);
                  onClose();
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  currentM === min 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'bg-indigo-50/30 text-indigo-600 hover:bg-indigo-50 border border-indigo-100/50'
                }`}
              >
                {min}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-center">
        <p className="text-[10px] font-bold text-slate-400 italic">
          Giờ đã chọn: <span className="text-indigo-600 not-italic font-black text-sm ml-1">{selectedTime}</span>
        </p>
      </div>
    </div>
  );
};

export default CustomTimePicker;
