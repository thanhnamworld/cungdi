
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search as SearchIcon, MapPin, Calendar, Clock, User, ChevronRight, Star, LayoutGrid, CalendarDays, ChevronDown, Car, CarFront, Sparkles, Crown, DollarSign, ArrowUpDown, Filter, Check, X, History, Users, ArrowRight, AlertCircle, Timer, Zap, CheckCircle2, Play, Radio, Shield, Settings, Hash, Navigation, ClipboardList, Repeat, Send, Loader2, Map as MapIcon, Plus, Info, Ban, ListChecks, Ticket, Layers, Gem, Handshake, XCircle
} from 'lucide-react';
import { Trip, TripStatus, Booking, Profile } from '../types';
import CopyableCode from './CopyableCode.tsx';
import { getRouteDetails } from '../services/geminiService.ts';

const removeAccents = (str: string) => {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
};

export const getVehicleConfig = (vehicleName: string) => {
  const name = vehicleName.toLowerCase();
  const vehicleModel = name.split(' (')[0]; 
  
  if (vehicleModel.includes('sedan') || vehicleModel.includes('4 chỗ')) {
    return { style: 'bg-blue-50 text-blue-600 border-blue-100', icon: Car };
  }
  if (vehicleModel.includes('suv') || (vehicleModel.includes('7 chỗ') && !vehicleModel.includes('green'))) {
    return { style: 'bg-orange-50 text-orange-600 border-orange-100', icon: Car };
  }
  if (vehicleModel.includes('limousine')) {
    return { style: 'bg-purple-50 text-purple-600 border-purple-100', icon: Car };
  }
  if (vehicleModel.includes('green')) {
    return { style: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: Car };
  }
  return { style: 'bg-slate-50 text-slate-600 border-slate-100', icon: Car };
};

export const getTripStatusDisplay = (trip: Trip) => {
  const status = trip.status;
  if (status === TripStatus.CANCELLED) {
    return { label: 'Huỷ', icon: X, style: 'bg-rose-50 text-rose-500 border-rose-100', priority: 6, value: TripStatus.CANCELLED };
  }
  if (status === TripStatus.COMPLETED) {
    return { label: 'Hoàn thành', icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-600 border-emerald-100', priority: 5, value: TripStatus.COMPLETED };
  }
  if (status === TripStatus.ON_TRIP) {
    return { label: 'Đang chạy', icon: Play, style: 'bg-blue-50 text-blue-600 border-blue-100', priority: 3, value: TripStatus.ON_TRIP };
  }
  if (status === TripStatus.URGENT) {
    return { label: 'Sát giờ', icon: AlertCircle, style: 'bg-rose-50 text-rose-600 border-rose-100', priority: 1, value: TripStatus.URGENT };
  }
  if (status === TripStatus.PREPARING) {
    return { label: 'Chuẩn bị', icon: Timer, style: 'bg-amber-50 text-amber-600 border-amber-100', priority: 0, value: TripStatus.PREPARING };
  }
  if (status === TripStatus.FULL || (trip.available_seats !== undefined && trip.available_seats <= 0)) {
    return { label: 'Đầy chỗ', icon: AlertCircle, style: 'bg-slate-100 text-slate-600 border-slate-200', priority: 4, value: TripStatus.FULL };
  }
  return { label: 'Chờ', icon: Clock, style: 'bg-amber-50 text-amber-500 border-amber-100', priority: 2, value: 'WAITING' };
};

export const statusFilterOptions = [
  { label: 'Tất cả trạng thái', value: 'ALL', icon: ClipboardList, style: 'bg-slate-50 text-slate-500 border-slate-100' },
  { label: 'Chuẩn bị', value: TripStatus.PREPARING, icon: Timer, style: 'bg-amber-50 text-amber-600 border-amber-100' },
  { label: 'Sát giờ', value: TripStatus.URGENT, icon: AlertCircle, style: 'bg-rose-50 text-rose-600 border-rose-100' },
  { label: 'Đang chạy', value: TripStatus.ON_TRIP, icon: Play, style: 'bg-blue-50 text-blue-600 border-blue-100' },
  { label: 'Đầy chỗ', value: TripStatus.FULL, icon: AlertCircle, style: 'bg-slate-100 text-slate-600 border-slate-200' },
  { label: 'Hoàn thành', value: TripStatus.COMPLETED, icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { label: 'Huỷ', value: TripStatus.CANCELLED, icon: X, style: 'bg-rose-50 text-rose-500 border-rose-100' },
];

export const UnifiedDropdown = ({ label, icon: Icon, options, value, onChange, placeholder = "Tìm nhanh...", isVehicle = false, isStatus = false, isDriver = false, isRole = false, statusConfig = [], roleConfig = [], width = "w-48", showCheckbox = true, direction = 'down', mobileIconOnly = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: any) => 
    removeAccents(opt.label).includes(removeAccents(search))
  );

  const isSelected = (optValue: string) => {
    if (Array.isArray(value)) return value.includes(optValue);
    return value === optValue;
  };

  const handleSelect = (optValue: string) => {
    if (!showCheckbox) {
      onChange(optValue);
      setIsOpen(false);
      return;
    }

    let newValues = Array.isArray(value) ? [...value] : [value];
    
    if (optValue === 'ALL') {
      newValues = ['ALL'];
    } else {
      newValues = newValues.filter(v => v !== 'ALL');
      if (newValues.includes(optValue)) {
        newValues = newValues.filter(v => v !== optValue);
        if (newValues.length === 0) newValues = ['ALL'];
      } else {
        newValues.push(optValue);
      }
    }
    onChange(newValues);
  };

  const renderCurrentLabel = () => {
    if (!Array.isArray(value) || value.includes('ALL') || value.length === 0) {
      if (Array.isArray(value) && value.length === 0) return <span className="text-[11px] font-bold text-slate-500 truncate">{label}</span>;
      const singleVal = Array.isArray(value) ? value[0] : value;
      if (singleVal === 'ALL') return <span className="text-[11px] font-bold text-slate-500 truncate">{label}</span>;
      const opt = options.find((o: any) => o.value === singleVal);
      return opt ? renderBadge(opt, true) : label;
    }

    if (value.length === 1) {
      const opt = options.find((o: any) => o.value === value[0]);
      return opt ? renderBadge(opt, true) : label;
    }

    return <span className="text-[11px] font-bold text-emerald-600 truncate">Đã chọn ({value.length})</span>;
  };

  const renderBadge = (opt: any, isMain = false) => {
    if (isVehicle && opt.value !== 'ALL') {
      // CUSTOM LOGIC: Split "Plate ✧ Driver" for Dashboard Filter
      if (opt.label.includes(' ✧ ')) {
        const [plate, driver] = opt.label.split(' ✧ ');
        return (
          <div className="flex items-center gap-2 min-w-0">
             <span className="flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black tracking-wider whitespace-nowrap">
               {plate}
             </span>
             <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-bold truncate">
               <User size={10} /> {driver}
             </span>
          </div>
        );
      }

      // Default logic for Search Trips (Vehicle Types)
      const config = getVehicleConfig(opt.label);
      const VIcon = config.icon;
      return (
        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold truncate ${config.style}`}>
          <VIcon size={10} /> {opt.label}
        </span>
      );
    }
    if (isStatus && opt.value !== 'ALL' && statusConfig.length > 0) {
      const config = statusConfig.find((s: any) => s.value === opt.value);
      if (config) {
        const SIcon = config.icon;
        return (
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold truncate ${config.style}`}>
            <SIcon size={10} /> {opt.label}
          </span>
        );
      }
    }
    if (isDriver && opt.value !== 'ALL') {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-bold truncate">
          <User size={10} /> {opt.label}
        </span>
      );
    }
    if (isRole && opt.value !== 'ALL' && roleConfig.length > 0) {
      const config = roleConfig.find((r: any) => r.value === opt.value);
      if (config) {
        const RIcon = config.icon;
        return (
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold truncate ${config.style}`}>
            <RIcon size={10} /> {opt.label}
          </span>
        );
      }
    }
    return <span className={`text-[11px] font-bold truncate ${isMain ? 'text-emerald-600' : 'text-slate-700'}`}>{opt.label}</span>;
  };

  return (
    <div className={`relative shrink-0 ${width}`} ref={dropdownRef}>
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center h-[42px] bg-white border border-slate-200 rounded-2xl hover:border-emerald-400 transition-all shadow-sm ${isOpen ? 'ring-2 ring-emerald-100 border-emerald-400' : ''} ${mobileIconOnly ? 'p-2.5 justify-center md:px-3 md:justify-between' : 'px-3 justify-between'}`}
      >
        <div className={`flex items-center min-w-0 overflow-hidden ${mobileIconOnly ? 'gap-0 md:gap-2' : 'gap-2'}`}>
          <Icon size={14} className={(!Array.isArray(value) ? value === 'ALL' : value.includes('ALL')) ? 'text-slate-500' : 'text-emerald-500'} />
          <div className={mobileIconOnly ? 'hidden md:inline-block' : ''}>
            {renderCurrentLabel()}
          </div>
        </div>
        <ChevronDown size={12} className={`text-slate-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${mobileIconOnly ? 'hidden md:inline-block' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${direction === 'up' ? 'bottom-full mb-3' : 'top-full mt-2'} right-0 min-w-[200px] w-full bg-white border border-slate-100 rounded-[24px] shadow-2xl z-[100] p-2 animate-in fade-in ${direction === 'up' ? 'zoom-in-95 slide-in-from-bottom-2' : 'zoom-in-95 slide-in-from-top-2'} duration-200`}>
          <div className="relative mb-2 px-1 pt-1">
            <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              autoFocus
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-500"
            />
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
            {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(opt.value); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${isSelected(opt.value) ? 'bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {showCheckbox && (
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected(opt.value) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'}`}>
                    {isSelected(opt.value) && <Check size={10} className="text-white" />}
                  </div>
                )}
                {renderBadge(opt, isSelected(opt.value))}
              </button>
            )) : (
              <div className="p-4 text-center text-[10px] text-slate-500 italic font-bold">Không tìm thấy kết quả</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const TripCardSkeleton = () => (
  <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4 animate-pulse">
    <div className="flex justify-between items-start">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100"></div>
        <div className="space-y-2 pt-1">
          <div className="h-3 w-20 bg-slate-100 rounded"></div>
          <div className="h-2 w-16 bg-slate-50 rounded"></div>
        </div>
      </div>
      <div className="h-5 w-14 bg-slate-100 rounded-lg"></div>
    </div>
    <div className="space-y-3 py-2">
      <div className="h-3 w-full bg-slate-100 rounded"></div>
      <div className="h-3 w-3/4 bg-slate-100 rounded"></div>
    </div>
    <div className="h-10 w-full bg-slate-100 rounded-xl mt-2"></div>
     <div className="pt-4 border-t border-slate-50 flex justify-between">
      <div className="h-4 w-16 bg-slate-100 rounded"></div>
      <div className="h-4 w-12 bg-slate-100 rounded"></div>
    </div>
  </div>
);

interface TripCardProps { 
  trip: Trip; 
  onBook: (id: string) => void; 
  userBookings?: Booking[]; 
  profile: Profile | null;
  onViewTripDetails: (trip: Trip) => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onBook, userBookings = [], profile, onViewTripDetails }) => {
  const tripCode = trip.trip_code || `T${trip.id.substring(0, 5).toUpperCase()}`;
  const departureDate = new Date(trip.departure_time);
  const statusInfo = getTripStatusDisplay(trip);
  const StatusIcon = statusInfo.icon;

  const timeStr = departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = departureDate.toLocaleDateString('vi-VN');
  
  const arrivalDateObj = trip.arrival_time 
    ? new Date(trip.arrival_time)
    : new Date(departureDate.getTime() + 3 * 60 * 60 * 1000); 
  const arrTime = arrivalDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const arrDate = arrivalDateObj.toLocaleDateString('vi-VN');

  const createdAtDate = trip.created_at ? new Date(trip.created_at) : null;
  const createdAtTime = createdAtDate ? createdAtDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const createdAtDay = createdAtDate ? `${String(createdAtDate.getDate()).padStart(2, '0')}/${String(createdAtDate.getMonth() + 1).padStart(2, '0')}` : '--/--';

  const totalSeatsBooked = useMemo(() => {
    return userBookings
      .filter(b => b.trip_id === trip.id && (b.status === 'PENDING' || b.status === 'CONFIRMED'))
      .reduce((sum, b) => sum + b.seats_booked, 0);
  }, [userBookings, trip.id]);
  
  const isTripOwner = profile?.id === trip.driver_id;
  const hasBooked = totalSeatsBooked > 0;
  const isFull = trip.available_seats <= 0;
  const isOngoing = trip.status === TripStatus.ON_TRIP;
  const isUrgent = trip.status === TripStatus.URGENT;
  const isPreparing = trip.status === TripStatus.PREPARING;
  const isCompleted = trip.status === TripStatus.COMPLETED;
  const isCancelled = trip.status === TripStatus.CANCELLED;
  
  const vehicleInfoParts = trip.vehicle_info.split(' (');
  const vehicleModel = vehicleInfoParts[0];
  const licensePlate = vehicleInfoParts[1] ? vehicleInfoParts[1].replace(')', '') : null;

  const vehicleConfig = getVehicleConfig(vehicleModel); 
  const VIcon = vehicleConfig.icon;

  const bookedSeats = trip.seats - trip.available_seats;
  const fillPercentage = trip.seats > 0 ? (bookedSeats / trip.seats) * 100 : 0;

  const isRequest = trip.is_request;
  const cardTitle = trip.driver_name;
  
  let fillBarColor: string;
  if (isRequest) {
    const bookingsCount = trip.bookings_count || 0;
    if (bookingsCount === 0) {
      fillBarColor = 'bg-slate-200';
    } else if (bookingsCount === 1) {
      fillBarColor = 'bg-emerald-500';
    } else {
      fillBarColor = 'bg-rose-500';
    }
  } else {
    if (bookedSeats <= 0) {
      fillBarColor = 'bg-slate-200';
    } else if (fillPercentage < 50) {
      fillBarColor = 'bg-emerald-500';
    } else if (fillPercentage < 100) {
      fillBarColor = 'bg-amber-500';
    } else {
      fillBarColor = 'bg-rose-500';
    }
  }
  
  const renderBookingButton = () => {
    if (isTripOwner) {
      if (isCompleted) return <button disabled className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed"><CheckCircle2 size={14} /> Chuyến đã kết thúc</button>;
      if (isCancelled) return <button disabled className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed"><X size={14} /> Chuyến đã huỷ</button>;
      return <button type="button" onClick={(e) => { e.stopPropagation(); onViewTripDetails(trip); }} className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"><ClipboardList size={14} /> Kiểm tra đặt chỗ</button>;
    }

    if (hasBooked) {
      if (isRequest) return <button type="button" onClick={(e) => { e.stopPropagation(); onViewTripDetails(trip); }} className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-200 transition-all"><CheckCircle2 size={14} /> Đã nhận chuyến</button>;
      const isBookable = !isFull && !isOngoing && !isCompleted && !isCancelled;
      if (isBookable) {
        return (
          <div className="grid grid-cols-5 gap-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); onViewTripDetails(trip); }} className="col-span-2 w-full h-10 flex items-center justify-center gap-1 rounded-xl bg-rose-100 text-rose-700 font-bold text-[10px] hover:bg-rose-200 transition-all"><Ticket size={12} /> Xem vé ({totalSeatsBooked})</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onBook(trip.id); }} className="col-span-3 w-full h-10 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all animate-pulse-blue"><Zap size={12} /> Đặt thêm</button>
          </div>
        );
      }
      return <button type="button" onClick={(e) => { e.stopPropagation(); onViewTripDetails(trip); }} className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-200 transition-all"><Clock size={14} /> Đã đặt {totalSeatsBooked} ghế</button>;
    }
    
    if (isCompleted) return <button disabled className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed"><Ban size={14} /> Chuyến đã kết thúc</button>;
    if (isCancelled) return <button disabled className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed"><Ban size={14} /> Chuyến đã huỷ</button>;
    if (isOngoing) return <button disabled className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed"><Ban size={14} /> Xe đang chạy</button>;

    if (isFull) {
      return <button type="button" onClick={(e) => { e.stopPropagation(); onBook(trip.id); }} className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all animate-pulse-orange"><Users size={14} /> Đặt dự phòng</button>;
    }

    return <button type="button" onClick={(e) => { e.stopPropagation(); onBook(trip.id); }} className={`w-full h-10 flex items-center justify-center gap-2 rounded-xl text-white font-bold text-xs shadow-lg transition-all ${isRequest ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 animate-pulse-blue'}`}>{isRequest ? <CheckCircle2 size={14} /> : <Zap size={14} />} {isRequest ? 'Nhận chuyến ngay' : 'Đặt chỗ ngay'}</button>;
  };

  return (
    <div className={`bg-white p-4 rounded-[24px] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative flex flex-col cursor-pointer ${isOngoing ? 'border-blue-200 bg-blue-50/20' : isUrgent ? 'border-rose-400 bg-rose-50/20' : isPreparing ? 'border-amber-300 bg-amber-50/10' : 'border-slate-100'} ${isCompleted || isCancelled ? 'opacity-80' : ''}`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold z-10 ${statusInfo.style}`}>
            {isOngoing ? <Play size={10} className="animate-pulse" /> : <StatusIcon size={10} />}
            {statusInfo.label}
          </div>

          <div className="flex flex-col items-center">
            {isRequest ? (
              <span className="text-[8px] font-bold text-slate-500">
                {trip.seats === 7 ? 'Bao xe' : `${trip.seats} ghế`} ({trip.bookings_count || 0} xe nhận)
              </span>
            ) : (
              <span className="text-[8px] font-bold text-slate-500">
                Còn {trip.available_seats}/{trip.seats} ghế trống
              </span>
            )}
            <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
              <div className={`h-full rounded-full transition-all duration-500 ${fillBarColor}`} style={{ width: `${isRequest ? 100 : fillPercentage}%` }}></div>
            </div>
          </div>

          <p className={`text-sm font-bold tracking-tight ${isRequest ? 'text-orange-600' : 'text-indigo-600'}`}>
            {trip.price === 0 ? 'Thoả thuận' : new Intl.NumberFormat('vi-VN').format(trip.price) + 'đ'}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 items-start mb-3 min-h-[30px] justify-center">
          <div className="flex items-center gap-2.5 w-full">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold border shrink-0 ${isRequest ? 'bg-orange-600 border-orange-100' : 'bg-indigo-600 border-indigo-100'}`}>
              {cardTitle?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate">{cardTitle}</h4>
                  {trip.is_discount_provider && !isRequest && (
                  <div className="text-amber-500 flex items-center gap-1 shrink-0" title="Đối tác Ưu đãi">
                      <Handshake size={12} />
                  </div>
                  )}
              </div>
            </div>
          </div>
          
          {isRequest ? (
             <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate bg-orange-50 text-orange-600 border-orange-100">
                   <Users size={9} /> {trip.vehicle_info || 'Khách tìm xe'}
                </span>
             </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate ${vehicleConfig.style} flex-shrink-0 min-w-0`}>
                  <VIcon size={9} /> {vehicleModel}
                </span>
                {licensePlate && (
                  <div className="inline-flex items-center bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm self-start whitespace-nowrap flex-shrink-0 min-w-0 max-w-full">
                    <CopyableCode code={licensePlate} className="text-[9px] font-black uppercase tracking-wider" label={licensePlate} />
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="space-y-2.5 mb-3 relative">
          <div className="absolute left-[7px] top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-indigo-100/70 via-slate-100/70 to-emerald-100/70"></div> 
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-indigo-100/70 border-indigo-200/50 shadow-indigo-200/50">
              <div className="w-2 h-2 rounded-full shadow-inner bg-indigo-600"></div>
            </div>
            <div className="flex flex-col">
              <p className="font-bold text-slate-700 text-[12px] truncate">{trip.origin_name}</p>
              <div className="flex items-center gap-1.5 self-start flex-wrap mt-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border shadow-sm bg-indigo-50 text-indigo-600 border-indigo-100">
                  <Clock size={8} />
                  <span className="text-[9px] font-black">{timeStr}</span>
                </div>
                <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                  <Calendar size={8} />
                  <span className="text-[9px] font-bold">{dateStr}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-4 h-4 rounded-full bg-emerald-100/70 flex items-center justify-center shrink-0 border border-emerald-200/50 shadow-lg shadow-emerald-200/50">
              <div className="w-2 h-2 rounded-full shadow-inner bg-emerald-600"></div>
            </div>
            <div className="flex flex-col">
              <p className="font-bold text-slate-700 text-[12px] truncate">{trip.dest_name}</p>
              <div className="flex items-center gap-1.5 self-start flex-wrap mt-1">
                <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                  <Clock size={8} />
                  <span className="text-[9px] font-black">{arrTime}</span>
                </div>
                <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                  <Calendar size={8} />
                  <span className="text-[9px] font-bold">{arrDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-auto pt-2 border-t border-slate-100">
        
        <div className="grid grid-cols-3 items-center">
          <div className="flex justify-start">
             <div className="inline-flex items-center bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100 shadow-sm">
               <CopyableCode code={tripCode} className="text-[9px] font-black" label={tripCode} />
             </div>
          </div>
          <div className="flex justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); onViewTripDetails(trip); }} 
              className="px-2 py-1 rounded-lg transition-all border shadow-sm flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"
            >
              <Info size={10} />
              <span className="text-[10px] font-bold">Chi tiết</span>
            </button>
          </div>
          <div className="flex justify-end items-center gap-1 text-[9px] font-bold text-slate-400">
             <Clock size={10} className="shrink-0" />
             <span>{createdAtTime} {createdAtDay}</span>
          </div>
        </div>
        <div className="mt-3">
          {renderBookingButton()}
        </div>
      </div>
    </div>
  );
};

interface SearchTripsProps {
  trips: Trip[];
  onBook: (id: string) => void;
  userBookings: Booking[];
  profile: Profile | null;
  onViewTripDetails: (trip: Trip) => void;
  onPostClick: (mode: 'DRIVER' | 'PASSENGER') => void; 
}

// Section Header Component
const SectionHeader = ({ icon: Icon, title, count, color = 'text-emerald-600', bgColor = 'bg-emerald-100' }: any) => (
  <div className="flex items-center gap-3">
    <div className={`p-2 rounded-xl ${bgColor} ${color}`}>
      <Icon size={18} />
    </div>
    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
    <span className="text-sm font-bold text-slate-400">({count} chuyến)</span>
    <hr className="flex-1 border-dashed border-slate-200" />
  </div>
);

const SearchTrips: React.FC<SearchTripsProps> = ({ trips, onBook, userBookings, profile, onViewTripDetails, onPostClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState<string[]>(['ALL']); // Changed from vehicleFilter
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']); 
  const [originFilter, setOriginFilter] = useState<string[]>(['ALL']); 
  const [destinationFilter, setDestinationFilter] = useState<string[]>(['ALL']); 
  const [sortOrder, setSortOrder] = useState('TIME_ASC'); 
  const [loading, setLoading] = useState(true);
  const [isRequestMode, setIsRequestMode] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearInterval(timer);
  }, [searchTerm, driverFilter, statusFilter, originFilter, destinationFilter, sortOrder, isRequestMode]); 

  const uniqueOrigins = useMemo(() => {
    const origins = new Set<string>();
    trips.forEach(trip => origins.add(trip.origin_name));
    return [{ label: 'Tất cả điểm đi', value: 'ALL' }, ...Array.from(origins).map(name => ({ label: name, value: name }))];
  }, [trips]);

  const uniqueDestinations = useMemo(() => {
    const destinations = new Set<string>();
    trips.forEach(trip => destinations.add(trip.dest_name));
    return [{ label: 'Tất cả điểm đến', value: 'ALL' }, ...Array.from(destinations).map(name => ({ label: name, value: name }))];
  }, [trips]);

  const uniqueDrivers = useMemo(() => {
    const drivers = new Set<string>();
    trips.forEach(trip => {
      // Only add if driver exists AND is a discount provider
      if (trip.driver_name && trip.is_discount_provider) drivers.add(trip.driver_name);
    });
    // Label change to indicate these are partner drivers
    return [{ label: 'Tất cả đối tác ưu đãi', value: 'ALL' }, ...Array.from(drivers).map(name => ({ label: name, value: name }))];
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const searchNormalized = removeAccents(searchTerm);
    let result = trips.filter(t => {
      const isTripRequest = !!t.is_request;
      
      if (isRequestMode && !isTripRequest) return false;
      if (!isRequestMode && isTripRequest) return false;

      // Filter out past trips strictly for Search view
      if (new Date(t.departure_time) < new Date()) return false;

      const tripCode = t.trip_code || (t.id ? `T${t.id.substring(0, 5).toUpperCase()}` : '');
      const matchesSearch = removeAccents(t.origin_name).includes(searchNormalized) || 
                            removeAccents(t.dest_name).includes(searchNormalized) ||
                            (tripCode && removeAccents(tripCode).includes(searchNormalized)) ||
                            (t.driver_name && removeAccents(t.driver_name).includes(searchNormalized)) ||
                            removeAccents(t.vehicle_info).includes(searchNormalized); 
      
      const matchesDriver = driverFilter.includes('ALL') || (t.driver_name && driverFilter.includes(t.driver_name));
      const matchesStatus = statusFilter.includes('ALL') || statusFilter.includes(t.status);
      const matchesOrigin = originFilter.includes('ALL') || originFilter.includes(t.origin_name);
      const matchesDestination = destinationFilter.includes('ALL') || destinationFilter.includes(t.dest_name);

      return matchesSearch && matchesDriver && matchesStatus && matchesOrigin && matchesDestination;
    });

    // Default sort is always by status priority then time
    result.sort((a, b) => {
      const timeA = new Date(a.departure_time).getTime();
      const timeB = new Date(b.departure_time).getTime();
      const statusA = getTripStatusDisplay(a);
      const statusB = getTripStatusDisplay(b);

      if (statusA.priority !== statusB.priority) {
        return statusA.priority - statusB.priority;
      }
      return timeA - timeB;
    });

    if (sortOrder === 'PRICE_ASC') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'NEWEST') {
      result.sort((a, b) => {
         const createA = a.created_at ? new Date(a.created_at).getTime() : 0;
         const createB = b.created_at ? new Date(b.created_at).getTime() : 0;
         return createB - createA;
      });
    }

    return result;
  }, [trips, searchTerm, driverFilter, statusFilter, originFilter, destinationFilter, sortOrder, isRequestMode]); 

  const groupedTrips = useMemo(() => {
    const today: Trip[] = [];
    const thisMonth: Trip[] = [];
    const future: Trip[] = [];
    const past: Trip[] = [];
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    for (const trip of filteredTrips) {
      const departureDate = new Date(trip.departure_time);
      
      // If a trip is completed or cancelled, it's considered in the past, regardless of date.
      if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
        past.push(trip);
        continue;
      }

      if (departureDate < startOfToday) {
        past.push(trip);
      } else if (departureDate >= startOfToday && departureDate <= endOfToday) {
        today.push(trip);
      } else if (departureDate > endOfToday && departureDate <= endOfMonth) {
        thisMonth.push(trip);
      } else {
        future.push(trip);
      }
    }
    
    // Sort past trips in reverse chronological order (newest past trips first)
    past.sort((a, b) => new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime());

    return { today, thisMonth, future, past };
  }, [filteredTrips]);

  const renderTripGroup = (group: Trip[], title: string, icon: React.ElementType, colors: any) => {
    if (group.length === 0) return null;
    return (
        <section className="space-y-5">
            <SectionHeader icon={icon} title={title} count={group.length} color={colors.color} bgColor={colors.bgColor} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 items-start">
                {group.map(trip => (
                    <TripCard key={trip.id} trip={trip} onBook={onBook} userBookings={userBookings} profile={profile} onViewTripDetails={onViewTripDetails} />
                ))}
            </div>
        </section>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-slide-up max-w-[1600px] mx-auto">
      {/* Pill Toggle Switcher - Centered perfectly with w-full container */}
      <div className="w-full flex justify-center items-center gap-3 relative z-40">
        <div className="flex bg-white p-1 rounded-full border border-slate-200 shadow-sm w-fit">
          <button 
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${!isRequestMode ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`} 
            onClick={() => setIsRequestMode(false)}
          >
            <Car size={14} /> Chuyến xe có sẵn
          </button>
          <button 
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${isRequestMode ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`} 
            onClick={() => setIsRequestMode(true)}
          >
            <CheckCircle2 size={14} /> Yêu cầu chuyến xe
          </button>
        </div>
      </div>

      {/* Search & Filter UI (Dynamic Colors) */}
      <div className={`bg-gradient-to-br p-5 rounded-[32px] border shadow-sm space-y-4 backdrop-blur-sm relative z-30 ${isRequestMode ? 'from-orange-50/80 to-white border-orange-100' : 'from-emerald-50/80 to-white border-emerald-100'}`}>
        <div className="flex flex-col gap-4">
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-3 w-full md:flex-1">
               <div className="relative flex-1 group">
                  <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors ${isRequestMode ? 'group-focus-within:text-orange-600' : 'group-focus-within:text-emerald-600'}`} size={16} />
                  <input 
                    type="text" placeholder="Tìm kiếm..." 
                    value={searchTerm} 
                    onChange={(e) => { setSearchTerm(e.target.value); setLoading(true); }}
                    className={`w-full pl-10 pr-4 h-[42px] bg-white/80 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm ${isRequestMode ? 'focus:border-orange-400 focus:ring-4 focus:ring-orange-50/50' : 'focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50/50'}`} 
                  />
               </div>
               
               <div className="flex-1 md:w-48 md:flex-none shrink-0">
                  <UnifiedDropdown 
                    label="Sắp xếp" icon={ArrowUpDown} value={sortOrder} width="w-full" showCheckbox={false}
                    options={[
                      { label: 'Sắp khởi hành', value: 'TIME_ASC' },
                      { label: 'Vừa đăng xong', value: 'NEWEST' },
                      { label: 'Giá từ thấp tới cao', value: 'PRICE_ASC' }
                    ]}
                    onChange={(val: string) => { setSortOrder(val); setLoading(true); }}
                  />
               </div>
            </div>

            <button 
              onClick={() => onPostClick(isRequestMode ? 'PASSENGER' : 'DRIVER')}
              className={`hidden md:flex h-[42px] px-4 rounded-xl text-xs font-bold transition-all items-center justify-center gap-2 shadow-sm hover:shadow-md border border-transparent whitespace-nowrap ${
                isRequestMode 
                  ? 'bg-orange-600 text-white shadow-orange-200 border-orange-200 hover:bg-orange-700' 
                  : 'bg-emerald-600 text-white shadow-emerald-200 border-emerald-200 hover:bg-emerald-700'
              }`}
            >
              <Plus size={16} /> 
              {isRequestMode ? 'Đăng yêu cầu mới' : 'Đăng chuyến mới'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-3 w-full">
            <UnifiedDropdown 
              label="Trạng thái" icon={ClipboardList} value={statusFilter} width="w-full lg:w-48" showCheckbox={true}
              isStatus={true}
              statusConfig={statusFilterOptions}
              options={statusFilterOptions}
              onChange={(val: string[]) => { setStatusFilter(val); setLoading(true); }}
            />
            <UnifiedDropdown 
              label="Tài xế" icon={User} value={driverFilter} isDriver={true} width="w-full lg:w-48" showCheckbox={true}
              options={uniqueDrivers}
              onChange={(val: string[]) => { setDriverFilter(val); setLoading(true); }}
            />
            <UnifiedDropdown 
              label="Điểm đi" icon={Navigation} value={originFilter} width="w-full lg:w-48" showCheckbox={true}
              options={uniqueOrigins}
              onChange={(val: string[]) => { setOriginFilter(val); setLoading(true); }}
            />
            <UnifiedDropdown 
              label="Điểm đến" icon={MapPin} value={destinationFilter} width="w-full lg:w-48" showCheckbox={true}
              options={uniqueDestinations}
              onChange={(val: string[]) => { setDestinationFilter(val); setLoading(true); }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-10 min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <TripCardSkeleton key={i} />)}
          </div>
        ) : filteredTrips.length > 0 ? (
            <>
              {renderTripGroup(groupedTrips.today, 'Hôm nay', CalendarDays, { color: 'text-emerald-600', bgColor: 'bg-emerald-100' })}
              {renderTripGroup(groupedTrips.thisMonth, 'Trong tháng này', Calendar, { color: 'text-sky-600', bgColor: 'bg-sky-100' })}
              {renderTripGroup(groupedTrips.future, 'Tương lai', Send, { color: 'text-indigo-600', bgColor: 'bg-indigo-100' })}
              {renderTripGroup(groupedTrips.past, 'Quá khứ', History, { color: 'text-slate-500', bgColor: 'bg-slate-100' })}
            </>
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
             <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
             <p className="text-xs font-bold text-slate-500 uppercase">
               {isRequestMode ? 'Không có nhu cầu tìm xe nào' : 'Không có chuyến xe nào'}
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchTrips;
