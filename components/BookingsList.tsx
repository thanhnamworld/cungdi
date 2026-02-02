import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Clock, MapPin, Trash2, Map as MapIcon, Navigation, ExternalLink, 
  Calendar, AlertCircle, XCircle, Loader2, CheckCircle2, ArrowUpDown, Search, RefreshCcw, Car, ArrowRight, Ban, Phone, Ticket, ShoppingBag, ListChecks, FileText, User, LayoutGrid, LayoutList, Star, Sparkles, Radio, Users, Zap, Filter, ClipboardList, Info, ChevronDown, Check, CalendarDays, Send, History
} from 'lucide-react';
import { Booking, Trip, TripStatus, Profile } from '../types'; 
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown, getVehicleConfig, getTripStatusDisplay, statusFilterOptions, TripCard } from './SearchTrips';
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

  const filteredMyTrips = useMemo(() => {
    if (viewMode !== 'MY_POSTS') return [];
    const searchNormalized = searchTerm.toLowerCase().trim();
    
    // Filter trips where user is driver
    const myTrips = trips.filter(t => t.driver_id === profile?.id);

    return myTrips.filter(t => {
        const tripCode = t.trip_code || `T${t.id.substring(0, 5).toUpperCase()}`;
        const route = `${t.origin_name} ${t.dest_name}`.toLowerCase();
        
        const matchesSearch = tripCode.includes(searchTerm.toUpperCase()) || route.includes(searchNormalized);
        const matchesStatus = statusFilter.includes('ALL') || statusFilter.includes(t.status);
        
        return matchesSearch && matchesStatus;
    });
  }, [trips, profile, viewMode, searchTerm, statusFilter]);

  // Sort logic applied to whichever list is active
  const sortedItems = useMemo(() => {
    let items = viewMode === 'BOOKINGS' ? [...filteredBookings] : [...filteredMyTrips];
    
    items.sort((a: any, b: any) => {
        // Priority Sort: Time first
        if (sortOrder === 'NEWEST') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        
        // Custom Sort Config
        if (sortConfig.key && sortConfig.direction) {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (sortConfig.key === 'total_price' || sortConfig.key === 'price') {
                valA = Number(valA); valB = Number(valB);
            }
            
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    return items;
  }, [filteredBookings, filteredMyTrips, viewMode, sortOrder, sortConfig]);

  const groupedItems = useMemo(() => {
    const today: any[] = [];
    const future: any[] = [];
    const past: any[] = [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    for (const item of sortedItems) {
        // For Bookings: use trip departure if avail, else created_at
        // For Trips: use departure_time
        let dateToCheck: Date;
        let isPastStatus = false;

        if (viewMode === 'BOOKINGS') {
            const trip = getTripFromBooking(item);
            dateToCheck = trip ? new Date(trip.departure_time) : new Date(item.created_at);
            if (item.status === 'CANCELLED' || item.status === 'EXPIRED' || (trip && (trip.status === 'COMPLETED' || trip.status === 'CANCELLED'))) {
                isPastStatus = true;
            }
        } else {
            dateToCheck = new Date((item as Trip).departure_time);
            if ((item as Trip).status === 'COMPLETED' || (item as Trip).status === 'CANCELLED') {
                isPastStatus = true;
            }
        }

        if (isPastStatus || dateToCheck < startOfToday) {
            past.push(item);
        } else if (dateToCheck >= startOfToday && dateToCheck <= endOfToday) {
            today.push(item);
        } else {
            future.push(item);
        }
    }
    return { today, future, past };
  }, [sortedItems, viewMode, trips]);

  const handlePassengerCancel = async (bookingId: string) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn này?')) return;
    setActionLoading(bookingId);
    try {
        const { error } = await supabase.from('bookings').update({ status: 'CANCELLED' }).eq('id', bookingId);
        if (error) throw error;
        
        // Restore seats
        const booking = bookings.find(b => b.id === bookingId);
        if (booking && booking.status === 'CONFIRMED') {
             const trip = trips.find(t => t.id === booking.trip_id);
             if (trip) {
                 await supabase.from('trips').update({ available_seats: trip.available_seats + booking.seats_booked }).eq('id', trip.id);
             }
        }

        if (onRefresh) onRefresh();
        showAlert({ title: 'Đã hủy đơn', message: 'Đơn hàng của bạn đã được hủy thành công.', variant: 'success' });
    } catch (err: any) {
        showAlert({ title: 'Lỗi', message: err.message, variant: 'danger' });
    } finally {
        setActionLoading(null);
    }
  };

  const renderBookingCard = (booking: Booking) => {
    const trip = getTripFromBooking(booking);
    const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
    const tripCode = trip?.trip_code || (trip?.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '---');
    const { pickup, dropoff } = extractLocations(booking.note);
    const isRequest = trip?.is_request;
    const vehicleName = trip?.vehicle_info || 'Xe';
    const priceColor = 'text-orange-600';
    
    const depTime = trip ? new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const depDate = trip ? new Date(trip.departure_time).toLocaleDateString('vi-VN') : '--/--';

    // Logic to show Completed if trip is completed, regardless of booking status
    const isTripCompleted = trip?.status === TripStatus.COMPLETED;
    const isBookingActive = ['CONFIRMED', 'PICKED_UP', 'ON_BOARD'].includes(booking.status);
    const showCompletedBadge = isTripCompleted && isBookingActive;

    return (
        <div key={booking.id} className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-lg transition-all mb-4 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shrink-0">
                        <Ticket size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">Đơn #{bookingCode}</span>
                            <CopyableCode code={bookingCode} className="text-slate-400" label="" />
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{vehicleName} • {tripCode}</p>
                    </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    {actionLoading === booking.id ? (
                        <Loader2 className="animate-spin text-slate-400" size={16} />
                    ) : showCompletedBadge ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold z-10 bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default shadow-sm">
                            <CheckCircle2 size={10} />
                            <span>Hoàn thành</span>
                        </div>
                    ) : (
                        <PassengerBookingStatusSelector 
                            value={booking.status} 
                            onChange={() => handlePassengerCancel(booking.id)} 
                            disabled={booking.status === 'CANCELLED' || booking.status === 'EXPIRED' || booking.status === 'PICKED_UP' || booking.status === 'ON_BOARD'}
                        />
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-2 mb-3 relative pl-3">
                <div className="absolute left-[5px] top-1.5 bottom-1.5 w-0.5 bg-slate-100"></div>
                <div className="flex items-start gap-3 relative z-10">
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-indigo-500 mt-0.5 shrink-0"></div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-700 leading-tight">{pickup || trip?.origin_name}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{depTime} • {depDate}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 relative z-10">
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-emerald-500 mt-0.5 shrink-0"></div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-700 leading-tight">{dropoff || trip?.dest_name}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div className="flex items-center gap-3">
                    {trip?.driver_phone && (
                        <a href={`tel:${trip.driver_phone}`} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all">
                            <Phone size={14} />
                        </a>
                    )}
                    <div className="text-[10px]">
                        <p className="font-bold text-slate-700">{trip?.driver_name}</p>
                        <p className="text-slate-400">Tài xế</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-sm font-black ${priceColor}`}>
                        {new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">{booking.seats_booked} ghế</p>
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
                {group.map(item => viewMode === 'BOOKINGS' ? renderBookingCard(item as Booking) : <TripCard key={item.id} trip={item as Trip} onBook={() => {}} profile={profile} onViewTripDetails={onViewTripDetails} />)}
            </div>
        </section>
    );
  };

  return (
    <div className="space-y-4 animate-slide-up max-w-[1200px] mx-auto pb-20">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative group w-full md:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                    />
                </div>
                <div className="w-40 shrink-0">
                    <UnifiedDropdown 
                        label="Trạng thái" 
                        icon={ClipboardList} 
                        value={statusFilter} 
                        onChange={setStatusFilter}
                        width="w-full"
                        showCheckbox={true}
                        isStatus={true}
                        statusConfig={viewMode === 'BOOKINGS' ? bookingStatusOptions : undefined} // Use Trip status options for trips if needed, but here simple filter
                        options={[{label:'Tất cả', value:'ALL'}, ...(viewMode === 'BOOKINGS' ? bookingStatusOptions : [])]} 
                    />
                </div>
            </div>
        </div>

        {sortedItems.length > 0 ? (
            <>
                {renderGroup(groupedItems.today, 'Hôm nay', CalendarDays, { color: 'text-emerald-600', bgColor: 'bg-emerald-100' })}
                {renderGroup(groupedItems.future, 'Sắp tới', Send, { color: 'text-indigo-600', bgColor: 'bg-indigo-100' })}
                {renderGroup(groupedItems.past, 'Lịch sử', History, { color: 'text-slate-500', bgColor: 'bg-slate-100' })}
            </>
        ) : (
            <div className="py-20 text-center">
                <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-400">Không có dữ liệu nào</p>
            </div>
        )}
    </div>
  );
};

export default BookingsList;