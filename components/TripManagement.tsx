
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ClipboardList, Search, Clock, ArrowUpDown, Play, CheckCircle2, XCircle, Loader2, ArrowRight, User, Car, History, Timer, X, AlertCircle, ChevronDown, Check, Phone, Calendar, Lock, LayoutList, LayoutGrid, Star, Sparkles, Radio, Info, Users, Layers, Ban, CalendarDays, Send, ListChecks, MapPin
} from 'lucide-react';
import { Trip, Profile, TripStatus, Booking } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown, getVehicleConfig, getTripStatusDisplay } from './SearchTrips';
import { TableSkeleton } from './OrderManagement';

const removeAccents = (str: string) => {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
};

const statusOptions = [
  { label: 'Chuẩn bị', value: TripStatus.PREPARING, style: 'text-amber-600 bg-amber-50 border-amber-100', icon: Timer },
  { label: 'Sát giờ', value: TripStatus.URGENT, style: 'text-rose-600 bg-rose-50 border-rose-100', icon: AlertCircle },
  { label: 'Đang chạy', value: TripStatus.ON_TRIP, style: 'text-blue-600 bg-blue-50 border-blue-100', icon: Play },
  { label: 'Hoàn thành', value: TripStatus.COMPLETED, style: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
  { label: 'Huỷ', value: TripStatus.CANCELLED, style: 'text-rose-600 bg-rose-50 border-rose-100', icon: X },
  { label: 'Đầy chỗ', value: TripStatus.FULL, style: 'text-slate-600 bg-slate-50 border-slate-200', icon: AlertCircle },
];

export const TripStatusSelector = ({ value, onChange, disabled, arrivalTime }: { value: TripStatus, onChange: (status: TripStatus) => void, disabled?: boolean, arrivalTime?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentStatus = statusOptions.find(s => s.value === value) || statusOptions[0];
  const filteredOptions = statusOptions.filter(opt => 
    removeAccents(opt.label).includes(removeAccents(statusSearch))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setStatusSearch('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isTerminalStatus = value === TripStatus.COMPLETED || value === TripStatus.CANCELLED;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button" 
        disabled={disabled || isTerminalStatus} 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-bold z-10 transition-all ${currentStatus.style} ${(disabled || isTerminalStatus) ? 'opacity-80 cursor-not-allowed' : 'hover:brightness-95 hover:shadow-sm'}`}
      >
        {value === TripStatus.ON_TRIP ? <Play size={10} className="animate-pulse" /> : <currentStatus.icon size={10} />}
        {currentStatus.label}
        {(!disabled && !isTerminalStatus) && <ChevronDown size={8} className={`transition-transform duration-300 ml-0.5 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>
      
      {isOpen && !disabled && !isTerminalStatus && (
        <div className="absolute top-full mt-1 left-0 w-44 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-100 z-[999] p-1 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
          <div className="space-y-0.5 p-0.5">
            {filteredOptions.map((opt) => {
              const isSelectable = opt.value === TripStatus.CANCELLED;
              const isCurrent = value === opt.value;

              return (
                <button 
                  key={opt.value} type="button" 
                  disabled={!isSelectable || isCurrent}
                  onMouseDown={(e) => { 
                    if (!isSelectable || isCurrent) return;
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    onChange(opt.value); 
                    setIsOpen(false); 
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                    isCurrent 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : isSelectable 
                        ? 'hover:bg-rose-50 text-rose-600 hover:text-rose-700' 
                        : 'opacity-30 cursor-not-allowed text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isCurrent ? <CheckCircle2 size={11} className="text-white" /> : <opt.icon size={11} />}
                    <span className="text-[10px] font-bold">{opt.label}</span>
                  </div>
                  {!isSelectable && !isCurrent && <Lock size={9} className="text-slate-300 opacity-50" />}
                  {isCurrent && <Check size={11} className="text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Section Header Component (Shared style)
const SectionHeader = ({ icon: Icon, title, count, color = 'text-emerald-600', bgColor = 'bg-emerald-100' }: any) => (
  <div className="flex items-center gap-3 mt-6 mb-4">
    <div className={`p-2 rounded-xl ${bgColor} ${color}`}>
      <Icon size={18} />
    </div>
    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
    <span className="text-sm font-bold text-slate-400">({count})</span>
    <hr className="flex-1 border-dashed border-slate-200" />
  </div>
);

interface TripManagementProps {
  profile: Profile | null;
  trips: Trip[];
  bookings: Booking[];
  onRefresh: () => void;
  onViewTripDetails: (trip: Trip) => void; 
  showAlert: (config: any) => void;
}

type SortConfig = { key: keyof Trip | 'driver_name'; direction: 'asc' | 'desc' | null };

const TripManagement: React.FC<TripManagementProps> = ({ profile, trips, bookings, onRefresh, onViewTripDetails, showAlert }) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [tripTypeFilter, setTripTypeFilter] = useState<'ALL' | 'SUPPLY' | 'DEMAND'>('ALL'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearInterval(timer);
  }, [searchTerm, statusFilter, sortOrder, tripTypeFilter]);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  
  const handleSort = (key: SortConfig['key']) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const displayTrips = useMemo(() => {
    const searchNormalized = removeAccents(searchTerm);
    let filtered = trips.filter(trip => {
      const isOwner = isAdmin || trip.driver_id === profile?.id;
      const isRequest = !!trip.is_request;
      if (tripTypeFilter === 'SUPPLY' && isRequest) return false;
      if (tripTypeFilter === 'DEMAND' && !isRequest) return false;

      // Update: Logic ID Chuyến xe bắt đầu bằng X
      const tripCode = trip.trip_code || (trip.id ? `X${trip.id.substring(0, 5).toUpperCase()}` : '');
      const matchesSearch = removeAccents(trip.origin_name).includes(searchNormalized) || 
                            removeAccents(trip.dest_name).includes(searchNormalized) ||
                            (tripCode && removeAccents(tripCode).includes(searchNormalized)) ||
                            (trip.driver_name && removeAccents(trip.driver_name).includes(searchNormalized));
      
      const matchesStatus = statusFilter.includes('ALL') || statusFilter.includes(trip.status);
      
      return isOwner && matchesSearch && matchesStatus;
    });

    filtered.sort((a: any, b: any) => {
      if (sortOrder === 'NEWEST') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortOrder === 'DEPARTURE_ASC') return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
      if (sortOrder === 'PRICE_ASC') return a.price - b.price;
      if (sortOrder === 'SEATS_DESC') return b.available_seats - a.available_seats;
      return 0;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'created_at' || sortConfig.key === 'departure_time') {
          valA = valA ? new Date(valA).getTime() : 0;
          valB = valB ? new Date(valB).getTime() : 0;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [trips, searchTerm, statusFilter, sortOrder, sortConfig, isAdmin, profile, tripTypeFilter]);

  const groupedTrips = useMemo(() => {
    const today: Trip[] = [];
    const thisMonth: Trip[] = [];
    const future: Trip[] = [];
    const past: Trip[] = [];
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    for (const trip of displayTrips) {
      const departureDate = new Date(trip.departure_time);
      
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
    
    // Sort past trips in reverse chronological order
    past.sort((a, b) => new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime());

    return { today, thisMonth, future, past };
  }, [displayTrips]);

  const handleUpdateStatus = async (tripId: string, newStatus: TripStatus) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip?.status === TripStatus.COMPLETED || trip?.status === TripStatus.CANCELLED) return;
    
    tripId = String(tripId);
    setActionLoading(tripId);
    try {
      const { error } = await supabase.from('trips').update({ status: newStatus }).eq('id', tripId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { 
      showAlert({ title: 'Lỗi', message: err.message, variant: 'danger', confirmText: 'Đóng' }); 
    } finally { 
      setActionLoading(null); 
    }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: { label: string, sortKey: SortConfig['key'], width?: string, textAlign?: string }) => (
    <th 
      style={{ width }} 
      className={`px-4 py-4 text-[11px] font-bold text-slate-500 tracking-tight cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  const renderTripCard = (trip: Trip) => {
    const isRequest = trip.is_request;
    const tripBookings = bookings.filter(b => b.trip_id === trip.id);
    const confirmedBookings = tripBookings.filter(b => b.status === 'CONFIRMED');
    const bookedSeatsCount = confirmedBookings.reduce((sum, b) => sum + b.seats_booked, 0);
    const availableSeatsCount = trip.seats - bookedSeatsCount;
    const safeAvailableSeats = availableSeatsCount < 0 ? 0 : availableSeatsCount;
    const fillPercent = trip.seats > 0 ? (bookedSeatsCount / trip.seats) * 100 : 0;

    let fillBarColor: string;
    if (isRequest) {
      const bookingsCount = trip.bookings_count || 0;
      fillBarColor = bookingsCount === 0 ? 'bg-slate-200' : bookingsCount === 1 ? 'bg-emerald-500' : 'bg-rose-500';
    } else {
      if (bookedSeatsCount <= 0) fillBarColor = 'bg-slate-200';
      else if (fillPercent < 50) fillBarColor = 'bg-emerald-500';
      else if (fillPercent < 100) fillBarColor = 'bg-amber-500';
      else fillBarColor = 'bg-rose-500';
    }
    
    // Booking Stats for Footer
    const stats = {
        pending: tripBookings.filter(b => b.status === 'PENDING').length,
        confirmed: tripBookings.filter(b => b.status === 'CONFIRMED').length,
        pickedUp: tripBookings.filter(b => b.status === 'PICKED_UP').length,
        onBoard: tripBookings.filter(b => b.status === 'ON_BOARD').length,
        cancelled: tripBookings.filter(b => b.status === 'CANCELLED').length
    };

    const depTime = new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
    const depDate = new Date(trip.departure_time).toLocaleDateString('vi-VN');
    const arrivalDateObj = trip.arrival_time ? new Date(trip.arrival_time) : null;
    const arrTime = arrivalDateObj ? arrivalDateObj.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const arrDate = arrivalDateObj ? arrivalDateObj.toLocaleDateString('vi-VN') : '--/--/----';
    const createdAt = trip.created_at ? new Date(trip.created_at) : null;
    const createdAtTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const createdAtDay = createdAt ? createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--/--';
    // Update: Logic ID Chuyến xe bắt đầu bằng X
    const tripCode = trip.trip_code || (trip.id ? `X${trip.id.substring(0, 5).toUpperCase()}` : '');
    const isCompleted = trip.status === TripStatus.COMPLETED;
    const isCancelled = trip.status === TripStatus.CANCELLED;
    const isOngoing = trip.status === TripStatus.ON_TRIP;
    const isUrgent = trip.status === TripStatus.URGENT;
    const isPreparing = trip.status === TripStatus.PREPARING;
    const vehicleRaw = trip.vehicle_info || '';
    const vehicleParts = vehicleRaw.split(' (');
    const vehicleModel = vehicleParts[0] || '---';
    const licensePlate = vehicleParts[1] ? vehicleParts[1].replace(')', '') : '';
    const vehicleConfig = getVehicleConfig(vehicleModel);
    const VIcon = isRequest ? Users : vehicleConfig.icon;

    return (
      <div key={trip.id} className={`bg-white p-4 rounded-[24px] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative flex flex-col justify-between h-full ${isOngoing ? 'border-blue-200 bg-blue-50/20' : isUrgent ? 'border-rose-400 bg-rose-50/20' : isPreparing ? 'border-amber-300 bg-amber-50/10' : 'border-slate-100'} ${isCompleted || isCancelled ? 'opacity-80' : ''}`} onClick={() => onViewTripDetails(trip)}>
        <div>
          <div className="flex items-center justify-between mb-3">
            <div onClick={(e) => e.stopPropagation()} className="z-20">
              {actionLoading === trip.id ? (
                <div className="flex items-center justify-center py-1 bg-slate-50 rounded-lg border border-slate-100 w-28"><Loader2 className="animate-spin text-indigo-500" size={12} /></div>
              ) : (
                <TripStatusSelector value={trip.status} disabled={isCompleted || isCancelled} arrivalTime={trip.arrival_time} onChange={(newStatus) => handleUpdateStatus(trip.id, newStatus)} />
              )}
            </div>
            <div className="flex flex-col items-center">
              {isRequest ? (
                  <span className="text-[8px] font-bold text-slate-500">{trip.seats === 7 ? 'Bao xe' : `${trip.seats} ghế`} ({trip.bookings_count || 0} xe nhận)</span>
              ) : (
                  <span className="text-[8px] font-bold text-slate-500">Còn {safeAvailableSeats}/{trip.seats} ghế</span>
              )}
              <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                <div className={`h-full rounded-full transition-all duration-500 ${fillBarColor}`} style={{ width: isRequest ? '100%' : `${fillPercent}%` }}></div>
              </div>
            </div>
            <p className={`text-sm font-bold tracking-tight ${isRequest ? 'text-orange-600' : 'text-indigo-600'}`}>
              {trip.price === 0 ? 'Thoả thuận' : new Intl.NumberFormat('vi-VN').format(trip.price) + 'đ'}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 items-start mb-3 min-h-[30px] justify-center">
            <div className="flex items-center gap-2.5 w-full">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg shrink-0 ${isRequest ? 'bg-orange-500 shadow-orange-100' : 'bg-indigo-600 shadow-indigo-100'}`}>{trip.driver_name?.charAt(0)}</div>
              <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate flex-1">{trip.driver_name}</h4>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap pl-0.5">
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate ${isRequest ? 'bg-orange-50 text-orange-600 border-orange-100' : vehicleConfig.style}`}><VIcon size={9} /> {isRequest ? (trip.vehicle_info || 'Cần tìm xe') : vehicleModel}</span>
                {!isRequest && licensePlate && <div className="inline-flex items-center bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><CopyableCode code={licensePlate} className="text-[9px] font-black uppercase tracking-wider" label={licensePlate} /></div>}
            </div>
          </div>
          <div className="space-y-2.5 mb-3 relative">
            <div className="absolute left-[7px] top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-indigo-100/70 via-slate-100/70 to-emerald-100/70"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-indigo-100/70 border-indigo-200/50 shadow-indigo-200/50"><div className="w-2 h-2 rounded-full shadow-inner bg-indigo-600"></div></div>
              <div className="flex-1">
                <p className="font-bold text-slate-700 text-[12px] truncate leading-tight">{trip.origin_name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border shadow-sm bg-indigo-50 text-indigo-600 border-indigo-100"><Clock size={8} /> <span className="text-[9px] font-black">{depTime}</span></div>
                  <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /> <span className="text-[9px] font-bold">{depDate}</span></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-emerald-100/70 border-emerald-200/50 shadow-emerald-200/50"><div className="w-2 h-2 rounded-full shadow-inner bg-emerald-600"></div></div>
              <div className="flex-1">
                <p className="font-bold text-slate-700 text-[12px] truncate leading-tight">{trip.dest_name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border shadow-sm bg-emerald-50 text-emerald-600 border-emerald-100"><Clock size={8} /> <span className="text-[9px] font-black">{arrTime}</span></div>
                  <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /> <span className="text-[9px] font-bold">{arrDate}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Row (Icons Only) */}
        <div className="flex items-center justify-between mb-2 px-1 pt-2 mt-auto border-t border-slate-50">
             <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md border border-amber-100" title="Chờ duyệt">
                <Clock size={10} /> <span className="text-[9px] font-bold">{stats.pending}</span>
             </div>
             <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md border border-emerald-100" title="Xác nhận">
                <CheckCircle2 size={10} /> <span className="text-[9px] font-bold">{stats.confirmed}</span>
             </div>
             <div className="flex items-center gap-1 bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded-md border border-cyan-100" title="Đã đón">
                <MapPin size={10} /> <span className="text-[9px] font-bold">{stats.pickedUp}</span>
             </div>
             <div className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md border border-indigo-100" title="Đang đi">
                <Play size={10} /> <span className="text-[9px] font-bold">{stats.onBoard}</span>
             </div>
             <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md border border-rose-100" title="Đã huỷ">
                <XCircle size={10} /> <span className="text-[9px] font-bold">{stats.cancelled}</span>
             </div>
        </div>

        <div className="grid grid-cols-3 items-center pt-2 border-t border-slate-100">
          <div className="flex justify-start"><div className="inline-flex items-center bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100 shadow-sm"><CopyableCode code={tripCode} className="text-[9px] font-black" label={tripCode} /></div></div>
          <div className="flex justify-center"><button onClick={(e) => { e.stopPropagation(); onViewTripDetails(trip); }} className="px-2 py-1 rounded-lg transition-all border shadow-sm flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"><Info size={10} /><span className="text-[10px] font-bold">Chi tiết</span></button></div>
          <div className="flex justify-end items-center gap-1 text-[9px] font-bold text-slate-400"><Clock size={10} className="shrink-0" /><span>{createdAtTime} {createdAtDay}</span></div>
        </div>
      </div>
    );
  };

  const renderGroup = (group: Trip[], title: string, icon: React.ElementType, colors: any) => {
    if (group.length === 0) return null;
    return (
        <section className="space-y-5">
            <SectionHeader icon={icon} title={title} count={group.length} color={colors.color} bgColor={colors.bgColor} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-5">
                {group.map(trip => renderTripCard(trip))}
            </div>
        </section>
    );
  };

  return (
    <div className="space-y-4 animate-slide-up max-w-[1600px] mx-auto">
      <div className="flex justify-center mb-2">
         <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex relative z-30 h-[42px]">
            <button 
               onClick={() => setTripTypeFilter('ALL')}
               className={`px-5 h-full rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${tripTypeFilter === 'ALL' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
               <Layers size={14} /> Tất cả
            </button>
            <button 
               onClick={() => setTripTypeFilter('SUPPLY')}
               className={`px-5 h-full rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${tripTypeFilter === 'SUPPLY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
               <Car size={14} /> Chuyến xe
            </button>
            <button 
               onClick={() => setTripTypeFilter('DEMAND')}
               className={`px-5 h-full rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${tripTypeFilter === 'DEMAND' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
               <CheckCircle2 size={14} /> Yêu cầu
            </button>
         </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100 p-6 rounded-[32px] shadow-sm space-y-5 backdrop-blur-sm relative z-30 transition-colors">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-3 w-full md:flex-1">
               <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" size={16} />
                  <input 
                    type="text" 
                    placeholder={tripTypeFilter === 'SUPPLY' ? "Tìm mã xe, tài xế..." : tripTypeFilter === 'DEMAND' ? "Tìm mã yêu cầu, khách hàng..." : "Tìm mã, địa điểm..."} 
                    value={searchTerm} 
                    onChange={e => { setSearchTerm(e.target.value); setLoading(true); }}
                    className="w-full pl-10 pr-4 h-[42px] bg-white/80 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50/50" 
                  />
               </div>
               <div className="flex-1 md:w-48 md:flex-none shrink-0">
                  <UnifiedDropdown 
                    label="Sắp xếp" icon={ArrowUpDown} value={sortOrder} width="w-full" showCheckbox={false}
                    options={[
                      { label: 'Vừa đăng xong', value: 'NEWEST' },
                      { label: 'Sắp khởi hành', value: 'DEPARTURE_ASC' },
                      { label: 'Giá thấp nhất', value: 'PRICE_ASC' },
                      { label: 'Nhiều chỗ nhất', value: 'SEATS_DESC' }
                    ]}
                    onChange={(val: string) => { setSortOrder(val); setLoading(true); }}
                  />
               </div>
            </div>
            <div className="hidden md:flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm items-center shrink-0 h-[42px]">
              <button onClick={() => setViewMode('list')} className={`p-2 h-full aspect-square flex items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutList size={18} />
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-2 h-full aspect-square flex items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-3 w-full">
            <UnifiedDropdown 
              label="Trạng thái" icon={ClipboardList} value={statusFilter} width="w-full lg:w-48" showCheckbox={true}
              isStatus={true} statusConfig={statusOptions} options={[{label:'Tất cả', value:'ALL'}, ...statusOptions]}
              onChange={(val: string[]) => { setStatusFilter(val); setLoading(true); }}
            />
          </div>
        </div>
      </div>

      <div className={`space-y-8 pb-20 ${viewMode === 'list' ? 'md:hidden' : ''}`}>
        {displayTrips.length > 0 ? (
            <>
                {renderGroup(groupedTrips.today, 'Hôm nay', CalendarDays, { color: 'text-emerald-600', bgColor: 'bg-emerald-100' })}
                {renderGroup(groupedTrips.thisMonth, 'Trong tháng này', Calendar, { color: 'text-sky-600', bgColor: 'bg-sky-100' })}
                {renderGroup(groupedTrips.future, 'Tương lai', Send, { color: 'text-indigo-600', bgColor: 'bg-indigo-100' })}
                {renderGroup(groupedTrips.past, 'Lịch sử', History, { color: 'text-slate-500', bgColor: 'bg-slate-100' })}
            </>
        ) : (
            <div className="py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                <Car size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-xs font-bold text-slate-400 uppercase">Không tìm thấy chuyến xe nào</p>
            </div>
        )}
      </div>
    </div>
  );
};
export default TripManagement;
