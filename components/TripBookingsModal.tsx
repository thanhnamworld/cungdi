import React, { useState, useMemo } from 'react';
import { X, Users, Phone, CheckCircle2, XCircle, Trash2, Loader2, Navigation } from 'lucide-react';
import { Trip, Booking, TripStatus } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';

interface TripBookingsModalProps {
  trip: Trip;
  bookings: Booking[];
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const TripBookingsModal: React.FC<TripBookingsModalProps> = ({ trip, bookings, isOpen, onClose, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- LOGIC TÍNH TOÁN GHẾ & DOANH THU CHÍNH XÁC ---
  const { bookedSeatsCount, availableSeatsCount, revenue } = useMemo(() => {
    if (!trip) return { bookedSeatsCount: 0, availableSeatsCount: 0, revenue: 0 };
    
    // Chỉ tính ghế từ các đơn đã XÁC NHẬN
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
    const booked = confirmedBookings.reduce((sum, b) => sum + b.seats_booked, 0);
    const available = trip.seats - booked;
    const totalRev = confirmedBookings.reduce((sum, b) => sum + b.total_price, 0);

    return { 
      bookedSeatsCount: booked, 
      availableSeatsCount: available < 0 ? 0 : available, 
      revenue: totalRev 
    };
  }, [bookings, trip]);

  if (!isOpen) return null;

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

      const currentTrip = Array.isArray(currentBooking.trips) ? currentBooking.trips[0] : currentBooking.trips;
      const seatsBooked = currentBooking.seats_booked;
      const oldBookingStatus = currentBooking.status;
      let newAvailableSeats = currentTrip.available_seats;
      let newTripStatus = currentTrip.status;
      const now = new Date();
      const departureTime = new Date(currentTrip.departure_time);

      if (departureTime < now || currentTrip.status === TripStatus.COMPLETED || currentTrip.status === TripStatus.CANCELLED) {
        alert('Không thể thay đổi trạng thái đơn hàng cho chuyến xe đã khởi hành, đã hoàn thành hoặc đã bị hủy.');
        setActionLoading(null);
        return;
      }

      if (newStatus === 'CONFIRMED' && oldBookingStatus !== 'CONFIRMED') {
        newAvailableSeats = currentTrip.available_seats - seatsBooked;
      } else if (oldBookingStatus === 'CONFIRMED' && newStatus !== 'CONFIRMED') {
        newAvailableSeats = currentTrip.available_seats + seatsBooked;
      }

      if (newAvailableSeats < 0) {
        alert('Không đủ chỗ trống để xác nhận đơn hàng này.');
        setActionLoading(null);
        return;
      }

      if (newAvailableSeats <= 0 && newTripStatus !== TripStatus.FULL) {
        newTripStatus = TripStatus.FULL;
      } else if (newAvailableSeats > 0 && newTripStatus === TripStatus.FULL) {
        const diffMins = Math.floor((departureTime.getTime() - now.getTime()) / 60000);
        if (diffMins <= 60 && diffMins > 0) {
          newTripStatus = TripStatus.URGENT;
        } else if (diffMins <= 360 && diffMins > 0) {
          newTripStatus = TripStatus.PREPARING;
        } else {
          newTripStatus = TripStatus.PREPARING;
        }
      }

      const { error: updateBookingError } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (updateBookingError) throw updateBookingError;

      if (newAvailableSeats !== currentTrip.available_seats || newTripStatus !== currentTrip.status) {
        const { error: updateTripError } = await supabase
          .from('trips')
          .update({ available_seats: newAvailableSeats, status: newTripStatus })
          .eq('id', currentTrip.id);
        if (updateTripError) console.error("Error updating trip seats:", updateTripError);
      }
      
      onRefresh();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBooking = async (bookingId: string, seatsBooked: number, currentBookingStatus: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return;
    
    setDeletingId(bookingId);
    try {
      const { data: bookingToDelete, error: fetchBookingError } = await supabase
        .from('bookings')
        .select('trip_id')
        .eq('id', bookingId)
        .single();
      
      if (fetchBookingError) throw fetchBookingError;
      if (!bookingToDelete) throw new Error('Không tìm thấy đơn hàng để xóa.');

      const { data: currentTrip, error: fetchTripError } = await supabase
        .from('trips')
        .select('id, available_seats, status, departure_time')
        .eq('id', bookingToDelete.trip_id)
        .single();
      
      if (fetchTripError) throw fetchTripError;
      if (!currentTrip) throw new Error('Không tìm thấy chuyến xe liên quan.');

      const now = new Date();
      const departureTime = new Date(currentTrip.departure_time);

      if (departureTime < now || currentTrip.status === TripStatus.COMPLETED || currentTrip.status === TripStatus.CANCELLED) {
        alert('Không thể xóa đơn hàng cho chuyến xe đã khởi hành, đã hoàn thành hoặc đã bị hủy.');
        setDeletingId(null);
        return;
      }

      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (deleteError) throw deleteError;

      if (currentBookingStatus === 'CONFIRMED') {
        const newAvailableSeats = currentTrip.available_seats + seatsBooked;
        let newTripStatus = currentTrip.status;

        if (currentTrip.status === TripStatus.FULL && newAvailableSeats > 0) {
          const diffMins = Math.floor((departureTime.getTime() - now.getTime()) / 60000);
          if (diffMins <= 60 && diffMins > 0) {
            newTripStatus = TripStatus.URGENT;
          } else if (diffMins <= 360 && diffMins > 0) {
            newTripStatus = TripStatus.PREPARING;
          } else {
            newTripStatus = TripStatus.PREPARING;
          }
        }
        
        const { error: updateTripError } = await supabase
          .from('trips')
          .update({ available_seats: newAvailableSeats, status: newTripStatus })
          .eq('id', currentTrip.id);
        if (updateTripError) console.error("Error updating trip seats:", updateTripError);
      }
      onRefresh();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const tripCode = `T${trip.id.substring(0, 5).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="bg-white w-full h-full rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 bg-indigo-600 text-white shrink-0">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                    <Users size={20} />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black italic tracking-tight font-outfit">Danh sách Hành khách</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <CopyableCode code={tripCode} className="text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100" />
                    <span className="text-white/40 hidden md:inline">•</span>
                    <p className="text-[10px] md:text-xs font-bold text-indigo-100 flex items-center gap-1.5 uppercase tracking-wider truncate max-w-[250px] md:max-w-none">
                        <Navigation size={12} /> {trip.origin_name} → {trip.dest_name}
                    </p>
                </div>
                </div>
            </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-4 bg-slate-50">
            {bookings.length > 0 ? (
                <>
                {/* Mobile List View */}
                <div className="block md:hidden space-y-3">
                    {bookings.map((booking: any) => {
                    const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
                    const isLoading = actionLoading === booking.id;
                    const isDeleting = deletingId === booking.id;
                    return (
                        <div key={booking.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-black border border-emerald-100 text-xs">
                                {booking.profiles?.full_name?.charAt(0) || 'P'}
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900 truncate font-outfit max-w-[120px]">{booking.profiles?.full_name || 'Khách vãng lai'}</p>
                                <CopyableCode code={bookingCode} className="text-[9px] font-bold text-slate-400" label={bookingCode} />
                            </div>
                            </div>
                            <span className={`inline-flex px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${
                            booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            booking.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                            {booking.status === 'CONFIRMED' ? 'Đã xác nhận' : booking.status === 'CANCELLED' ? 'Huỷ' : 'Chờ duyệt'}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-50">
                            <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ghế đặt</p>
                            <p className="text-sm font-black text-slate-800">{booking.seats_booked} Ghế</p>
                            </div>
                            <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng tiền</p>
                            <p className="text-sm font-black text-emerald-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                            {booking.passenger_phone && (
                                <a href={`tel:${booking.passenger_phone}`} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                                    <Phone size={14} />
                                </a>
                            )}
                            <span className="text-xs font-bold text-slate-600">{booking.passenger_phone || 'N/A'}</span>
                            </div>
                            <div className="flex gap-2">
                            {isLoading ? (
                                <Loader2 className="animate-spin text-indigo-600" size={18} />
                            ) : (
                                <>
                                {booking.status !== 'CONFIRMED' && (
                                    <button onClick={() => handleUpdateStatus(booking.id, 'CONFIRMED')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100"><CheckCircle2 size={18} /></button>
                                )}
                                {booking.status !== 'CANCELLED' && (
                                    <button onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')} className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100"><XCircle size={18} /></button>
                                )}
                                <button onClick={() => handleDeleteBooking(booking.id, booking.seats_booked, booking.status)} disabled={isDeleting} className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                                    {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                </button>
                                </>
                            )}
                            </div>
                        </div>
                        </div>
                    );
                    })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hành khách / Mã Đơn</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ghế / Giá</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {bookings.map((booking: any) => {
                        const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
                        const isLoading = actionLoading === booking.id;
                        const isDeleting = deletingId === booking.id;

                        return (
                            <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-black border border-emerald-100 text-sm">
                                    {booking.profiles?.full_name?.charAt(0) || 'P'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900 truncate font-outfit">{booking.profiles?.full_name || 'Khách vãng lai'}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                    <CopyableCode code={bookingCode} className="text-[9px] font-black bg-cyan-50 text-cyan-700 px-2 py-0.5 border border-cyan-100 rounded uppercase tracking-tighter" />
                                    <div className="flex items-center gap-2">
                                        {booking.passenger_phone && (
                                        <a href={`tel:${booking.passenger_phone}`} className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0" title="Gọi điện">
                                            <Phone size={8} />
                                        </a>
                                        )}
                                        <span className="text-[10px] font-bold text-indigo-600">{booking.passenger_phone || 'N/A'}</span>
                                    </div>
                                    </div>
                                </div>
                                </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                                <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 font-outfit">{booking.seats_booked} Ghế</span>
                                <span className="text-[10px] font-black text-indigo-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                                <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                booking.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                {booking.status === 'CONFIRMED' ? 'Đã xác nhận' : booking.status === 'CANCELLED' ? 'Huỷ' : 'Chờ duyệt'}
                                </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                {isLoading ? (
                                    <Loader2 className="animate-spin text-indigo-600" size={18} />
                                ) : (
                                    <>
                                    {booking.status !== 'CONFIRMED' && (
                                        <button onClick={() => handleUpdateStatus(booking.id, 'CONFIRMED')} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100">
                                        <CheckCircle2 size={16} />
                                        </button>
                                    )}
                                    {booking.status !== 'CANCELLED' && (
                                        <button onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all border border-amber-100">
                                        <XCircle size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteBooking(booking.id, booking.seats_booked, booking.status)} disabled={isDeleting} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100">
                                        {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                    </button>
                                    </>
                                )}
                                </div>
                            </td>
                            </tr>
                        );
                        })}
                    </tbody>
                    </table>
                </div>
                </>
            ) : (
                <div className="py-24 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200">
                <Users className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-lg font-black text-slate-400 uppercase tracking-widest font-outfit">Chưa có khách đặt chỗ</p>
                <p className="text-slate-300 text-sm mt-1 font-bold">Danh sách hành khách sẽ hiển thị ở đây khi có đơn hàng mới.</p>
                </div>
            )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0 rounded-b-[40px]">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-6 w-full md:w-auto justify-center md:justify-start">
                    <div className="text-center">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Trạng thái ghế</p>
                    <p className="text-lg md:text-xl font-black text-slate-900 font-outfit">
                        Còn {availableSeatsCount}/{trip.seats} ghế trống
                    </p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-center">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Doanh thu</p>
                    <p className="text-lg md:text-xl font-black text-emerald-600 font-outfit">
                        {new Intl.NumberFormat('vi-VN').format(revenue)}đ
                    </p>
                    </div>
                </div>
                <button 
                onClick={onClose}
                className="w-full md:w-auto px-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all font-outfit"
                >
                Đóng cửa sổ
                </button>
            </div>
            </div>
        </div>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 md:-top-4 md:-right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[160] border-2 border-white"
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default TripBookingsModal;