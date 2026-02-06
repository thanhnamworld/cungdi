import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CustomDatePickerProps {
  selectedDate: string; // Định dạng dd-mm-yy
  onSelect: (date: string) => void;
  onClose: () => void;
  minDate?: Date;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ selectedDate, onSelect, onClose, minDate }) => {
  // Chuyển đổi từ dd-mm-yy sang Date object để hiển thị view
  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-').map(Number);
    let [d, m, y] = parts;
    // Xử lý năm 2 chữ số
    if (y < 100) y += 2000;
    return new Date(y, m - 1, d);
  };

  const [viewDate, setViewDate] = useState(parseDate(selectedDate));
  const selected = selectedDate ? parseDate(selectedDate) : null;

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
  const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelectDay = (day: number) => {
    const d = String(day).padStart(2, '0');
    const m = String(month + 1).padStart(2, '0');
    const y = String(year).slice(-2); // Lấy 2 số cuối của năm
    onSelect(`${d}-${m}-${y}`); // Trả về định dạng dd-mm-yy
    onClose();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (day: number) => {
    return selected?.getDate() === day && selected?.getMonth() === month && selected?.getFullYear() === year;
  };

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = startDayOfMonth(year, month);

  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-9 w-9"></div>);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dayDate = new Date(year, month, d);
    dayDate.setHours(0,0,0,0);
    const isDisabled = minDate ? dayDate < minDate : false;
    
    days.push(
      <button
        key={d}
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && handleSelectDay(d)}
        className={`h-8 w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all relative
          ${isSelected(d) ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : ''}
          ${!isSelected(d) && !isDisabled ? 'hover:bg-emerald-50 text-slate-700' : ''}
          ${isToday(d) && !isSelected(d) ? 'text-emerald-600 ring-1 ring-emerald-200' : ''}
          ${isDisabled ? 'text-slate-300 cursor-not-allowed' : ''}
        `}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl p-4 w-[85vw] max-w-[280px] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
      <div className="flex items-center justify-between mb-4 px-1">
        <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
          <ChevronLeft size={16} className="text-slate-400" />
        </button>
        <div className="text-[11px] font-black text-slate-800 tracking-widest">
          {monthNames[month]} {year}
        </div>
        <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-[9px] font-bold text-slate-300">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>

      <button 
        type="button"
        onClick={() => {
          const today = new Date();
          const d = String(today.getDate()).padStart(2, '0');
          const m = String(today.getMonth() + 1).padStart(2, '0');
          const y = String(today.getFullYear()).slice(-2);
          onSelect(`${d}-${m}-${y}`);
          onClose();
        }}
        className="w-full mt-4 py-2.5 text-[10px] font-bold text-emerald-600 tracking-widest bg-emerald-50/50 hover:bg-emerald-50 rounded-xl transition-all"
      >
        Chọn hôm nay
      </button>
    </div>
  );
};

export default CustomDatePicker;