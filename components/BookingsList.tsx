
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Clock, MapPin, Trash2, Map as MapIcon, Navigation, ExternalLink, 
  Calendar, AlertCircle, XCircle, Loader2, CheckCircle2, ArrowUpDown, Search, RefreshCcw, Car, ArrowRight, Ban, Phone, Ticket, ShoppingBag, ListChecks, FileText, User, LayoutGrid, LayoutList, Star, Sparkles, Radio, Users, Zap, Filter, ClipboardList, Info, ChevronDown, Check, CalendarDays, Send, History
} from 'lucide-react';
import { Booking, Trip, TripStatus, Profile } from '../types'; 
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown, getVehicleConfig, getTripStatusDisplay, statusFilterOptions } from './SearchTrips';
import { TripStatusSelector } from './TripManagement';

interface BookingsListProps {
  bookings: Booking[];
  trips: Trip[];
  profile: Profile | null;
  onRefresh?: () => void;
  onViewTripDetails: (trip: Trip) => void;
  forcedMode?: 'BOOKINGS' | 'MY_POSTS'; // New prop
  showAlert: (config: any) => void;
}

const bookingStatusOptions = [
  { label: 'Chờ duyệt', value: 'PENDING', style: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock },
  { label: 'Xác nhận', value: 'CONFIRMED', style: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
  { label: 'Huỷ', value: 'CANCELLED', style: 'text-rose-600 bg-rose-50 border-rose-100', icon: XCircle }, 
  { label: 'Hết thời hạn', value: 'EXPIRED', style: 'text-slate-600 bg-slate-100 border-slate-200', icon: Ban },
  { label: 'Đã đón', value: 'PICKED_UP', style: 'text-cyan-600 bg-cyan-50 border-cyan-100', icon: MapPin },
  { label: 'Đang đi', value: 'ON_BOARD', style: 'text-blue-600 bg-blue-50 border-blue-100', icon: Radio },
];

// Section Header Component
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

// Local Dropdown for Passenger to Cancel
const PassengerBookingStatusSelector = ({ value, onChange, disabled }: { value: string, onChange: (status: string) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentStatus = bookingStatusOptions.find(s => s.value === value) || bookingStatusOptions[0];
  const cancelOption = bookingStatusOptions.find(s => s.value === 'CANCELLED');

  const canCancel = !disabled && (value === 'PENDING' || value === 'CONFIRMED') && !!cancelOption;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button" 
        disabled={!canCancel} 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold z-10 transition-all ${currentStatus.style} ${!canCancel ? 'opacity-90 cursor-default' : 'hover:brightness-95 cursor-pointer shadow-sm hover:shadow'}`}
      >
        <currentStatus.icon size={10} />
        <span className="truncate">{currentStatus.label}</span>
        {canCancel && <ChevronDown size={8} className={`transition-transform duration-300 ml-0.5 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>
      
      {isOpen && canCancel && cancelOption && (
        <div className="absolute top-full mt-1 left-0 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-[999] p-1 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
          <div className="space-y-0.5">
             <div className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 text-slate-500 cursor-default opacity-70">
                <div className="flex items-center gap-2"><currentStatus.icon size={10} /> <span className="text-[10px] font-bold">{currentStatus.label}</span></div>
                <Check size={10} className="text-emerald-500" />
             </div>
             <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange('CANCELLED'); setIsOpen(false); }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-all hover:bg-rose-50 text-rose-600"
             >
                <div className="flex items-center gap-2"><cancelOption.icon size={10} /> <span className="text-[10px] font-bold">{cancelOption.label}</span></div>
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

const BookingsList: React.FC<BookingsListProps> = ({ bookings, trips, profile, onRefresh, onViewTripDetails, forcedMode, showAlert }) => {
  const [viewMode, setViewMode] = useState<'BOOKINGS' | 'MY_POSTS'>(forcedMode || 'BOOKINGS');
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('grid'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (forcedMode) {
      setViewMode(forcedMode);
      setStatusFilter(['ALL']);
    }
  }, [forcedMode]);

  const getTripFromBooking = (booking: any): Trip | null => {
    if (!booking) return null;
    const enrichedTrip = trips.find(t => t.id === booking.trip_id);
    if (enrichedTrip) return enrichedTrip;
    let tripData = booking.trips;
    if (Array.isArray(tripData) && tripData.length > 0) tripData = tripData[0];
    return tripData;
  };

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const extractLocations = (note?: string) => {
    if (!note) return { pickup: null, dropoff: null };
    const pickupMatch = note.match(/📍 Đón: (.*)/);
    const dropoffMatch = note.match(/🏁 Trả: (.*)/);
    return {
      pickup: pickupMatch ? pickupMatch[1].trim() : null,
      dropoff: dropoffMatch ? dropoffMatch[1].trim() : null
    };
  };

  const filteredBookings = useMemo(() => {
    const searchNormalized = searchTerm.toLowerCase().trim();
    return bookings.filter(booking => {
      const trip = getTripFromBooking(booking);
      const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
      const tripCode = trip?.trip_code || (trip?.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '');
      const route = trip ? `${trip.origin_name} ${trip.dest_name}`.toLowerCase() : "";
      const { pickup, dropoff } = extractLocations(booking.note);
      const specificRoute = `${pickup || ''} ${dropoff || ''}`.toLowerCase();

      const matchesSearch = bookingCode.includes(searchTerm.toUpperCase()) || 
                            tripCode.includes(searchTerm.toUpperCase()) ||
                            route.includes(searchNormalized) ||
                            specificRoute.includes(searchNormalized);
                            
      const matchesStatus = statusFilter.includes('ALL') || statusFilter.includes(booking.status);
      return matchesSearch && matchesStatus;
    });
  }, [bookings, trips, searchTerm, statusFilter]);

  const sortedBookings = useMemo(() => {
    let sorted = [...filteredBookings];
    sorted.sort((a: any, b: any) => {
      if (sortOrder === 'NEWEST') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'DEPARTURE_ASC') {
        const tripA = getTripFromBooking(a);
        const tripB = getTripFromBooking(b);
        const timeA = tripA?.departure_time ? new Date(tripA.departure_time).getTime() : 0;
        const timeB = tripB?.departure_time ? new Date(tripB.departure_time).getTime() : 0;
        return timeA - timeB;
      }
      if (sortOrder === 'PRICE_DESC') return b.total_price - a.total_price;
      return 0;
    });
    return sorted;
  }, [filteredBookings, sortOrder, trips]);

  const myPosts = useMemo(() => {
    if (!profile) return [];
    const searchNormalized = searchTerm.toLowerCase().trim();
    let posts = trips.filter(t => t.driver_id === profile.id);
    posts = posts.filter(trip => {
       const tripCode = trip.trip_code || `T${trip.id.substring(0, 5).toUpperCase()}`;
       const route = `${trip.origin_name} ${trip.dest_name}`.toLowerCase();
       const matchesSearch = tripCode.includes(searchTerm.toUpperCase()) || route.includes(searchNormalized);
       const matchesStatus = statusFilter.includes('ALL') || statusFilter.includes(trip.status);
       return matchesSearch && matchesStatus; 
    });
    posts.sort((a, b) => {
       if (sortOrder === 'NEWEST') return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
       if (sortOrder === 'DEPARTURE_ASC') return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
       return 0;
    });
    return posts;
  }, [trips, profile, searchTerm, sortOrder, statusFilter]);

  // Grouping Logic
  const groupedData = useMemo(() => {
    const today: any[] = [];
    const thisMonth: any[] = [];
    const future: any[] = [];
    const past: any[] = [];
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const items = viewMode === 'BOOKINGS' ? sortedBookings : myPosts;

    for (const item of items) {
      let trip = viewMode === 'BOOKINGS' ? getTripFromBooking(item) : (item as Trip);
      if (!trip) continue;

      const departureDate = new Date(trip.departure_time);
      
      if (trip.status === TripStatus.COMPLETED) {
        past.push(item);
        continue;
      }

      if (departureDate < startOfToday) {
        past.push(item);
      } else if (departureDate >= startOfToday && departureDate <= endOfToday) {
        today.push(item);
      } else if (departureDate > endOfToday && departureDate <= endOfMonth) {
        thisMonth.push(item);
      } else {
        future.push(item);
      }
    }
    
    // Sort past items in reverse chronological
    past.sort((a, b) => {
        const timeA = viewMode === 'BOOKINGS' ? getTripFromBooking(a)?.departure_time : (a as Trip).departure_time;
        const timeB = viewMode === 'BOOKINGS' ? getTripFromBooking(b)?.departure_time : (b as Trip).departure_time;
        return new Date(timeB || '').getTime() - new Date(timeA || '').getTime();
    });

    return { today, thisMonth, future, past };
  }, [sortedBookings, myPosts, viewMode]);

  const handleCancelBooking = async (bookingId: string) => {
    showAlert({
      title: 'Xác nhận hủy đặt chỗ',
      message: 'Bạn có chắc chắn muốn hủy yêu cầu đặt chỗ này không? Hành động này không thể hoàn tác.',
      variant: 'danger',
      confirmText: 'Đồng ý hủy',
      cancelText: 'Không',
      onConfirm: async () => {
        setActionLoading(bookingId);
        try {
          const { data: bookingToCancel, error: fetchBookingError } = await supabase.from('bookings').select('*, trips(id, available_seats, status, departure_time)').eq('id', bookingId).single();
          if (fetchBookingError) throw fetchBookingError;

          const trip = Array.isArray(bookingToCancel.trips) ? bookingToCancel.trips[0] : bookingToCancel.trips;
          if (new Date(trip.departure_time) < new Date() || trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
            showAlert({ title: 'Thao tác thất bại', message: 'Không thể hủy đơn của chuyến đã kết thúc, đang chạy hoặc đã bị hủy.', variant: 'warning', confirmText: 'Đã hiểu' });
            return;
          }

          await supabase.from('bookings').update({ status: 'CANCELLED' }).eq('id', bookingId);
          
          if (bookingToCancel.status === 'CONFIRMED') {
            const newAvailableSeats = trip.available_seats + bookingToCancel.seats_booked;
            let newTripStatus = trip.status;
            if (trip.status === TripStatus.FULL && newAvailableSeats > 0) newTripStatus = TripStatus.PREPARING; 
            await supabase.from('trips').update({ available_seats: newAvailableSeats, status: newTripStatus }).eq('id', trip.id);
          }
          if (onRefresh) onRefresh();
        } catch (err: any) { 
          showAlert({ title: 'Lỗi', message: err.message, variant: 'danger', confirmText: 'Đóng' });
        } finally { 
          setActionLoading(null); 
        }
      },
    });
  };

  const handleUpdateTripStatus = async (tripId: string, newStatus: TripStatus) => {
    setActionLoading(tripId);
    try {
      const { error } = await supabase.from('trips').update({ status: newStatus }).eq('id', tripId);
      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err: any) { 
      showAlert({ title: 'Lỗi', message: err.message, variant: 'danger', confirmText: 'Đóng' });
    } finally { 
      setActionLoading(null); 
    }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: any) => (
    <th style={{ width }} className={`px-4 py-3 text-[10px] font-bold text-slate-500 tracking-tight cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>{label} <ArrowUpDown size={8} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-40'}`} /></div>
    </th>
  );

  const renderBookingCard = (order: any) => {
    const trip = getTripFromBooking(order);
    if (!trip) return null;
    const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
    const depTime = trip.departure_time ? new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const depDate = trip.departure_time ? new Date(trip.departure_time).toLocaleDateString('vi-VN') : '--/--/----';
    const arrTime = trip.arrival_time ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const arrDate = trip.arrival_time ? new Date(trip.arrival_time).toLocaleDateString('vi-VN') : '--/--/----';
    const isExpiredOrCancelled = order.status === 'EXPIRED' || order.status === 'CANCELLED';
    const driverName = trip.driver_name || 'Đang cập nhật';
    const vehicleRaw = trip.vehicle_info || '';
    const vehicleParts = vehicleRaw.split(' (');
    const licensePlate = vehicleParts[1] ? vehicleParts[1].replace(')', '') : '';
    const isOngoing = trip.status === TripStatus.ON_TRIP;
    const isUrgent = trip.status === TripStatus.URGENT;
    const isPreparing = trip.status === TripStatus.PREPARING;
    const isCompleted = trip.status === TripStatus.COMPLETED;
    const createdAtDate = order.created_at ? new Date(order.created_at) : null;
    const createdAtTime = createdAtDate ? createdAtDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const createdAtDay = createdAtDate ? createdAtDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--/--';
    const isRequest = trip.is_request;

    const avatarClass = isRequest ? 'bg-orange-600 shadow-orange-100' : 'bg-indigo-600 shadow-indigo-100';
    const labelClass = isRequest ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100';
    const labelText = isRequest ? 'Khách tìm xe' : 'Tài xế tìm khách';
    const LabelIcon = isRequest ? Users : Car;
    const progressBarClass = isRequest ? 'bg-orange-500' : 'bg-indigo-500';
    const priceClass = isRequest ? 'text-orange-600' : 'text-indigo-600';
    const seatLabel = isRequest ? 'Yêu cầu' : `Đặt ${order.seats_booked}/${trip.seats} ghế`;

    const { pickup, dropoff } = extractLocations(order.note);
    const displayPickup = pickup || trip.origin_name;
    const displayDropoff = dropoff || trip.dest_name;
    const isLoading = actionLoading === order.id;

    return (
      <div key={order.id} className={`bg-white p-4 rounded-[24px] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative flex flex-col justify-between ${isOngoing ? 'border-blue-200 bg-blue-50/20' : isUrgent ? 'border-rose-400 bg-rose-50/20' : isPreparing ? 'border-amber-300 bg-amber-50/10' : 'border-slate-100'} ${isExpiredOrCancelled ? 'opacity-80' : ''}`} onClick={() => onViewTripDetails(trip)}>
        <div>
          <div className="flex items-center justify-between mb-3">
            <div onClick={(e) => e.stopPropagation()} className="z-20">
              {isLoading ? (
                <div className="flex items-center justify-center py-1 bg-slate-50 rounded-lg border border-slate-100 w-24">
                  <Loader2 className="animate-spin text-indigo-500" size={12} />
                </div>
              ) : (
                <PassengerBookingStatusSelector 
                  value={order.status} 
                  onChange={(newStatus) => {
                    if (newStatus === 'CANCELLED') handleCancelBooking(order.id);
                  }} 
                  disabled={isExpiredOrCancelled || isOngoing || isCompleted} 
                />
              )}
            </div>
            <div className="flex flex-col items-center"><span className="text-[8px] font-bold text-slate-500">{seatLabel}</span><div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5"><div className={`h-full rounded-full transition-all duration-500 ${progressBarClass}`} style={{ width: '100%' }}></div></div></div>
            <p className={`text-sm font-bold tracking-tight ${priceClass}`}>{new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</p>
          </div>
          <div className="flex flex-col gap-2.5 items-start mb-3 min-h-[30px] justify-center">
            <div className="flex items-center gap-2.5 w-full"><div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg shrink-0 ${avatarClass}`}>{driverName?.charAt(0)}</div><h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate flex-1">{driverName}</h4></div>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap"><span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate flex-shrink-0 min-w-0 ${labelClass}`}><LabelIcon size={9} /> {labelText}</span>{licensePlate && <div className="inline-flex items-center bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm self-start whitespace-nowrap flex-shrink-0 min-w-0 max-w-full"><CopyableCode code={licensePlate} className="text-[9px] font-black uppercase tracking-wider" label={licensePlate} /></div>}</div>
          </div>
          <div className="space-y-2.5 mb-3 relative">
            <div className="absolute left-[7px] top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-indigo-100/70 via-slate-100/70 to-emerald-100/70"></div>
            <div className="flex items-center gap-3 relative z-10"><div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-indigo-100/70 border-indigo-200/50 shadow-indigo-200/50"><div className="w-2 h-2 rounded-full shadow-inner bg-indigo-600"></div></div><div className="flex-1 min-w-0"><p className="font-bold text-slate-700 text-[12px] truncate leading-tight" title={displayPickup}>{displayPickup}</p><div className="flex items-center gap-1.5 mt-1"><div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border shadow-sm bg-indigo-50 text-indigo-600 border-indigo-100"><Clock size={8} /> <span className="text-[9px] font-black">{depTime}</span></div><div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /> <span className="text-[9px] font-bold">{depDate}</span></div></div></div></div>
            <div className="flex items-center gap-3 relative z-10"><div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-emerald-100/70 border-emerald-200/50 shadow-emerald-200/50"><div className="w-2 h-2 rounded-full shadow-inner bg-emerald-600"></div></div><div className="flex-1 min-w-0"><p className="font-bold text-slate-700 text-[12px] truncate leading-tight" title={displayDropoff}>{displayDropoff}</p><div className="flex items-center gap-1.5 mt-1"><div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm"><Clock size={8} /> <span className="text-[9px] font-black">{arrTime}</span></div><div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /> <span className="text-[9px] font-bold">{arrDate}</span></div></div></div></div>
          </div>
        </div>
        <div className="grid grid-cols-3 items-center pt-3 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-2"><CopyableCode code={bookingCode} className="text-[9px] font-black bg-cyan-50 text-cyan-700 px-2 py-0.5 border border-cyan-100 rounded uppercase" label={bookingCode} /></div>
          <div className="flex justify-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); onViewTripDetails(trip); }} className="px-2 py-1 rounded-lg transition-all border shadow-sm flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"><Info size={10} /><span className="text-[10px] font-bold">Chi tiết</span></button>
          </div>
          <div className="flex justify-end items-center gap-1 text-[9px] font-bold text-slate-400"><Clock size={10} className="shrink-0" /><span>{createdAtTime} {createdAtDay}</span></div>
        </div>
      </div>
    );
  };

  const renderPostCard = (trip: any) => {
    const isRequest = trip.is_request;
    const bookedSeats = trip.seats - trip.available_seats;
    const fillPercent = trip.seats > 0 ? (bookedSeats / trip.seats) * 100 : 0;
    let fillBarColor: string;
    if (isRequest) {
      const bookingsCount = trip.bookings_count || 0;
      fillBarColor = bookingsCount === 0 ? 'bg-slate-200' : bookingsCount === 1 ? 'bg-emerald-500' : 'bg-rose-500';
    } else {
      if (bookedSeats <= 0) fillBarColor = 'bg-slate-200';
      else if (fillPercent < 50) fillBarColor = 'bg-emerald-500';
      else if (fillPercent < 100) fillBarColor = 'bg-amber-500';
      else fillBarColor = 'bg-rose-500';
    }
    
    const depTime = new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
    const depDate = new Date(trip.departure_time).toLocaleDateString('vi-VN');
    const arrivalDateObj = trip.arrival_time ? new Date(trip.arrival_time) : null;
    const arrTime = arrivalDateObj ? arrivalDateObj.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const arrDate = arrivalDateObj ? arrivalDateObj.toLocaleDateString('vi-VN') : '--/--/----';
    const tripCode = trip.trip_code || `T${trip.id.substring(0, 5).toUpperCase()}`;
    const isCompleted = trip.status === TripStatus.COMPLETED;
    const isCancelled = trip.status === TripStatus.CANCELLED;
    const isOngoing = trip.status === TripStatus.ON_TRIP;
    const createdAt = trip.created_at ? new Date(trip.created_at) : null;
    const createdAtTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const createdAtDay = createdAt ? createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--/--';
    
    const vehicleConfig = getVehicleConfig(trip.vehicle_info);
    const VIcon = isRequest ? Users : vehicleConfig.icon;

    return (
      <div key={trip.id} className={`bg-white p-4 rounded-[24px] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full group ${isOngoing ? 'border-blue-200 bg-blue-50/20' : 'border-slate-100'} ${isCompleted || isCancelled ? 'opacity-80' : ''}`} onClick={() => onViewTripDetails(trip)}>
          <div>
            <div className="flex items-center justify-between mb-3">
                <div onClick={(e) => e.stopPropagation()} className="z-20">
                  {actionLoading === trip.id ? (
                      <div className="flex items-center justify-center py-1 bg-slate-50 rounded-lg border border-slate-100 w-28"><Loader2 className="animate-spin text-indigo-500" size={12} /></div>
                  ) : (
                      <TripStatusSelector value={trip.status} disabled={isCompleted || isCancelled} onChange={(newStatus) => handleUpdateTripStatus(trip.id, newStatus)} />
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-bold text-slate-500">{isRequest ? `${trip.seats === 7 ? 'Bao xe' : `${trip.seats} ghế`} (${trip.bookings_count || 0} xe nhận)` : `Còn ${trip.available_seats}/${trip.seats} ghế`}</span>
                  <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                    <div className={`h-full rounded-full transition-all duration-500 ${fillBarColor}`} style={{ width: isRequest ? '100%' : `${fillPercent}%` }}></div>
                  </div>
                </div>
                <p className={`text-sm font-bold tracking-tight ${isRequest ? 'text-orange-600' : 'text-indigo-600'}`}>{trip.price === 0 ? 'Thoả thuận' : new Intl.NumberFormat('vi-VN').format(trip.price) + 'đ'}</p>
            </div>

            <div className="flex flex-col gap-2.5 items-start mb-3 min-h-[30px] justify-center">
                <div className="flex items-center gap-1.5 w-full">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 ${isRequest ? 'bg-orange-600' : 'bg-indigo-600'}`}>{trip.driver_name?.charAt(0)}</div>
                  <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate flex-1">{trip.driver_name}</h4>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate ${isRequest ? 'bg-orange-50 text-orange-600 border-orange-100' : vehicleConfig.style}`}><VIcon size={9} /> {isRequest ? (trip.vehicle_info || 'Cần tìm xe') : trip.vehicle_info.split(' (')[0]}</span>
                </div>
            </div>

            <div className="space-y-2.5 mb-3 relative">
                <div className="absolute left-[7px] top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-indigo-100/70 via-slate-100/70 to-emerald-100/70"></div>
                <div className="flex items-center gap-3 relative z-10"><div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-indigo-100/70 border-indigo-200/50 shadow-indigo-200/50"><div className="w-2 h-2 rounded-full shadow-inner bg-indigo-600"></div></div><div className="flex-1"><p className="font-bold text-slate-700 text-[12px] truncate leading-tight">{trip.origin_name}</p><div className="flex items-center gap-1.5 mt-1"><div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border shadow-sm bg-indigo-50 text-indigo-600 border-indigo-100"><Clock size={8} /> <span className="text-[9px] font-black">{depTime}</span></div><div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /> <span className="text-[9px] font-bold">{depDate}</span></div></div></div></div>
                <div className="flex items-center gap-3 relative z-10"><div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-emerald-100/70 border-emerald-200/50 shadow-emerald-200/50"><div className="w-2 h-2 rounded-full shadow-inner bg-emerald-600"></div></div><div className="flex-1"><p className="font-bold text-slate-700 text-[12px] truncate leading-tight">{trip.dest_name}</p><div className="flex items-center gap-1.5 mt-1"><div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm"><Clock size={8} /> <span className="text-[9px] font-black">{arrTime}</span></div><div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /> <span className="text-[9px] font-bold">{arrDate}</span></div></div></div></div>
            </div>
          </div>

          <div className="grid grid-cols-3 items-center pt-3 border-t border-slate-100 mt-auto">
            <div className="flex items-center gap-2"><div className="inline-flex items-center bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100 shadow-sm"><CopyableCode code={tripCode} className="text-[9px] font-black" label={tripCode} /></div></div>
            <div className="flex justify-center"><button onClick={(e) => { e.stopPropagation(); onViewTripDetails(trip); }} className="px-2 py-1 rounded-lg transition-all border shadow-sm flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"><Info size={10} /><span className="text-[10px] font-bold">Chi tiết</span></button></div>
            <div className="flex justify-end items-center gap-1 text-[9px] font-bold text-slate-400"><Clock size={10} className="shrink-0" /><span>{createdAtTime} {createdAtDay}</span></div>
          </div>
      </div>
    );
  };

  const renderGroup = (group: any[], title: string, icon: React.ElementType, colors: any, isBooking: boolean) => {
    if (group.length === 0) return null;
    return (
        <section className="space-y-5">
            <SectionHeader icon={icon} title={title} count={group.length} color={colors.color} bgColor={colors.bgColor} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-5">
                {group.map(item => isBooking ? renderBookingCard(item) : renderPostCard(item))}
            </div>
        </section>
    );
  };

  return (
    <div className="space-y-4 animate-slide-up max-w-[1600px] mx-auto">
      {!forcedMode && (
        <div className="flex justify-center mb-2">
           <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex relative z-30 h-[42px]">
              <button 
                 onClick={() => setViewMode('BOOKINGS')}
                 className={`px-5 h-full rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'BOOKINGS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                 <Ticket size={14} /> Vé đã đặt
              </button>
              <button 
                 onClick={() => setViewMode('MY_POSTS')}
                 className={`px-5 h-full rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'MY_POSTS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                 <FileText size={14} /> Tin đã đăng
              </button>
           </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100 p-6 rounded-[32px] shadow-sm space-y-5 backdrop-blur-sm relative z-30 transition-colors">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-3 w-full md:flex-1">
               <div className="relative flex-1 group">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600`} size={16} />
                  <input 
                    type="text" 
                    placeholder={viewMode === 'BOOKINGS' ? "Tìm mã đơn, lộ trình..." : "Tìm mã xe, lộ trình..."}
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 h-[42px] bg-white/80 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50/50" 
                  />
               </div>
               <div className="flex-1 md:w-48 md:flex-none shrink-0">
                  <UnifiedDropdown 
                    label="Sắp xếp" icon={ArrowUpDown} value={sortOrder} width="w-full" showCheckbox={false}
                    options={[
                      { label: 'Mới nhất', value: 'NEWEST' },
                      { label: 'Khởi hành sớm nhất', value: 'DEPARTURE_ASC' },
                      { label: 'Giá cao nhất', value: 'PRICE_DESC' }
                    ]}
                    onChange={setSortOrder}
                  />
               </div>
            </div>
            <div className="hidden md:flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm items-center shrink-0 h-[42px]">
              <button onClick={() => setLayoutMode('list')} className={`p-2 h-full aspect-square flex items-center justify-center rounded-xl transition-all ${layoutMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutList size={18} />
              </button>
              <button onClick={() => setLayoutMode('grid')} className={`p-2 h-full aspect-square flex items-center justify-center rounded-xl transition-all ${layoutMode === 'grid' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-3 w-full">
            <UnifiedDropdown 
              label="Trạng thái" icon={ClipboardList} value={statusFilter} onChange={setStatusFilter} width="w-full lg:w-48" showCheckbox={true}
              isStatus={true}
              statusConfig={viewMode === 'BOOKINGS' ? bookingStatusOptions : statusFilterOptions}
              options={[
                 {label:'Tất cả', value:'ALL'}, 
                 ...(viewMode === 'BOOKINGS' ? bookingStatusOptions : statusFilterOptions)
              ]} 
            />
          </div>
        </div>
      </div>
      
      {viewMode === 'BOOKINGS' && (
        <>
          {/* Grid View with Groups */}
          <div className={`space-y-8 ${layoutMode === 'list' ? 'md:hidden' : ''}`}>
             {sortedBookings.length > 0 ? (
                <>
                  {renderGroup(groupedData.today, 'Hôm nay', CalendarDays, { color: 'text-emerald-600', bgColor: 'bg-emerald-100' }, true)}
                  {renderGroup(groupedData.thisMonth, 'Trong tháng này', Calendar, { color: 'text-sky-600', bgColor: 'bg-sky-100' }, true)}
                  {renderGroup(groupedData.future, 'Tương lai', Send, { color: 'text-indigo-600', bgColor: 'bg-indigo-100' }, true)}
                  {renderGroup(groupedData.past, 'Lịch sử', History, { color: 'text-slate-500', bgColor: 'bg-slate-100' }, true)}
                </>
             ) : (
                <div className="col-span-full p-10 text-center bg-white rounded-[24px] border border-dashed border-slate-200">
                   <Ticket size={32} className="mx-auto text-slate-300 mb-2" />
                   <p className="text-xs font-bold text-slate-400">Chưa có lịch sử chuyến đi</p>
                </div>
             )}
          </div>

          {/* Desktop Table View (Hidden in Grid Mode) */}
          <div className={`hidden md:${layoutMode === 'list' ? 'block' : 'hidden'} bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden`}>
              <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="bg-white border-b border-slate-100 sticky top-0 z-10">
                  <SortHeader label="Mã đơn & Thời gian" width="14%" />
                  <SortHeader label="Hành khách" width="18%" />
                  <SortHeader label="Trạng thái đơn" width="16%" textAlign="text-center" />
                  <SortHeader label="Điểm đón" width="18%" />
                  <SortHeader label="Điểm đến" width="18%" />
                  <SortHeader label="Giá" width="10%" textAlign="text-right" />
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {sortedBookings.length > 0 ? sortedBookings.map((booking: any) => {
                    const trip = getTripFromBooking(booking);
                    if (!trip) return null;
                    const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
                    const isLoading = actionLoading === booking.id;
                    const createdAt = booking.created_at ? new Date(booking.created_at) : null;
                    const bTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                    const bDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';
                    const { pickup, dropoff } = extractLocations(booking.note);
                    const displayPickup = pickup || trip.origin_name;
                    const displayDropoff = dropoff || trip.dest_name;
                    const personName = booking.profiles?.full_name || (trip.is_request ? 'Tài xế' : 'Khách vãng lai');
                    const priceColor = trip.is_request ? 'text-indigo-600' : 'text-emerald-600';
                    const displayPhone = booking.passenger_phone ? booking.passenger_phone.replace(/^\+?84/, '0') : 'N/A';
                    const isFinalStatus = booking.status === 'EXPIRED' || booking.status === 'CANCELLED';

                    return (
                        <tr key={booking.id} className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isFinalStatus ? 'opacity-80' : ''}`} onClick={() => onViewTripDetails(trip)}>
                        <td className="px-4 py-4">
                            <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-amber-600">{bTime}</span>
                                <span className="text-[10px] font-bold text-slate-400">{bDate}</span>
                            </div>
                            <div className="inline-flex items-center bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md border border-cyan-200 self-start">
                                <CopyableCode code={bookingCode} className="text-[10px] font-black" label={bookingCode} />
                            </div>
                            </div>
                        </td>
                        <td className="px-4 py-4">
                            <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                                <div className={`h-[22px] w-[22px] rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 border ${trip.is_request ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {personName.charAt(0)}
                                </div>
                                <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{personName}</p>
                                </div>
                            <div className="flex items-center gap-1.5">
                                {booking.passenger_phone && (
                                <a href={`tel:${booking.passenger_phone}`} onClick={(e) => e.stopPropagation()} className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0">
                                    <Phone size={10} />
                                </a>
                                )}
                                <CopyableCode code={booking.passenger_phone || ''} className="text-[10px] font-bold text-indigo-600 truncate" label={displayPhone} />
                            </div>
                            </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                            <div className="w-32 mx-auto" onClick={(e) => e.stopPropagation()}>
                            {isLoading ? (
                                <Loader2 className="animate-spin text-indigo-500" size={14} />
                            ) : (
                                <PassengerBookingStatusSelector 
                                  value={booking.status} 
                                  onChange={(newStatus) => {
                                    if (newStatus === 'CANCELLED') handleCancelBooking(booking.id);
                                  }} 
                                  disabled={isFinalStatus || trip.status === TripStatus.ON_TRIP || trip.status === TripStatus.COMPLETED} 
                                />
                            )}
                            </div>
                        </td>
                        <td className="px-4 py-4">
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[11px] font-bold text-slate-800 truncate leading-tight mt-0.5 pr-1" title={displayPickup}>
                                {displayPickup}
                                </p>
                            </div>
                        </td>
                        <td className="px-4 py-4">
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[11px] font-bold text-emerald-600 truncate leading-tight mt-0.5 pr-1" title={displayDropoff}>
                                {displayDropoff}
                                </p>
                            </div>
                        </td>
                        <td className="px-4 py-4 text-right pr-6">
                            <p className={`text-[11px] font-black ${priceColor}`}>{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</p>
                            <p className="text-[9px] font-bold text-slate-400">{trip.is_request ? `${trip.seats} ghế` : `${booking.seats_booked} ghế`}</p>
                        </td>
                        </tr>
                    );
                  }) : (
                    <tr><td colSpan={6} className="px-6 py-20 text-center italic text-slate-500 text-[11px] font-bold">Chưa có dữ liệu</td></tr>
                  )}
              </tbody>
              </table>
          </div>
        </>
      )}

      {viewMode === 'MY_POSTS' && (
         <div className="space-y-8 pb-20">
            {myPosts.length > 0 ? (
                <>
                  {renderGroup(groupedData.today, 'Hôm nay', CalendarDays, { color: 'text-emerald-600', bgColor: 'bg-emerald-100' }, false)}
                  {renderGroup(groupedData.thisMonth, 'Trong tháng này', Calendar, { color: 'text-sky-600', bgColor: 'bg-sky-100' }, false)}
                  {renderGroup(groupedData.future, 'Tương lai', Send, { color: 'text-indigo-600', bgColor: 'bg-indigo-100' }, false)}
                  {renderGroup(groupedData.past, 'Lịch sử', History, { color: 'text-slate-500', bgColor: 'bg-slate-100' }, false)}
                </>
            ) : (
               <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200"><FileText size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-xs font-bold text-slate-400 uppercase">Bạn chưa đăng tin nào</p></div>
            )}
         </div>
      )}
    </div>
  );
};
export default BookingsList;
