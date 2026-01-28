import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Search, CheckCircle2, XCircle, Clock, RefreshCcw, Loader2, ArrowUpDown, Navigation, Car, User, ArrowRight, Phone, DollarSign, ChevronDown, Check, X, AlertCircle, AlertTriangle, Timer, Ban, Calendar, Filter, Hash, Play, MapPin, LayoutList, LayoutGrid, Star, ClipboardList, Info, Users, Layers, MessageSquareQuote, CalendarDays, Send, History
} from 'lucide-react';
import { Booking, Profile, Trip, TripStatus } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown, getVehicleConfig } from './SearchTrips';

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
};

export const statusOptions = [
  { label: 'Chờ duyệt', value: 'PENDING', style: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock },
  { label: 'Xác nhận', value: 'CONFIRMED', style: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
  { label: 'Đã đón', value: 'PICKED_UP', style: 'text-cyan-600 bg-cyan-50 border-cyan-100', icon: MapPin },
  { label: 'Đang trong chuyến', value: 'ON_BOARD', style: 'text-blue-600 bg-blue-50 border-blue-100', icon: Play },
  { label: 'Huỷ', value: 'CANCELLED', style: 'text-rose-600 bg-rose-50 border-rose-100', icon: XCircle },
  { label: 'Hết thời hạn', value: 'EXPIRED', style: 'text-slate-500 bg-slate-100 border-slate-200', icon: Ban },
];

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

export const TableSkeleton = ({ rows = 5, cols = 6 }: { rows?: number, cols?: number }) => (
  <tbody className="animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-slate-50">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-4 py-6">
            <div className="h-3 bg-slate-100 rounded w-3/4"></div>
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

export const BookingStatusSelector = ({ value, onChange, disabled }: { value: string, onChange: (status: string) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentStatus = statusOptions.find(s => s.value === value) || statusOptions[0];
  
  const getAvailableOptions = () => {
    return statusOptions.filter(opt => {
      if (opt.value === 'EXPIRED' || opt.value === 'ON_BOARD') return false;
      if (opt.value === 'PICKED_UP') return value === 'CONFIRMED';
      return true;
    });
  };

  const availableOptions = getAvailableOptions();
  const filteredOptions = availableOptions.filter(opt => removeAccents(opt.label).includes(removeAccents(statusSearch)));

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

  const isLocked = disabled || value === 'EXPIRED' || value === 'ON_BOARD' || value === 'CANCELLED';

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button" 
        disabled={isLocked}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold z-10 transition-all ${currentStatus.style} ${isLocked ? 'opacity-80 cursor-not-allowed' : 'hover:brightness-95'}`}
      >
        <currentStatus.icon size={10} />
        <span className="truncate">{currentStatus.label}</span>
        {!isLocked && <ChevronDown size={8} className={`transition-transform duration-300 ml-0.5 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>
      
      {isOpen && !isLocked && (
        <div className="absolute top-full mt-1 left-0 w-40 bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 z-[999] p-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
          <div className="relative mb-1.5 px-1 pt-1">
            <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" autoFocus placeholder="Tìm..." value={statusSearch}
              onChange={(e) => setStatusSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border-none rounded-lg text-[10px] font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar p-0.5">
            {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
              <button key={opt.value} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(opt.value); setIsOpen(false); setStatusSearch(''); }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all ${value === opt.value ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-600'}`}>
                <div className="flex items-center gap-2"><opt.icon size={10} className={value === opt.value ? 'text-white' : opt.style.split(' ')[0]} /> <span className="text-[10px] font-bold">{opt.label}</span></div>
                {value === opt.value && <Check size={10} className="text-white" />}
              </button>
            )) : (
              <div className="p-3 text-center text-[9px] text-slate-400 font-bold italic">Không có lựa chọn</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface OrderManagementProps {
  profile: Profile | null;
  trips: Trip[];
  onRefresh: () => void;
  onViewTripDetails: (trip: Trip) => void;
  showAlert: (config: any) => void;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

const OrderManagement: React.FC<OrderManagementProps> = ({ profile, trips, onRefresh, onViewTripDetails, showAlert }) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [timeFilter, setTimeFilter] = useState<string[]>(['ALL']);
  const [vehicleFilter, setVehicleFilter] = useState<string[]>(['ALL']);
  const [requestTypeFilter, setRequestTypeFilter] = useState<'ALL' | 'BOOKING' | 'ACCEPTANCE'>('ALL'); 
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchBookings(); }, [profile]);

  const fetchBookings = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let query = supabase.from('bookings').select(`*, trips(*, driver_profile:profiles(id, full_name, phone)), profiles:passenger_id(id, full_name, phone)`);
      if (profile.role === 'driver') {
        const { data: myTrips } = await supabase.from('trips').select('id').eq('driver_id', profile.id);
        const myTripIds = myTrips?.map(t => t.id) || [];
        if (myTripIds.length > 0) query = query.in('trip_id', myTripIds);
        else { setAllBookings([]); setLoading(false); return; }
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setAllBookings(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  // Helper to parse locations from note
  const extractLocations = (note?: string) => {
    if (!note) return { pickup: null, dropoff: null };
    const pickupMatch = note.match(/📍 Đón: (.*)/);
    const dropoffMatch = note.match(/🏁 Trả: (.*)/);
    return {
      pickup: pickupMatch ? pickupMatch[1].trim() : null,
      dropoff: dropoffMatch ? dropoffMatch[1].trim() : null
    };
  };

  const filteredOrders = useMemo(() => {
    const searchNormalized = removeAccents(searchTerm);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    let filtered = allBookings.filter(order => {
      const trip = order.trips;
      const createdAt = new Date(order.created_at);
      
      const isRequest = trip?.is_request; // True = Driver Accept (Passenger Post), False = Booking (Driver Post)

      if (requestTypeFilter === 'BOOKING' && isRequest) return false;
      if (requestTypeFilter === 'ACCEPTANCE' && !isRequest) return false;

      const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
      const tripCode = trip?.trip_code || (trip?.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '');
      const passengerName = order.profiles?.full_name || '';
      const driverName = trip?.driver_profile?.full_name || '';
      const route = `${trip?.origin_name} ${trip?.dest_name}`;
      
      // Also search in specific address
      const { pickup, dropoff } = extractLocations(order.note);
      const specificRoute = `${pickup || ''} ${dropoff || ''}`;

      const matchesSearch = (order.passenger_phone && order.passenger_phone.includes(searchTerm)) || 
                            removeAccents(passengerName).includes(searchNormalized) || 
                            removeAccents(driverName).includes(searchNormalized) || 
                            removeAccents(bookingCode).includes(searchNormalized) || 
                            removeAccents(tripCode).includes(searchNormalized) || 
                            removeAccents(route).includes(searchNormalized) ||
                            removeAccents(specificRoute).includes(searchNormalized);
      
      const matchesStatus = statusFilter.includes('ALL') || statusFilter.includes(order.status);

      let matchesTime = timeFilter.includes('ALL');
      if (!matchesTime) {
        if (timeFilter.includes('TODAY') && createdAt >= today) matchesTime = true;
        if (timeFilter.includes('YESTERDAY') && (createdAt >= yesterday && createdAt < today)) matchesTime = true;
        if (timeFilter.includes('WEEK') && createdAt >= weekAgo) matchesTime = true;
      }

      const matchesVehicle = vehicleFilter.includes('ALL') || (trip?.vehicle_info && vehicleFilter.some(v => trip.vehicle_info.includes(v)));

      return matchesSearch && matchesStatus && matchesTime && matchesVehicle;
    });

    filtered.sort((a: any, b: any) => {
      if (sortOrder === 'NEWEST') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'OLDEST') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOrder === 'DEPARTURE_ASC') {
        const timeA = a.trips?.departure_time ? new Date(a.trips.departure_time).getTime() : 0;
        const timeB = b.trips?.departure_time ? new Date(b.trips.departure_time).getTime() : 0;
        return timeA - timeB;
      }
      if (sortOrder === 'PRICE_DESC') return b.total_price - a.total_price;
      if (sortOrder === 'PRICE_ASC') return a.total_price - b.total_price;
      return 0;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [allBookings, searchTerm, statusFilter, timeFilter, vehicleFilter, requestTypeFilter, sortOrder, sortConfig]);

  // Grouping Logic
  const groupedOrders = useMemo(() => {
    const today: any[] = [];
    const thisMonth: any[] = [];
    const future: any[] = [];
    const past: any[] = [];
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    // Start of current month to determine "This Month" vs "Past"
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const order of filteredOrders) {
      const trip = order.trips;
      if (!trip) continue;
      
      // Logic changed: Group by booking creation time (order.created_at)
      const bookingDate = new Date(order.created_at);
      
      // If trip is completed/cancelled, or the booking itself is cancelled/expired, move to history/past
      if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED || order.status === 'CANCELLED' || order.status === 'EXPIRED') {
        past.push(order);
        continue;
      }

      if (bookingDate >= startOfToday && bookingDate <= endOfToday) {
        today.push(order);
      } else if (bookingDate >= startOfMonth && bookingDate < startOfToday) {
        // Booked earlier this month (but not today)
        thisMonth.push(order);
      } else if (bookingDate < startOfMonth) {
        // Booked before this month
        past.push(order);
      } else {
        // Fallback (e.g. slight future drift) -> Today
        today.push(order);
      }
    }
    
    // Sort logic remains inherited from filteredOrders (default is Created At NEWEST)
    // No need to re-sort explicitly unless needed

    return { today, thisMonth, future, past };
  }, [filteredOrders]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    setActionLoading(bookingId);
    try {
      const { data: currentBooking, error: fetchBookingError } = await supabase
        .from('bookings')
        .select('*, trips(id, available_seats, status, departure_time)')
        .eq('id', bookingId)
        .single();

      if (fetchBookingError) throw fetchBookingError;
      if (!currentBooking || !currentBooking.trips) {
        throw new Error('Không tìm thấy thông tin đặt chỗ hoặc chuyến xe.');
      }

      const trip = Array.isArray(currentBooking.trips) ? currentBooking.trips[0] : currentBooking.trips;
      const seatsBooked = currentBooking.seats_booked;
      const oldBookingStatus = currentBooking.status;
      let newAvailableSeats = trip.available_seats;
      let newTripStatus = trip.status;
      const now = new Date();
      const departureTime = new Date(trip.departure_time);

      if (departureTime < now || trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
        showAlert({
            title: 'Chuyến xe không hợp lệ',
            message: 'Không thể thay đổi trạng thái đơn hàng cho chuyến xe đã khởi hành, đã hoàn thành hoặc đã bị hủy.',
            variant: 'warning',
            confirmText: 'Đã hiểu'
        });
        setActionLoading(null);
        return;
      }

      // LOGIC: Only deduct seats when CONFIRMED.
      // If moving TO CONFIRMED from any other status -> Deduct
      if (newStatus === 'CONFIRMED' && oldBookingStatus !== 'CONFIRMED') {
        newAvailableSeats = trip.available_seats - seatsBooked;
      } 
      // If moving FROM CONFIRMED to any other status -> Restore
      else if (oldBookingStatus === 'CONFIRMED' && newStatus !== 'CONFIRMED') {
        newAvailableSeats = trip.available_seats + seatsBooked;
      }
      
      if (newAvailableSeats < 0) {
        showAlert({
            title: 'Không đủ chỗ trống',
            message: 'Không đủ chỗ trống để xác nhận đơn hàng này. Vui lòng kiểm tra lại.',
            variant: 'warning',
            confirmText: 'Đã hiểu'
        });
        setActionLoading(null);
        return;
      }

      if (newAvailableSeats <= 0 && newTripStatus !== TripStatus.FULL) {
        newTripStatus = TripStatus.FULL;
      } else if (newAvailableSeats > 0 && newTripStatus === TripStatus.FULL) {
        const diffMins = Math.floor((departureTime.getTime() - now.getTime()) / 60000);
        if (diffMins <= 60 && diffMins > 0) newTripStatus = TripStatus.URGENT;
        else newTripStatus = TripStatus.PREPARING;
      }

      const { error: updateBookingError } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
      if (updateBookingError) throw updateBookingError;

      if (newAvailableSeats !== trip.available_seats || newTripStatus !== trip.status) {
        const { error: updateTripError } = await supabase.from('trips').update({ available_seats: newAvailableSeats, status: newTripStatus }).eq('id', trip.id);
        if (updateTripError) throw updateTripError;
      }
      
      setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      onRefresh();
    } catch (err: any) { 
        console.error(err); 
        showAlert({ title: 'Cập nhật thất bại', message: err.message, variant: 'danger', confirmText: 'Đóng' });
    } finally { 
        setActionLoading(null); 
    }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: any) => (
    <th style={{ width }} className={`px-4 py-3 text-[10px] font-bold text-slate-500 tracking-tight cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>{label} <ArrowUpDown size={8} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} /></div>
    </th>
  );

  const renderOrderCard = (order: any) => {
    const trip = order.trips;
    const isRequest = trip?.is_request; // Check if it was a passenger request
    const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
    const isFinalStatus = order.status === 'EXPIRED' || order.status === 'CANCELLED';
    
    // Display Logic based on Request Type
    const personName = isRequest ? (order.profiles?.full_name || 'Tài xế nhận') : (order.profiles?.full_name || 'Khách vãng lai');
    const personLabel = isRequest ? 'Tài xế nhận' : 'Khách đặt';
    
    const depTime = trip?.departure_time ? new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const depDate = trip?.departure_time ? new Date(trip.departure_time).toLocaleDateString('vi-VN') : '--/--/----';
    const arrTime = trip?.arrival_time ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const arrDate = trip?.arrival_time ? new Date(trip.arrival_time).toLocaleDateString('vi-VN') : '--/--/----';

    const isOngoing = trip?.status === TripStatus.ON_TRIP;
    const isUrgent = trip?.status === TripStatus.URGENT;
    const isPreparing = trip?.status === TripStatus.PREPARING;

    const createdAtTime = order.created_at ? new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const createdAtDay = order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--/--';

    // Color & Text Logic
    const priceColor = isRequest ? 'text-indigo-600' : 'text-orange-600';
    const progressBarColor = isRequest ? 'bg-indigo-500' : 'bg-orange-500';
    const seatLabel = isRequest ? 'Nhận chuyến' : `Đặt ${order.seats_booked}/${trip?.seats} ghế`;

    // Use extracted locations
    const { pickup, dropoff } = extractLocations(order.note);
    const displayPickup = pickup || trip?.origin_name;
    const displayDropoff = dropoff || trip?.dest_name;
    const displayPhone = order.passenger_phone ? order.passenger_phone.replace(/^\+?84/, '0') : 'N/A';

    return (
      <div key={order.id} className={`bg-white p-4 rounded-[24px] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative flex flex-col justify-between ${isOngoing ? 'border-blue-200 bg-blue-50/20' : isUrgent ? 'border-rose-400 bg-rose-50/20' : isPreparing ? 'border-amber-300 bg-amber-50/10' : 'border-slate-100'} ${isFinalStatus ? 'opacity-80' : ''}`} onClick={() => onViewTripDetails(trip)}>
        <div>
          {/* Header: Status Selector, Seats, Price */}
          <div className="flex items-center justify-between mb-3">
            <div onClick={(e) => e.stopPropagation()} className="z-20">
              {actionLoading === order.id ? (
                <div className="flex items-center justify-center py-1 bg-slate-50 rounded-lg border border-slate-100 w-28"><Loader2 className="animate-spin text-indigo-500" size={12} /></div>
              ) : (
                <BookingStatusSelector value={order.status} onChange={(newStatus) => handleUpdateStatus(order.id, newStatus)} />
              )}
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold text-slate-500">{seatLabel}</span>
              <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                <div className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`} style={{ width: '100%' }}></div>
              </div>
            </div>

            <p className={`text-sm font-bold tracking-tight ${priceColor}`}>
              {order.total_price === 0 ? 'Thoả thuận' : new Intl.NumberFormat('vi-VN').format(order.total_price) + 'đ'}
            </p>
          </div>

          {/* Info: Person Info */}
          <div className="flex flex-col gap-2.5 items-start mb-3 min-h-[30px] justify-center">
            <div className="flex items-center gap-2.5 w-full">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg shrink-0 ${isRequest ? 'bg-indigo-600 shadow-indigo-100' : 'bg-orange-600 shadow-orange-100'}`}>
                {personName.charAt(0)}
              </div>
              <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate flex-1">{personName}</h4>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap pl-0.5">
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate ${isRequest ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-orange-50 text-orange-600 border-orange-100'} flex-shrink-0 min-w-0`}>
                  {isRequest ? <Car size={9} /> : <User size={9} />} {personLabel}
              </span>
            </div>
          </div>
          
          {/* Route Visual - Consistent Style */}
          <div className="space-y-2.5 mb-3 relative">
              <div className="absolute left-[7px] top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-indigo-100/70 via-slate-100/70 to-emerald-100/70"></div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-indigo-100/70 border-indigo-200/50 shadow-indigo-200/50">
                  <div className="w-2 h-2 rounded-full shadow-inner bg-indigo-600"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-700 truncate leading-tight" title={displayPickup}>{displayPickup}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border shadow-sm bg-indigo-50 text-indigo-600 border-indigo-100">
                        <Clock size={8} /> <span className="text-[9px] font-black">{depTime}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                        <Calendar size={8} /> <span className="text-[9px] font-bold">{depDate}</span>
                      </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-emerald-100/70 border-emerald-200/50 shadow-emerald-200/50">
                  <div className="w-2 h-2 rounded-full shadow-inner bg-emerald-600"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-700 truncate leading-tight" title={displayDropoff}>{displayDropoff}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border shadow-sm bg-emerald-50 text-emerald-600 border-emerald-100">
                        <Clock size={8} /> <span className="text-[9px] font-black">{arrTime}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                        <Calendar size={8} /> <span className="text-[9px] font-bold">{arrDate}</span>
                      </div>
                  </div>
                </div>
              </div>
          </div>

          {/* Booking Message Display (New) */}
          {order.note && (
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl flex gap-2 relative z-10">
                  <MessageSquareQuote size={12} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-600 font-medium line-clamp-2" title={order.note}>{order.note}</p>
              </div>
          )}
        </div>

        {/* Footer - 3 columns grid */}
        <div className="grid grid-cols-3 items-center pt-3 border-t border-slate-100 mt-auto">
          <div className="flex justify-start">
              <div className="inline-flex items-center bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md border border-cyan-200 shadow-sm self-start">
                <CopyableCode code={bookingCode} className="text-[9px] font-black" label={bookingCode} />
              </div>
          </div>
          
          <div className="flex justify-center">
              <div className="flex items-center gap-2">
                  {order.passenger_phone && (
                      <a href={`tel:${order.passenger_phone}`} className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0" title="Gọi điện">
                          <Phone size={10} />
                      </a>
                  )}
                  <CopyableCode code={order.passenger_phone || ''} className="text-[10px] font-bold text-indigo-600 truncate" label={displayPhone} />
              </div>
          </div>

          <div className="flex justify-end items-center gap-1 text-[9px] font-bold text-slate-400">
              <Clock size={10} className="shrink-0" />
              <span>{createdAtTime} {createdAtDay}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderGroup = (group: any[], title: string, icon: React.ElementType, colors: any) => {
    if (group.length === 0) return null;
    return (
        <section className="space-y-5">
            <SectionHeader icon={icon} title={title} count={group.length} color={colors.color} bgColor={colors.bgColor} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-5">
                {group.map(order => renderOrderCard(order))}
            </div>
        </section>
    );
  };

  return (
    <div className="space-y-4 animate-slide-up max-w-[1600px] mx-auto">
      {/* ... existing render code ... */}
      {/* Pill Toggle Switch */}
      <div className="flex justify-center mb-2">
         <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex relative z-30 h-[42px]">
            <button 
               onClick={() => setRequestTypeFilter('ALL')}
               className={`px-5 h-full rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${requestTypeFilter === 'ALL' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
               <Layers size={14} /> Tất cả
            </button>
            <button 
               onClick={() => setRequestTypeFilter('BOOKING')}
               className={`px-5 h-full rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${requestTypeFilter === 'BOOKING' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
               <User size={14} /> Khách đặt
            </button>
            <button 
               onClick={() => setRequestTypeFilter('ACCEPTANCE')}
               className={`px-5 h-full rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${requestTypeFilter === 'ACCEPTANCE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
               <CheckCircle2 size={14} /> Tài xế nhận
            </button>
         </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100 p-6 rounded-[32px] shadow-sm space-y-5 backdrop-blur-sm relative z-30 transition-colors">
        <div className="flex flex-col gap-4">
          
          {/* Top Row: Search and Sort Row */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-3 w-full md:flex-1">
               <div className="relative flex-1 group">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors`} size={16} />
                  <input 
                    type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 h-[42px] bg-white/80 border border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50/50 rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm" 
                  />
               </div>
               
               {/* Sort Dropdown */}
               <div className="flex-1 md:w-48 md:flex-none shrink-0">
                  <UnifiedDropdown 
                    label="Sắp xếp" icon={ArrowUpDown} value={sortOrder} width="w-full" showCheckbox={false}
                    options={[
                      { label: 'Mới nhất (Đơn)', value: 'NEWEST' },
                      { label: 'Cũ nhất (Đơn)', value: 'OLDEST' },
                      { label: 'Khởi hành sớm nhất', value: 'DEPARTURE_ASC' },
                      { label: 'Giá cao nhất', value: 'PRICE_DESC' },
                      { label: 'Giá thấp nhất', value: 'PRICE_ASC' }
                    ]}
                    onChange={setSortOrder}
                  />
               </div>
            </div>
            
            {/* Layout Toggle */}
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
            <UnifiedDropdown label="Trạng thái" icon={ClipboardList} value={statusFilter} onChange={setStatusFilter}
              isStatus={true} statusConfig={statusOptions} width="w-full lg:w-48" showCheckbox={true}
              options={[{label:'Tất cả', value:'ALL'}, ...statusOptions]} />
            
            <UnifiedDropdown label="Thời gian" icon={Calendar} value={timeFilter} onChange={setTimeFilter} width="w-full lg:w-48" showCheckbox={true}
              options={[{label:'Tất cả thời gian', value:'ALL'}, {label:'Hôm nay', value:'TODAY'}, {label:'Hôm qua', value:'YESTERDAY'}, {label:'7 ngày qua', value:'WEEK'}]} />
          </div>
        </div>
      </div>

      {/* Grid View (Mobile Default + Desktop Toggle) */}
      <div className={`space-y-8 pb-20 ${viewMode === 'list' ? 'md:hidden' : ''}`}>
        {filteredOrders.length > 0 ? (
            <>
                {renderGroup(groupedOrders.today, 'Hôm nay', CalendarDays, { color: 'text-emerald-600', bgColor: 'bg-emerald-100' })}
                {renderGroup(groupedOrders.thisMonth, 'Trong tháng này', Calendar, { color: 'text-sky-600', bgColor: 'bg-sky-100' })}
                {renderGroup(groupedOrders.future, 'Tương lai', Send, { color: 'text-indigo-600', bgColor: 'bg-indigo-100' })}
                {renderGroup(groupedOrders.past, 'Lịch sử', History, { color: 'text-slate-500', bgColor: 'bg-slate-100' })}
            </>
        ) : (
          <div className="p-10 text-center bg-white rounded-[24px] border border-dashed border-slate-200">
             <ShoppingBag size={32} className="mx-auto text-slate-300 mb-2" />
             <p className="text-xs font-bold text-slate-400">Không có đơn hàng nào</p>
          </div>
        )}
      </div>

      {/* Desktop Table View (Hidden in Grid Mode) */}
      <div className={`hidden md:${viewMode === 'list' ? 'block' : 'hidden'} bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-visible min-h-[400px]`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="Thông tin đơn" sortKey="created_at" width="13%" />
                <SortHeader label="Đối tác" sortKey="passenger_name" width="15%" />
                <SortHeader label="Loại yêu cầu" sortKey="request_type" width="12%" />
                <SortHeader label="Trạng thái" sortKey="status" width="15%" textAlign="text-center" />
                <SortHeader label="Điểm đón" sortKey="origin_name" width="16%" />
                <SortHeader label="Điểm đến" sortKey="dest_name" width="16%" />
                <SortHeader label="Giá" sortKey="total_price" width="13%" textAlign="text-right" />
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton cols={7} rows={6} />
            ) : (
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.length > 0 ? filteredOrders.map(order => {
                  const trip = order.trips;
                  const isRequest = trip?.is_request;
                  
                  const depTime = trip?.departure_time ? new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                  const depDate = trip?.departure_time ? new Date(trip.departure_time).toLocaleDateString('vi-VN') : '--/--/----';
                  const arrivalDateObj = trip?.arrival_time ? new Date(trip.arrival_time) : null;
                  const arrTime = arrivalDateObj ? arrivalDateObj.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                  const arrDate = arrivalDateObj ? arrivalDateObj.toLocaleDateString('vi-VN') : '--/--/----';

                  const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
                  const isFinalStatus = order.status === 'EXPIRED' || order.status === 'CANCELLED';
                  const createdAt = order.created_at ? new Date(order.created_at) : null;
                  const bTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                  const bDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';
                  const isPendingLong = order.status === 'PENDING' && (now - new Date(order.created_at).getTime() > 30 * 60 * 1000);

                  const personName = isRequest ? (order.profiles?.full_name || 'Tài xế nhận') : (order.profiles?.full_name || 'Khách vãng lai');
                  const tripCode = trip?.trip_code || (trip?.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '---');
                  const priceColor = isRequest ? 'text-indigo-600' : 'text-orange-600';
                  const seatText = isRequest ? 'Nhận chuyến' : `Đặt ${order.seats_booked}/${trip?.seats} ghế`;

                  // Use extracted locations
                  const { pickup, dropoff } = extractLocations(order.note);
                  const displayPickup = pickup || trip?.origin_name;
                  const displayDropoff = dropoff || trip?.dest_name;
                  const displayPhone = order.passenger_phone ? order.passenger_phone.replace(/^\+?84/, '0') : 'N/A';

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-slate-50/30 transition-colors ${isFinalStatus ? 'opacity-90' : ''} cursor-pointer`} 
                      onClick={() => onViewTripDetails(trip)}
                    >
                      <td className="px-4 py-3 pr-6">
                         <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 self-start">
                              <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-100 shadow-sm">
                                <Clock size={8} />
                                <span className="text-[9px] font-black">{bTime}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                <Calendar size={8} />
                                <span className="text-[9px] font-bold">{bDate}</span>
                              </div>
                            </div>
                            <div className="inline-flex items-center bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md border border-cyan-200 shadow-sm self-start">
                              <CopyableCode code={bookingCode} className="text-[9px] font-black" label={bookingCode} />
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                             <div className={`h-[18px] w-[18px] rounded-full flex items-center justify-center text-[8px] shrink-0 font-bold ${isRequest ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                               {personName.charAt(0)}
                             </div>
                             <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">{personName}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                             {order.passenger_phone && (
                               <a href={`tel:${order.passenger_phone}`} className="w-[18px] h-[18px] bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0">
                                 <Phone size={8} />
                               </a>
                             )}
                             <CopyableCode code={order.passenger_phone || ''} className="text-[9px] font-bold text-indigo-600 truncate" label={displayPhone} />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isRequest ? (
                           <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-bold bg-indigo-50 text-indigo-600 border-indigo-100 whitespace-nowrap">
                              <CheckCircle2 size={10} /> Tài xế nhận
                           </div>
                        ) : (
                           <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-bold bg-orange-50 text-orange-600 border-orange-100 whitespace-nowrap">
                              <User size={10} /> Khách đặt
                           </div>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-full max-w-[130px] relative" onClick={(e) => e.stopPropagation()}>
                            {actionLoading === order.id ? <div className="flex items-center justify-center py-1 bg-slate-50 rounded-lg border border-slate-100"><Loader2 className="animate-spin text-indigo-500" size={12} /></div> : <BookingStatusSelector value={order.status} onChange={(newStatus) => handleUpdateStatus(order.id, newStatus)} />}
                          </div>
                          {isPendingLong && !isFinalStatus && <div className="flex items-center gap-1 text-[8px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shadow-sm"><AlertTriangle size={8} /> Hàng chờ {Math.floor((now - new Date(order.created_at).getTime()) / 60000)} phút</div>}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                         <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 self-start flex-wrap">
                              <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100 shadow-sm">
                                <Clock size={8} />
                                <span className="text-[10px] font-black">{depTime}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                <Calendar size={8} />
                                <span className="text-[10px] font-bold">{depDate}</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-800 truncate leading-tight mt-0.5 pr-1" title={displayPickup}>
                              {displayPickup}
                            </p>
                         </div>
                      </td>

                      <td className="px-4 py-3">
                         <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 self-start flex-wrap">
                              <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                                <Clock size={8} />
                                <span className="text-[10px] font-black">{arrTime}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                <Calendar size={8} /> <span className="text-[10px] font-bold">{arrDate}</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-emerald-600 truncate leading-tight mt-0.5 pr-1" title={displayDropoff}>
                              {displayDropoff}
                            </p>
                         </div>
                      </td>

                      <td className="px-4 py-3 text-right pr-4">
                        <p className={`text-[10px] font-bold leading-tight ${priceColor}`}>
                          {order.total_price === 0 ? 'Thoả thuận' : new Intl.NumberFormat('vi-VN').format(order.total_price) + 'đ'}
                        </p>
                        <p className="text-[8px] font-bold text-slate-500 mt-0.5">{seatText}</p>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={7} className="px-6 py-20 text-center italic text-slate-500 text-[11px] font-bold">Chưa có đơn hàng nào khớp với bộ lọc</td></tr>
                )}
              </tbody>
            )}
          </table>
          <div className="h-40"></div>
        </div>
      </div>
    </div>
  );
};
export default OrderManagement;