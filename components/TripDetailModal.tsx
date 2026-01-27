
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Car, MapPin, Clock, Users, DollarSign, Calendar, Navigation, CheckCircle2, AlertCircle, Play, Timer, Ban, Phone, ArrowRight, Loader2, ListChecks, LucideIcon, Hash, CarFront, Zap, Crown, Shield, Trash2, Star, Radio, ArrowUpDown, Filter, ShieldCheck, Wifi, Snowflake, Droplets, Search, LayoutList, LayoutGrid, User, Info, MessageSquareQuote, ClipboardList, Check
} from 'lucide-react';
import { Trip, Booking, Profile, TripStatus } from '../types';
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
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
};

const TripDetailModal: React.FC<TripDetailModalProps> = ({ trip, currentBookings, profile, isOpen, onClose, onRefresh, showAlert }) => {
  const [actionLoadingBooking, setActionLoadingBooking] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); 
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
  const { bookedSeatsCount, availableSeatsCount, revenue } = useMemo(() => {
    if (!trip) return { bookedSeatsCount: 0, availableSeatsCount: 0, revenue: 0 };
    
    // Chỉ tính ghế từ các đơn đã XÁC NHẬN
    const confirmedBookings = currentBookings.filter(b => b.status === 'CONFIRMED');
    const booked = confirmedBookings.reduce((sum, b) => sum + b.seats_booked, 0);
    const available = trip.seats - booked;
    const totalRev = confirmedBookings.reduce((sum, b) => sum + b.total_price, 0);

    return { 
      bookedSeatsCount: booked, 
      availableSeatsCount: available < 0 ? 0 : available, 
      revenue: totalRev 
    };
  }, [currentBookings, trip]);

  // Tính toán số lượng xe nhận đang hoạt động (cho các tin đăng tìm xe)
  const activeBookingsCount = useMemo(() => {
    return currentBookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'EXPIRED').length;
  }, [currentBookings]);

  // Phân tách ghi chú có cấu trúc
  const parseBookingNote = (note?: string) => {
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
    return { pickup: null, dropoff: null, message: note };
  };

  const filteredAndSortedBookings = useMemo(() => {
    let result = [...currentBookings];
    const searchNormalized = removeAccents(searchTerm);
    
    if (statusFilter !== 'ALL') {
      result = result.filter(b => b.status === statusFilter);
    }

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

    // Ưu tiên hiển thị: PENDING -> ACTIVE -> ARCHIVED
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
  }, [currentBookings, searchTerm, statusFilter]);

  if (!isOpen || !trip) return null;

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
  const licensePlate = vehicleParts[1] ? vehicleParts[1].replace(')', '') : '';
  const vehicleConfig = getVehicleConfig(vehicleModel);
  const VIcon = trip.is_request ? CheckCircle2 : vehicleConfig.icon;

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
      const departureTime = new Date(currentTrip.departure_time);

      if (new Date() > departureTime || currentTrip.status === TripStatus.COMPLETED || currentTrip.status === TripStatus.CANCELLED) {
        showAlert({ title: 'Thao tác không hợp lệ', message: 'Không thể thay đổi trạng thái đơn cho chuyến xe đã kết thúc hoặc đã hủy.', variant: 'warning', confirmText: 'Đã hiểu' });
        return;
      }

      const { data: allTripBookings } = await supabase.from('bookings').select('id, status, seats_booked').eq('trip_id', tripId);
      const otherBookings = (allTripBookings || []).filter(b => b.id !== bookingId && b.status === 'CONFIRMED');
      const seatsUsedByOthers = otherBookings.reduce((sum, b) => sum + b.seats_booked, 0);
      
      let seatsUsedByThisBooking = newStatus === 'CONFIRMED' ? currentBooking.seats_booked : 0;
      const newAvailableSeats = currentTrip.seats - (seatsUsedByOthers + seatsUsedByThisBooking);

      if (newAvailableSeats < 0) {
        showAlert({ title: 'Không đủ chỗ', message: `Chuyến xe chỉ còn ${currentTrip.seats - seatsUsedByOthers} ghế trống.`, variant: 'warning', confirmText: 'Đã hiểu' });
        return;
      }

      let newTripStatus = currentTrip.status;
      if (newAvailableSeats <= 0) newTripStatus = TripStatus.FULL;
      else if (newAvailableSeats > 0 && newTripStatus === TripStatus.FULL) {
           const diffMins = Math.floor((departureTime.getTime() - new Date().getTime()) / 60000);
           newTripStatus = diffMins <= 60 && diffMins > 0 ? TripStatus.URGENT : TripStatus.PREPARING;
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

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-[1400px] h-[95vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div ref={modalRef} className="bg-white w-full h-full rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Sidebar Info */}
                <div className="lg:w-1/3 flex flex-col p-6 bg-slate-50 border-r border-slate-100 overflow-y-auto custom-scrollbar">
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <Info size={20} className="text-indigo-600" /> Chi tiết chuyến đi
                    </h3>
                    
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${statusInfo.style}`}>
                                {statusInfo.label}
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-indigo-600">{trip.price === 0 ? 'Thoả thuận' : new Intl.NumberFormat('vi-VN').format(trip.price) + 'đ'}</p>
                                <p className="text-[9px] font-bold text-slate-400">Giá mỗi ghế</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 relative">
                            <div className="absolute left-[7px] top-3 bottom-3 w-0.5 border-l border-dashed border-slate-200"></div>
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm mt-1"></div>
                                <div>
                                    <p className="text-xs font-black text-slate-800">{trip.origin_name}</p>
                                    <p className="text-[10px] text-slate-500">{depTime} • {depDate}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm mt-1"></div>
                                <div>
                                    <p className="text-xs font-black text-slate-800">{trip.dest_name}</p>
                                    <p className="text-[10px] text-slate-500">{arrTime} • {arrDate}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${vehicleConfig.style}`}>
                                    <VIcon size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">{vehicleModel}</p>
                                    {licensePlate && <p className="text-[10px] font-black text-slate-400">{licensePlate}</p>}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-800">{availableSeatsCount}/{trip.seats}</p>
                                <p className="text-[9px] font-bold text-slate-400">Ghế trống</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex-1 min-h-[250px]">
                        <iframe width="100%" height="100%" frameBorder="0" src={mapUrl} className="grayscale-[0.1]" title="Bản đồ lộ trình" />
                    </div>
                </div>

                {/* Orders Content */}
                <div className="lg:w-2/3 flex flex-col bg-white overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Quản lý đặt chỗ</h3>
                            <p className="text-[10px] text-slate-400">Hiển thị {filteredAndSortedBookings.length} đơn hàng</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Tìm tên, SĐT, mã đơn..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                            <div className="bg-slate-50 p-1 rounded-xl flex">
                                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><LayoutGrid size={16}/></button>
                                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><LayoutList size={16}/></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
                        {filteredAndSortedBookings.length > 0 ? (
                            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
                                {filteredAndSortedBookings.map((booking: any) => {
                                    const { pickup, dropoff, message } = parseBookingNote(booking.note);
                                    const isLoading = actionLoadingBooking === booking.id;
                                    const personName = booking.profiles?.full_name || 'Hành khách';
                                    const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;

                                    return (
                                        <div key={booking.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                                        {personName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-slate-800">{personName}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{bookingCode}</span>
                                                            {booking.passenger_phone && (
                                                                <a href={`tel:${booking.passenger_phone}`} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                                                                    <Phone size={10} /> {booking.passenger_phone}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-32">
                                                    {isLoading ? (
                                                        <div className="py-1 bg-slate-50 rounded-lg flex justify-center"><Loader2 size={12} className="animate-spin text-indigo-500"/></div>
                                                    ) : (
                                                        <BookingStatusSelector 
                                                            value={booking.status} 
                                                            onChange={val => handleUpdateBookingStatus(booking.id, val)}
                                                            disabled={trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-slate-50 mb-3">
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Điểm đón/trả</p>
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">📍 {pickup || trip.origin_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">🏁 {dropoff || trip.dest_name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Chi phí</p>
                                                    <p className="text-xs font-black text-emerald-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</p>
                                                    <p className="text-[10px] font-bold text-slate-500">{booking.seats_booked} Ghế</p>
                                                </div>
                                            </div>

                                            {message && (
                                                <div className="flex gap-2 p-2 bg-amber-50/50 rounded-xl">
                                                    <MessageSquareQuote size={12} className="text-amber-500 shrink-0" />
                                                    <p className="text-[10px] text-slate-600 line-clamp-2 italic">"{message}"</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <ClipboardList size={40} className="mx-auto text-slate-200 mb-3" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không có đơn hàng nào</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 rounded-b-[32px]">
                <div className="flex gap-8">
                    <div className="text-center sm:text-left">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doanh thu dự kiến</p>
                        <p className="text-xl font-black text-emerald-600 font-outfit">{new Intl.NumberFormat('vi-VN').format(revenue)}đ</p>
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng khách</p>
                        <p className="text-xl font-black text-slate-800 font-outfit">{bookedSeatsCount} Ghế</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-full sm:w-auto px-10 py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all">Đóng chi tiết</button>
            </div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 md:-top-4 md:-right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:rotate-90 transition-all duration-300 z-[210]">
          <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default TripDetailModal;
