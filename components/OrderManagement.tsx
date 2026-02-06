
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Search, CheckCircle2, XCircle, Clock, RefreshCcw, Loader2, ArrowUpDown, Navigation, Car, User, ArrowRight, Phone, DollarSign, ChevronDown, Check, X, AlertCircle, AlertTriangle, Timer, Ban, Calendar, Filter, Hash, Play, MapPin, LayoutList, LayoutGrid, Star, ClipboardList, Info, Users, Layers, MessageSquareQuote, CalendarDays, Send, History, Trash2
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
      } else if (profile.role === 'user') {
        // Passenger sees their own bookings
        query = query.eq('passenger_id', profile.id);
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

  const extractLocations = (note?: string) => {
    if (!note) return { pickup: null, dropoff: null, message: null };
    const pickupMatch = note.match(/📍 Đón: (.*)/);
    const dropoffMatch = note.match(/🏁 Trả: (.*)/);
    const messageMatch = note.match(/💬 Lời nhắn:([\s\S]*)/); 

    if (pickupMatch || dropoffMatch || messageMatch) {
       return {
        pickup: pickupMatch ? pickupMatch[1].trim() : null,
        dropoff: dropoffMatch ? dropoffMatch[1].trim() : null,
        message: messageMatch ? messageMatch[1].trim() : null
       };
    }
    // Fallback for plain text note
    return { pickup: null, dropoff: null, message: note || null };
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
      
      const isRequest = trip?.is_request; 

      if (requestTypeFilter === 'BOOKING' && isRequest) return false;
      if (requestTypeFilter === 'ACCEPTANCE' && !isRequest) return false;

      const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
      // Update: Logic ID Chuyến xe bắt đầu bằng X
      const tripCode = trip?.trip_code || (trip?.id ? `X${trip.id.substring(0, 5).toUpperCase()}` : '');
      const passengerName = order.profiles?.full_name || '';
      const driverName = trip?.driver_profile?.full_name || '';
      const route = `${trip?.origin_name} ${trip?.dest_name}`;
      
      const { pickup, dropoff } = extractLocations(order.note);
      const specificRoute = `${pickup || ''} ${dropoff || ''}`;
      
      const passengerPhone = order.passenger_phone ? order.passenger_phone.replace(/^(?:\+84|84)/, '0') : '';

      const matchesSearch = passengerPhone.includes(searchTerm) || 
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

  const groupedOrders = useMemo(() => {
    const today: any[] = [];
    const thisMonth: any[] = [];
    const future: any[] = [];
    const past: any[] = [];
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const order of filteredOrders) {
      const trip = order.trips;
      if (!trip) continue;
      
      const bookingDate = new Date(order.created_at);
      
      if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED || order.status === 'CANCELLED' || order.status === 'EXPIRED') {
        past.push(order);
        continue;
      }

      if (bookingDate >= startOfToday && bookingDate <= endOfToday) {
        today.push(order);
      } else if (bookingDate >= startOfMonth && bookingDate < startOfToday) {
        thisMonth.push(order);
      } else if (bookingDate < startOfMonth) {
        past.push(order);
      } else {
        today.push(order);
      }
    }
    
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
        showAlert({ title: 'Chuyến xe không hợp lệ', message: 'Không thể thay đổi trạng thái đơn hàng cho chuyến xe đã khởi hành, đã hoàn thành hoặc đã bị hủy.', variant: 'warning', confirmText: 'Đã hiểu' });
        setActionLoading(null);
        return;
      }

      if (newStatus === 'CONFIRMED' && oldBookingStatus !== 'CONFIRMED') {
        newAvailableSeats = trip.available_seats - seatsBooked;
      } 
      else if (oldBookingStatus === 'CONFIRMED' && newStatus !== 'CONFIRMED') {
        newAvailableSeats = trip.available_seats + seatsBooked;
      }
      
      if (newAvailableSeats < 0) {
        showAlert({ title: 'Không đủ chỗ trống', message: 'Không đủ chỗ trống để xác nhận đơn hàng này. Vui lòng kiểm tra lại.', variant: 'warning', confirmText: 'Đã hiểu' });
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
    const isRequest = trip?.is_request; 
    const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
    const isFinalStatus = order.status === 'EXPIRED' || order.status === 'CANCELLED';
    
    const isTripCompleted = trip?.status === TripStatus.COMPLETED; 

    const personName = isRequest ? (order.profiles?.full_name || 'Tài xế nhận') : (order.profiles?.full_name || 'Khách vãng lai');
    const personLabel = isRequest ? 'Tài xế nhận' : 'Khách đặt';
    
    const depTime = trip?.departure_time ? new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const depDate = trip?.departure_time ? new Date(trip.departure_time).toLocaleDateString('vi-VN') : '--/--/----';
    const arrTime = trip?.arrival_time ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const arrDate = trip?.arrival_time ? new Date(trip.arrival_time).toLocaleDateString('vi-VN') : '--/--/----';
    const tripCode = trip?.trip_code || (trip?.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '---');

    return (
      <div key={order.id} className={`bg-white p-4 rounded-[24px] border shadow-sm hover:shadow-lg transition-all mb-4 relative overflow-hidden group ${isFinalStatus ? 'opacity-70' : ''}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${isRequest ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
               {isRequest ? <Car size={20} /> : <User size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">{personName}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold border border-slate-200">{personLabel}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                 <span className="text-[10px] font-bold text-slate-500">#{bookingCode}</span>
                 <span className="text-[10px] text-slate-400">• {tripCode}</span>
              </div>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
             {actionLoading === order.id ? (
                <Loader2 className="animate-spin text-slate-400" size={16} />
             ) : (
                <BookingStatusSelector 
                   value={order.status} 
                   onChange={(newStatus) => handleUpdateStatus(order.id, newStatus)}
                   disabled={isTripCompleted || isFinalStatus} 
                />
             )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-3 relative pl-3">
            <div className="absolute left-[5px] top-1.5 bottom-1.5 w-0.5 bg-slate-100"></div>
            <div className="flex items-start gap-3 relative z-10">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-indigo-500 mt-0.5 shrink-0"></div>
                <div>
                    <p className="text-[11px] font-bold text-slate-700 leading-tight">{extractLocations(order.note).pickup || trip?.origin_name}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{depTime} • {depDate}</p>
                </div>
            </div>
            <div className="flex items-start gap-3 relative z-10">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-emerald-500 mt-0.5 shrink-0"></div>
                <div>
                    <p className="text-[11px] font-bold text-slate-700 leading-tight">{extractLocations(order.note).dropoff || trip?.dest_name}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{arrTime} • {arrDate}</p>
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <div className="flex items-center gap-3">
                {order.passenger_phone && (
                    <a href={`tel:${order.passenger_phone}`} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all">
                        <Phone size={14} />
                    </a>
                )}
                {extractLocations(order.note).message && (
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg max-w-[120px] truncate" title={extractLocations(order.note).message || ''}>
                        <MessageSquareQuote size={12} />
                        <span className="truncate">{extractLocations(order.note).message}</span>
                    </div>
                )}
            </div>
            <div className="text-right">
                <p className={`text-sm font-black ${isRequest ? 'text-indigo-600' : 'text-orange-600'}`}>
                    {new Intl.NumberFormat('vi-VN').format(order.total_price)}đ
                </p>
                <p className="text-[9px] font-bold text-slate-400">{order.seats_booked} ghế</p>
            </div>
        </div>
        
        <button 
            onClick={() => trip && onViewTripDetails(trip)} 
            className="absolute inset-0 z-0" 
            aria-label="Xem chi tiết"
        />
      </div>
    );
  };

  const renderGroup = (group: any[], title: string, icon: any, colors: any) => {
    if (group.length === 0) return null;
    return (
        <section className="space-y-4">
            <SectionHeader icon={icon} title={title} count={group.length} color={colors.color} bgColor={colors.bgColor} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.map(item => renderOrderCard(item))}
            </div>
        </section>
    );
  };

  return (
    <div className="space-y-4 animate-slide-up max-w-[1600px] mx-auto pb-20">
        <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm sticky top-0 z-30 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Tìm khách, mã đơn, SĐT..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                        />
                    </div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 h-[42px]">
                        <button onClick={() => setRequestTypeFilter('ALL')} className={`px-3 rounded-lg text-[10px] font-bold transition-all ${requestTypeFilter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Tất cả</button>
                        <button onClick={() => setRequestTypeFilter('BOOKING')} className={`px-3 rounded-lg text-[10px] font-bold transition-all ${requestTypeFilter === 'BOOKING' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Khách đặt</button>
                        <button onClick={() => setRequestTypeFilter('ACCEPTANCE')} className={`px-3 rounded-lg text-[10px] font-bold transition-all ${requestTypeFilter === 'ACCEPTANCE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Nhận khách</button>
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    <UnifiedDropdown 
                        label="Trạng thái" icon={ClipboardList} value={statusFilter} onChange={setStatusFilter}
                        width="w-36 shrink-0" showCheckbox={true} isStatus={true} statusConfig={statusOptions}
                        options={[{label:'Tất cả', value:'ALL'}, ...statusOptions]} 
                    />
                    <UnifiedDropdown 
                        label="Thời gian" icon={Calendar} value={timeFilter} onChange={setTimeFilter}
                        width="w-36 shrink-0" showCheckbox={true}
                        options={[{label:'Tất cả', value:'ALL'}, {label:'Hôm nay', value:'TODAY'}, {label:'Hôm qua', value:'YESTERDAY'}, {label:'7 ngày qua', value:'WEEK'}]} 
                    />
                     <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex items-center shrink-0 h-[42px]">
                        <button onClick={() => setViewMode('list')} className={`p-2 h-full aspect-square flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <LayoutList size={18} />
                        </button>
                        <button onClick={() => setViewMode('grid')} className={`p-2 h-full aspect-square flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {viewMode === 'grid' ? (
             filteredOrders.length > 0 ? (
                <>
                    {renderGroup(groupedOrders.today, 'Hôm nay', CalendarDays, { color: 'text-emerald-600', bgColor: 'bg-emerald-100' })}
                    {renderGroup(groupedOrders.future, 'Sắp tới', Send, { color: 'text-indigo-600', bgColor: 'bg-indigo-100' })}
                    {renderGroup(groupedOrders.past, 'Lịch sử', History, { color: 'text-slate-500', bgColor: 'bg-slate-100' })}
                </>
            ) : (
                <div className="py-20 text-center">
                    <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400">Không có dữ liệu nào</p>
                </div>
            )
        ) : (
             <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <SortHeader label="Thông tin khách" sortKey="profiles.full_name" width="20%" />
                                <SortHeader label="Trạng thái" sortKey="status" width="15%" textAlign="text-center" />
                                <SortHeader label="Chuyến xe" sortKey="trip_info" width="20%" />
                                <SortHeader label="Tổng tiền" sortKey="total_price" width="15%" textAlign="text-right" />
                                <SortHeader label="Ngày tạo" sortKey="created_at" width="15%" />
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        {loading ? <TableSkeleton rows={5} cols={6} /> : (
                            <tbody className="divide-y divide-slate-50">
                                {filteredOrders.map((order: any) => {
                                    const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
                                    const trip = order.trips;
                                    const tripCode = trip?.trip_code || (trip?.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '---');
                                    const personName = order.profiles?.full_name || 'Khách vãng lai';
                                    const isRequest = trip?.is_request;
                                    const priceColor = isRequest ? 'text-indigo-600' : 'text-orange-600';
                                    
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm ${isRequest ? 'bg-indigo-600' : 'bg-orange-600'}`}>
                                                        {personName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-900 truncate">{personName}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <CopyableCode code={bookingCode} className="text-[8px] bg-slate-100 px-1.5 rounded border border-slate-200" />
                                                            {order.passenger_phone && <span className="text-[9px] text-slate-500">{order.passenger_phone.replace(/^(?:\+84|84)/, '0')}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div onClick={(e) => e.stopPropagation()} className="inline-block">
                                                    {actionLoading === order.id ? (
                                                        <Loader2 className="animate-spin text-indigo-500 mx-auto" size={14} />
                                                    ) : (
                                                        <BookingStatusSelector 
                                                            value={order.status} 
                                                            onChange={(newStatus) => handleUpdateStatus(order.id, newStatus)} 
                                                            disabled={trip?.status === TripStatus.COMPLETED || trip?.status === TripStatus.CANCELLED}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{tripCode}</span>
                                                    <span className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">{trip?.origin_name} → {trip?.dest_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-[11px] font-bold ${priceColor}`}>
                                                    {new Intl.NumberFormat('vi-VN').format(order.total_price)}đ
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] text-slate-600">{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); trip && onViewTripDetails(trip); }}
                                                    className="p-1.5 bg-slate-50 text-slate-500 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                                                    title="Xem chi tiết"
                                                >
                                                    <Info size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        )}
                    </table>
                     {!loading && filteredOrders.length === 0 && (
                        <div className="py-10 text-center text-slate-400 text-xs font-bold">Không có dữ liệu</div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default OrderManagement;
