
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Car, MapPin, Clock, Users, DollarSign, Calendar, Navigation, CheckCircle2, AlertCircle, Play, Timer, Ban, Phone, ArrowRight, Loader2, ListChecks, LucideIcon, Hash, CarFront, Zap, Crown, Shield, Trash2, Star, Radio, ArrowUpDown, Filter, ShieldCheck, Wifi, Snowflake, Droplets, Search, LayoutList, LayoutGrid, User, Info, MessageSquareQuote, ClipboardList
} from 'lucide-react';
import { Trip, Booking, Profile, UserRole, TripStatus } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { getVehicleConfig, getTripStatusDisplay, UnifiedDropdown } from './SearchTrips';
import { BookingStatusSelector, statusOptions } from './OrderManagement';

interface TripDetailModalProps {
  trip: Trip | null;
  currentBookings: Booking[];
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  showAlert: (config: any) => void;
}

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0000-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
};

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

const TripDetailModal: React.FC<TripDetailModalProps> = ({ trip, currentBookings, profile, isOpen, onClose, onRefresh, showAlert }) => {
  const [actionLoadingBooking, setActionLoadingBooking] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('DEFAULT'); 
  const [statusFilter, setStatusFilter] = useState('ALL'); // New status filter state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid'); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // --- LOGIC TÍNH TOÁN GHẾ DỰA TRÊN DANH SÁCH ORDER THỰC TẾ ---
  const { bookedSeatsCount, availableSeatsCount, revenue, bookingStats } = useMemo(() => {
    if (!trip) return { bookedSeatsCount: 0, availableSeatsCount: 0, revenue: 0, bookingStats: { pending: 0, confirmed: 0, pickedUp: 0, onBoard: 0 } };
    
    // Chỉ tính ghế từ các đơn đã XÁC NHẬN
    const confirmedBookings = currentBookings.filter(b => b.status === 'CONFIRMED');
    const booked = confirmedBookings.reduce((sum, b) => sum + b.seats_booked, 0);
    const available = trip.seats - booked;
    const totalRev = confirmedBookings.reduce((sum, b) => sum + b.total_price, 0);

    const stats = {
      pending: currentBookings.filter(b => b.status === 'PENDING').length,
      confirmed: currentBookings.filter(b => b.status === 'CONFIRMED').length,
      pickedUp: currentBookings.filter(b => b.status === 'PICKED_UP').length,
      onBoard: currentBookings.filter(b => b.status === 'ON_BOARD').length
    };

    return { 
      bookedSeatsCount: booked, 
      availableSeatsCount: available < 0 ? 0 : available, 
      revenue: totalRev,
      bookingStats: stats
    };
  }, [currentBookings, trip]);

  // FIX: Tính toán số lượng xe nhận đang hoạt động để đảm bảo tính nhất quán
  const activeBookings = useMemo(() => {
    return currentBookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'EXPIRED');
  }, [currentBookings]);
  const activeBookingsCount = activeBookings.length;

  // Helper: Parse structured note including message
  const parseBookingNote = (note?: string) => {
    if (!note) return { pickup: null, dropoff: null, message: null };
    
    const pickupMatch = note.match(/📍 Đón: (.*)/);
    const dropoffMatch = note.match(/🏁 Trả: (.*)/);
    const messageMatch = note.match(/💬 Lời nhắn:([\s\S]*)/); // Capture everything after label
    
    // If structured tags exist
    if (pickupMatch || dropoffMatch || messageMatch) {
        return { 
            pickup: pickupMatch ? pickupMatch[1].trim() : null, 
            dropoff: dropoffMatch ? dropoffMatch[1].trim() : null,
            message: messageMatch ? messageMatch[1].trim() : null
        };
    }
    
    // Fallback for legacy notes (plain text)
    return { pickup: null, dropoff: null, message: note };
  };

  const filteredAndSortedBookings = useMemo(() => {
    let result = [...currentBookings];
    const searchNormalized = removeAccents(searchTerm);
    
    // Filter by Status
    if (statusFilter !== 'ALL') {
      result = result.filter(b => b.status === statusFilter);
    }

    // Filter by Search Term
    if (searchTerm) {
      result = result.filter(b => {
        const bookingCode = `S${b.id.substring(0, 5).toUpperCase()}`;
        const name = (b as any).profiles?.full_name || '';
        const phone = b.passenger_phone || '';
        const { pickup, dropoff, message } = parseBookingNote(b.note);
        
        return removeAccents(name).includes(searchNormalized) || 
               phone.includes(searchTerm) || 
               bookingCode.includes(searchTerm.toUpperCase()) ||
               (pickup && removeAccents(pickup).includes(searchNormalized)) ||
               (dropoff && removeAccents(dropoff).includes(searchNormalized)) ||
               (message && removeAccents(message).includes(searchNormalized));
      });
    }

    // Sort Logic (Default is now Status Priority)
    // Priority: PENDING (1) -> CONFIRMED/PICKED_UP/ON_BOARD (2) -> CANCELLED/EXPIRED (3)
    // Secondary: Created At (Newest first)
    const getPriority = (status: string) => {
        if (status === 'PENDING') return 1;
        if (['CONFIRMED', 'PICKED_UP', 'ON_BOARD'].includes(status)) return 2;
        if (['CANCELLED', 'EXPIRED'].includes(status)) return 3;
        return 4;
    };

    result.sort((a, b) => {
        const priorityA = getPriority(a.status);
        const priorityB = getPriority(b.status);
        
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [currentBookings, sortOrder, searchTerm, statusFilter]);

  if (!isOpen || !trip) return null;

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const isDriver = profile?.role === 'driver';
  const isTripOwner = trip.driver_id === profile?.id;
  
  const tripCode = trip.trip_code || `T${trip.id.substring(0, 5).toUpperCase()}`;
  const statusInfo = getTripStatusDisplay(trip);
  const StatusIcon = statusInfo.icon;
  const departureDate = new Date(trip.departure_time);
  const arrivalDateObj = trip.arrival_time ? new Date(trip.arrival_time) : new Date(departureDate.getTime() + 3 * 60 * 60 * 1000);

  const depTime = departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const depDate = departureDate.toLocaleDateString('vi-VN');
  const arrTime = arrivalDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const arrDate = arrivalDateObj.toLocaleDateString('vi-VN');
  
  const createdAtDate = trip.created_at ? new Date(trip.created_at) : null;
  const createdAtTime = createdAtDate ? createdAtDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const createdAtDay = createdAtDate ? createdAtDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--/--';

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(trip.origin_name)}+to+${encodeURIComponent(trip.dest_name)}&output=embed`;

  const fillPercent = trip.seats > 0 ? (bookedSeatsCount / trip.seats) * 100 : 0;
  
  const vehicleRaw = trip.vehicle_info || '';
  const vehicleParts = vehicleRaw.split(' (');
  let vehicleModel = vehicleParts[0] || '---';
  if (vehicleModel === 'Cần bao xe') {
    vehicleModel = 'Cần tìm xe';
  }
  const licensePlate = vehicleParts[1] ? vehicleParts[1].replace(')', '') : '';
  const vehicleConfig = getVehicleConfig(vehicleModel);
  const VIcon = trip.is_request ? Users : vehicleConfig.icon;

  let fillBarColor: string;
  if (trip.is_request) {
    fillBarColor = activeBookingsCount === 0 ? 'bg-slate-200' : activeBookingsCount === 1 ? 'bg-emerald-500' : 'bg-rose-500';
  } else {
    if (bookedSeatsCount <= 0) fillBarColor = 'bg-slate-200';
    else if (fillPercent < 50) fillBarColor = 'bg-emerald-500';
    else if (fillPercent < 100) fillBarColor = 'bg-amber-500';
    else fillBarColor = 'bg-rose-500';
  }

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    setActionLoadingBooking(bookingId);
    try {
      const { data: currentBooking, error: fetchBookingError } = await supabase
        .from('bookings')
        .select('*, trips(*)')
        .eq('id', bookingId)
        .single();

      if (fetchBookingError) throw fetchBookingError;
      
      const currentTrip = Array.isArray(currentBooking.trips) ? currentBooking.trips[0] : currentBooking.trips;
      const tripId = currentTrip.id;
      
      const now = new Date();
      const departureTime = new Date(currentTrip.departure_time);

      if (departureTime < now || currentTrip.status === TripStatus.COMPLETED || currentTrip.status === TripStatus.CANCELLED) {
        showAlert({ title: 'Thao tác không hợp lệ', message: 'Không thể thay đổi trạng thái đơn cho chuyến xe đã kết thúc hoặc đã hủy.', variant: 'warning', confirmText: 'Đã hiểu' });
        return;
      }

      // Fetch ALL bookings for this trip to recalculate seats accurately
      const { data: allTripBookings, error: fetchAllError } = await supabase
        .from('bookings')
        .select('id, status, seats_booked')
        .eq('trip_id', tripId);
        
      if (fetchAllError) throw fetchAllError;

      // Calculate CURRENT used seats (excluding the booking being modified if we consider "before change" logic, 
      // but simpler to calc "occupied by others")
      const otherBookings = allTripBookings.filter(b => b.id !== bookingId && b.status === 'CONFIRMED');
      const seatsUsedByOthers = otherBookings.reduce((sum, b) => sum + b.seats_booked, 0);
      
      let seatsUsedByThisBooking = 0;
      if (newStatus === 'CONFIRMED') {
          seatsUsedByThisBooking = currentBooking.seats_booked;
      }
      
      const totalUsedSeats = seatsUsedByOthers + seatsUsedByThisBooking;
      const newAvailableSeats = currentTrip.seats - totalUsedSeats;

      if (newAvailableSeats < 0) {
        showAlert({ title: 'Không đủ chỗ', message: `Chuyến xe chỉ còn ${currentTrip.seats - seatsUsedByOthers} ghế trống (đã trừ các đơn đã xác nhận khác). Đơn này cần ${currentBooking.seats_booked} ghế.`, variant: 'warning', confirmText: 'Đã hiểu' });
        return;
      }

      let newTripStatus = currentTrip.status;
      // Auto update trip status based on seats
      if (newAvailableSeats <= 0) newTripStatus = TripStatus.FULL;
      else if (newAvailableSeats > 0 && (newTripStatus === TripStatus.FULL)) {
           // If space opens up, revert to URGENT or PREPARING based on time
           const diffMins = Math.floor((departureTime.getTime() - now.getTime()) / 60000);
           if (diffMins <= 60 && diffMins > 0) newTripStatus = TripStatus.URGENT;
           else newTripStatus = TripStatus.PREPARING;
      }

      await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
      await supabase.from('trips').update({ available_seats: newAvailableSeats, status: newTripStatus }).eq('id', tripId);
      
      onRefresh();
    } catch (err: any) {
      showAlert({ title: 'Lỗi', message: err.message, variant: 'danger', confirmText: 'Đóng' });
    } finally {
      setActionLoadingBooking(null);
    }
  };

  const handleDeleteBooking = async (bookingId: string, seatsBooked: number, currentBookingStatus: string) => {
    showAlert({
      title: 'Xoá đơn hàng?',
      message: 'Bạn có chắc chắn muốn xóa đơn hàng này? Thao tác này không thể hoàn tác.',
      variant: 'danger',
      confirmText: 'Xoá ngay',
      cancelText: 'Hủy',
      onConfirm: async () => {
        setActionLoadingBooking(bookingId);
        try {
          const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
          if (error) throw error;
          
          if (currentBookingStatus === 'CONFIRMED') {
            await supabase.from('trips').update({ available_seats: trip.available_seats + seatsBooked }).eq('id', trip.id);
          }
          onRefresh();
        } catch (err: any) {
          showAlert({ title: 'Lỗi', message: err.message, variant: 'danger', confirmText: 'Đóng' });
        } finally {
          setActionLoadingBooking(null);
        }
      }
    });
  };

  const SortHeader = ({ label, width, textAlign = 'text-left' }: { label: string, width?: string, textAlign?: string }) => (
    <th 
      style={{ width }} 
      className={`px-4 py-3 text-[9px] font-bold text-slate-400 ${textAlign}`}
    >
      {label}
    </th>
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        ref={modalRef} 
        className="bg-white w-full max-w-[1400px] h-[95vh] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col relative border border-white/20"
      >
        {/* Nút đóng nổi */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 w-10 h-10 bg-white shadow-xl text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-white transition-all duration-300 z-[160] border border-slate-100"
        >
          <X size={20} strokeWidth={3} />
        </button>

        {/* Content Wrapper handling Mobile Scroll vs Desktop Split */}
        <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden custom-scrollbar">
          
          {/* Frame 1: Trip Info - Mobile: Natural Height / Desktop: 40% */}
          <div className="shrink-0 lg:h-[40%] flex flex-col p-4 bg-gradient-to-r from-emerald-50/40 to-indigo-50/30 border-b border-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-full lg:overflow-y-auto custom-scrollbar">
              
              {/* Cột trái: Thông tin xe */}
              <div className={`lg:col-span-4 bg-white p-5 rounded-[32px] border shadow-sm flex flex-col justify-between group overflow-hidden relative ${trip.status === TripStatus.ON_TRIP ? 'border-blue-200 bg-blue-50/20' : trip.status === TripStatus.URGENT ? 'border-rose-400 bg-rose-50/20' : trip.status === TripStatus.PREPARING ? 'border-amber-300 bg-amber-50/10' : 'border-emerald-100'}`}>
                
                  <div>
                      <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold z-10 ${statusInfo.style}`}>
                              {trip.status === TripStatus.ON_TRIP ? <Play size={10} className="animate-pulse" /> : <StatusIcon size={10} />}
                              {statusInfo.label}
                          </div>

                          <div className="flex flex-col items-center">
                              <span className="text-[8px] font-bold text-slate-500">
                              {trip.is_request ? (trip.seats === 7 ? 'Bao xe' : `${trip.seats} ghế`) + ` (${activeBookingsCount} xe nhận)` : `Còn ${availableSeatsCount}/${trip.seats} ghế trống`}
                              </span>
                              <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                              <div className={`h-full rounded-full transition-all duration-500 ${fillBarColor}`} style={{ width: `${trip.is_request ? 100 : fillPercent}%` }}></div>
                              </div>
                          </div>

                          <p className={`text-sm font-bold tracking-tight ${trip.is_request ? 'text-orange-600' : 'text-indigo-600'}`}>
                              {trip.price === 0 ? 'Thoả thuận' : new Intl.NumberFormat('vi-VN').format(trip.price) + 'đ'}
                          </p>
                      </div>

                      <div className="flex flex-col gap-2.5 items-start mb-3 min-h-[30px] justify-center">
                          <div className="flex items-center gap-2.5 w-full">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg shrink-0 ${trip.is_request ? 'bg-orange-500 shadow-orange-100' : 'bg-indigo-600 shadow-indigo-100'}`}>
                              {trip.driver_name?.charAt(0) || 'U'}
                              </div>
                              <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate flex-1">{trip.driver_name}</h4>
                          </div>
                          
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap pl-0.5">
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate ${trip.is_request ? 'bg-orange-50 text-orange-600 border-orange-100' : vehicleConfig.style}`}>
                                  <VIcon size={9} /> {trip.is_request ? (trip.vehicle_info || 'Cần tìm xe') : vehicleModel}
                              </span>
                              {!trip.is_request && licensePlate && (
                                  <div className="inline-flex items-center bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm self-start whitespace-nowrap">
                                      <CopyableCode code={licensePlate} className="text-[9px] font-black uppercase tracking-wider" label={licensePlate} />
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="space-y-2.5 mb-3 relative">
                          <div className="absolute left-[7px] top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-indigo-100/70 via-slate-100/70 to-emerald-100/70"></div> 
                          
                          <div className="flex items-center gap-3 relative z-10">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-indigo-100/70 border-indigo-200/50 shadow-indigo-200/50">
                              <div className="w-2 h-2 rounded-full shadow-inner bg-indigo-600"></div>
                              </div>
                              <div className="flex-1">
                              <p className="font-bold text-slate-700 text-[12px] truncate leading-tight">{trip.origin_name}</p>
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
                              <div className="w-4 h-4 rounded-full bg-emerald-100/70 flex items-center justify-center shrink-0 border border-emerald-200/50 shadow-lg shadow-emerald-200/50">
                              <div className="w-2 h-2 rounded-full shadow-inner bg-emerald-600"></div>
                              </div>
                              <div className="flex-1">
                              <p className="font-bold text-slate-700 text-[12px] truncate leading-tight">{trip.dest_name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                  <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                                  <Clock size={8} /> <span className="text-[9px] font-black">{arrTime}</span>
                                  </div>
                                  <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                  <Calendar size={8} /> <span className="text-[9px] font-bold">{arrDate}</span>
                                  </div>
                              </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100 grid grid-cols-2 items-center">
                      <div className="flex justify-start">
                          <div className="inline-flex items-center bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100 shadow-sm">
                          <CopyableCode code={tripCode} className="text-[9px] font-black" label={tripCode} />
                          </div>
                      </div>
                      <div className="flex justify-end items-center gap-1 text-[9px] font-bold text-slate-400">
                          <Clock size={10} className="shrink-0" />
                          <span>{createdAtTime} {createdAtDay}</span>
                      </div>
                  </div>
              </div>

              {/* Cột phải: Bản đồ */}
              <div className="lg:col-span-8 bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-sm relative h-48 lg:h-full hidden md:block">
                <iframe width="100%" height="100%" frameBorder="0" src={mapUrl} className="grayscale-[0.1] contrast-[1.05]" />
                <div className="absolute top-4 right-14 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-2xl text-[11px] font-black text-slate-600 border border-slate-200 shadow-md">
                  Lộ trình chi tiết Google Maps
                </div>
              </div>
            </div>
          </div>

          {/* Frame 2: Order Management - Mobile: Natural Height / Desktop: 60% */}
          <div className="shrink-0 lg:flex-1 flex flex-col bg-white overflow-hidden">
            
            {/* Enhanced Toolbar */}
            <div className="px-4 md:px-8 py-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/40 to-indigo-50/40 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
                  <ListChecks size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">{trip.is_request ? 'Danh sách xe nhận chuyến' : 'Danh sách hành khách'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{trip.is_request ? `Có ${activeBookingsCount} xe nhận` : `Quản lý duyệt đơn (${filteredAndSortedBookings.length})`}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Search Bar - Expanded size */}
                <div className="relative group w-full sm:w-80 flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={14} />
                    <input 
                      type="text" 
                      placeholder="Tìm mã xe, lộ trình..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 h-[38px] bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50/50 shadow-sm transition-all placeholder:text-slate-400"
                    />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Replaced Sort with Status Filter */}
                    <div className="w-full sm:w-36 h-[38px]">
                      <UnifiedDropdown 
                          label="Trạng thái" 
                          icon={ClipboardList} 
                          value={statusFilter} 
                          onChange={setStatusFilter} 
                          width="w-full" 
                          showCheckbox={false}
                          isStatus={true}
                          statusConfig={statusOptions}
                          options={[
                            { label: 'Tất cả trạng thái', value: 'ALL' },
                            ...statusOptions
                          ]}
                      />
                    </div>
                    
                    <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center shrink-0 h-[38px]">
                      <button 
                        onClick={() => setViewMode('list')} 
                        className={`p-1.5 h-full aspect-square flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <LayoutList size={16} />
                      </button>
                      <button 
                        onClick={() => setViewMode('grid')} 
                        className={`p-1.5 h-full aspect-square flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <LayoutGrid size={16} />
                      </button>
                    </div>
                </div>
              </div>
            </div>

            {/* List Container - Mobile: Visible Overflow / Desktop: Auto Scroll */}
            <div className="flex-1 lg:overflow-y-auto overflow-visible custom-scrollbar px-4 py-4 bg-slate-50 md:bg-white">
              {filteredAndSortedBookings.length > 0 ? (
                <>
                  {/* GRID VIEW (100% Synced with OrderManagement) */}
                  {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {filteredAndSortedBookings.map((booking: any) => {
                        const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
                        const isLoading = actionLoadingBooking === booking.id;
                        const { pickup, dropoff, message } = parseBookingNote(booking.note);
                        const displayPickup = pickup || trip.origin_name;
                        const displayDropoff = dropoff || trip.dest_name;
                        // If trip is a request, the "booker" is the driver.
                        const personName = booking.profiles?.full_name || (trip.is_request ? 'Tài xế' : 'Khách vãng lai');
                        const personLabel = trip.is_request ? 'Tài xế nhận' : 'Khách đặt';
                        const displayPhone = booking.passenger_phone ? booking.passenger_phone.replace(/^\+?84/, '0') : 'N/A';
                        
                        // Formatting & Visuals
                        const depTime = new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                        const depDate = new Date(trip.departure_time).toLocaleDateString('vi-VN');
                        const arrTimeObj = trip.arrival_time ? new Date(trip.arrival_time) : null;
                        const arrTime = arrTimeObj ? arrTimeObj.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                        const arrDate = arrTimeObj ? arrTimeObj.toLocaleDateString('vi-VN') : '--/--/----';
                        const createdAt = new Date(booking.created_at);
                        const createdAtTime = createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        const createdAtDay = createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        const priceColor = trip.is_request ? 'text-indigo-600' : 'text-orange-600';
                        const progressBarColor = trip.is_request ? 'bg-indigo-500' : 'bg-orange-500';
                        const seatLabel = trip.is_request ? `Nhận chuyến` : `Đặt ${booking.seats_booked}/${trip.seats} ghế`;
                        const isFinalStatus = booking.status === 'EXPIRED' || booking.status === 'CANCELLED';
                        
                        return (
                          <div key={booking.id} className={`bg-white p-4 rounded-[24px] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative flex flex-col justify-between h-full border-slate-100 ${isFinalStatus ? 'opacity-80' : ''}`}>
                            <div>
                                {/* Header: Status Selector, Seats, Price */}
                                <div className="flex items-center justify-between mb-3">
                                  <div onClick={(e) => e.stopPropagation()} className="z-20">
                                    {isLoading ? (
                                      <div className="flex items-center justify-center py-1 bg-slate-50 rounded-lg border border-slate-100 w-28"><Loader2 className="animate-spin text-indigo-500" size={12} /></div>
                                    ) : (
                                      <BookingStatusSelector 
                                          value={booking.status} 
                                          onChange={(newStatus) => handleUpdateBookingStatus(booking.id, newStatus)} 
                                          disabled={trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED}
                                      />
                                    )}
                                  </div>

                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-slate-500">{seatLabel}</span>
                                    <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                                      <div className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`} style={{ width: '100%' }}></div>
                                    </div>
                                  </div>

                                  <p className={`text-sm font-bold tracking-tight ${priceColor}`}>
                                    {new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ
                                  </p>
                                </div>

                                {/* Info: Person Info */}
                                <div className="flex flex-col gap-2.5 items-start mb-3 min-h-[30px] justify-center">
                                  <div className="flex items-center gap-2.5 w-full">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg shrink-0 ${trip.is_request ? 'bg-indigo-600 shadow-indigo-100' : 'bg-orange-600 shadow-orange-100'}`}>
                                      {personName.charAt(0)}
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate flex-1">{personName}</h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap pl-0.5">
                                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate ${trip.is_request ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-orange-50 text-orange-600 border-orange-100'} flex-shrink-0 min-w-0`}>
                                      {trip.is_request ? <Car size={9} /> : <User size={9} />} {personLabel}
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
                                {message && (
                                    <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl flex gap-2 relative z-10">
                                        <MessageSquareQuote size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-slate-600 font-medium line-clamp-2" title={message}>{message}</p>
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
                                        {booking.passenger_phone && (
                                            <a href={`tel:${booking.passenger_phone}`} className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0" title="Gọi điện">
                                                <Phone size={10} />
                                            </a>
                                        )}
                                        <CopyableCode code={booking.passenger_phone || ''} className="text-[10px] font-bold text-indigo-600 truncate" label={displayPhone} />
                                    </div>
                                </div>

                                <div className="flex justify-end items-center gap-1 text-[9px] font-bold text-slate-400">
                                  <Clock size={10} className="shrink-0" />
                                  <span>{createdAtTime} {createdAtDay}</span>
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* LIST VIEW (Table for Desktop, Cards for Mobile) */}
                  {viewMode === 'list' && (
                    <>
                      <div className="block md:hidden space-y-3">
                        {filteredAndSortedBookings.map((booking: any) => {
                          const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
                          const isLoading = actionLoadingBooking === booking.id;
                          const createdAt = booking.created_at ? new Date(booking.created_at) : null;
                          const bTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                          const bDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';
                          const { pickup, dropoff, message } = parseBookingNote(booking.note);
                          const displayPickup = pickup || trip.origin_name;
                          const displayDropoff = dropoff || trip.dest_name;
                          const personName = booking.profiles?.full_name || (trip.is_request ? 'Tài xế' : 'Khách vãng lai');

                          return (
                            <div key={booking.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border ${trip.is_request ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {personName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">{personName}</p>
                                    <CopyableCode code={bookingCode} className="text-[9px] font-bold text-slate-400" label={bookingCode} />
                                  </div>
                                </div>
                                <div className="w-28" onClick={(e) => e.stopPropagation()}>
                                  {isLoading ? (
                                    <Loader2 className="animate-spin text-indigo-500" size={14} />
                                  ) : (
                                    <BookingStatusSelector 
                                      value={booking.status} 
                                      onChange={(newStatus) => handleUpdateBookingStatus(booking.id, newStatus)} 
                                      disabled={trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED}
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-between items-center py-2 border-t border-b border-slate-50 mb-3">
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                  <Clock size={12} className="text-emerald-500" /> {bTime} - {bDate}
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-black text-emerald-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1">({booking.seats_booked} ghế)</span>
                                </div>
                              </div>
                              
                              <div className="text-[10px] text-slate-600 mb-3 space-y-1">
                                  <p className="truncate"><span className="font-bold text-indigo-600">Đón:</span> {displayPickup}</p>
                                  <p className="truncate"><span className="font-bold text-emerald-600">Trả:</span> {displayDropoff}</p>
                                  {message && (
                                    <div className="mt-2 flex gap-2 items-start p-2 bg-amber-50 rounded-lg border border-amber-100">
                                        <MessageSquareQuote size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="line-clamp-2">{message}</p>
                                    </div>
                                  )}
                              </div>

                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600">
                                  <Phone size={12} /> {booking.passenger_phone ? booking.passenger_phone.replace(/^\+?84/, '0') : '---'}
                                </div>
                                <button 
                                  onClick={() => handleDeleteBooking(booking.id, booking.seats_booked, booking.status)}
                                  className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="hidden md:block">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-white border-b border-slate-100 sticky top-0 z-10">
                              <SortHeader label="Mã đơn & Thời gian" width="14%" />
                              <SortHeader label={trip.is_request ? "Tài xế nhận" : "Hành khách"} width="18%" />
                              <SortHeader label="Trạng thái đơn" width="16%" textAlign="text-center" />
                              <SortHeader label="Điểm đón" width="18%" />
                              <SortHeader label="Điểm đến" width="18%" />
                              <SortHeader label="Giá" width="10%" textAlign="text-right" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredAndSortedBookings.map((booking: any) => {
                              const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
                              const isLoading = actionLoadingBooking === booking.id;
                              const createdAt = booking.created_at ? new Date(booking.created_at) : null;
                              const bTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                              const bDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';
                              const { pickup, dropoff, message } = parseBookingNote(booking.note);
                              const displayPickup = pickup || trip.origin_name;
                              const displayDropoff = dropoff || trip.dest_name;
                              const personName = booking.profiles?.full_name || (trip.is_request ? 'Tài xế' : 'Khách vãng lai');
                              const priceColor = trip.is_request ? 'text-indigo-600' : 'text-emerald-600';
                              const displayPhone = booking.passenger_phone ? booking.passenger_phone.replace(/^\+?84/, '0') : 'N/A';

                              return (
                                <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
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
                                          <a href={`tel:${booking.passenger_phone}`} className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0">
                                            <Phone size={10} />
                                          </a>
                                        )}
                                        <CopyableCode code={booking.passenger_phone || ''} className="text-[10px] font-bold text-indigo-600 truncate" label={displayPhone} />
                                      </div>
                                      {message && (
                                        <div className="flex items-start gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-100 max-w-[200px]">
                                            <MessageSquareQuote size={10} className="text-slate-400 shrink-0 mt-0.5" />
                                            <p className="text-[9px] text-slate-600 italic line-clamp-2" title={message}>{message}</p>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <div className="w-32 mx-auto">
                                      {isLoading ? (
                                        <Loader2 className="animate-spin text-indigo-500" size={14} />
                                      ) : (
                                        <BookingStatusSelector 
                                          value={booking.status} 
                                          onChange={(newStatus) => handleUpdateBookingStatus(booking.id, newStatus)} 
                                          disabled={trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED}
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
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                  <Users className="text-slate-100" size={80} />
                  <p className="text-[12px] font-bold text-slate-300 uppercase mt-4 tracking-widest">{trip.is_request ? 'Chưa có xe nào nhận' : 'Chưa có khách đặt'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Updated Footer Stats - Fixed at bottom */}
        <div className="px-4 md:px-8 py-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center shrink-0 gap-3 rounded-b-[32px]">
          <div className="flex flex-wrap items-center gap-3 md:gap-6 justify-center w-full md:w-auto">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg">
                <Clock size={10} className="text-amber-500" />
                <span className="text-[9px] font-bold text-slate-500">Chờ duyệt: <span className="text-amber-600 font-black ml-0.5">{bookingStats.pending}</span></span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                <CheckCircle2 size={10} className="text-emerald-500" />
                <span className="text-[9px] font-bold text-slate-500">Xác nhận: <span className="text-emerald-600 font-black ml-0.5">{bookingStats.confirmed}</span></span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-50 border border-cyan-100 rounded-lg">
                <MapPin size={10} className="text-cyan-500" />
                <span className="text-[9px] font-bold text-slate-500">Đã đón: <span className="text-cyan-600 font-black ml-0.5">{bookingStats.pickedUp}</span></span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
                <Play size={10} className="text-indigo-500" />
                <span className="text-[9px] font-bold text-slate-500">Đang đi: <span className="text-indigo-600 font-black ml-0.5">{bookingStats.onBoard}</span></span>
              </div>
          </div>
          
          <div className="flex items-center gap-4 hidden md:flex">
              <p className="text-[10px] font-bold text-slate-300 italic">Dữ liệu được cập nhật thời gian thực</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TripDetailModal;
