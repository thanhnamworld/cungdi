
import React, { useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Calendar, Filter, Search, 
  Car, CheckCircle2, Award, Zap, ChevronDown, BarChart3, PieChart as PieChartIcon, ArrowUpRight,
  CalendarRange, ChevronLeft, ChevronRight, Clock, MapPin, Navigation, Info, Users as UsersIcon, Play, CalendarDays, ClipboardList, User
} from 'lucide-react';
import { Trip, Booking, Profile } from '../types';
import { UnifiedDropdown, TripCard, statusFilterOptions } from './SearchTrips';

// --- Colors for Charts ---
const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];

// --- Helper Functions ---
const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + 'đ';

// --- Sub-components ---

// COMPACT STAT CARD: Horizontal layout to save vertical space
const StatCard = ({ title, value, subValue, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-3 md:p-4 rounded-[20px] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group h-full">
    <div className="flex flex-col justify-center">
      <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">{title}</h3>
      <div className="flex items-baseline gap-2">
        <p className="text-lg md:text-xl font-black text-slate-800 tracking-tight">{value}</p>
        {trend && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
            <TrendingUp size={8} className={trend < 0 ? 'rotate-180' : ''} />
          </span>
        )}
      </div>
      {subValue && <p className="text-[9px] text-slate-500 font-medium mt-0.5">{subValue}</p>}
    </div>
    <div className={`p-2.5 rounded-xl ${color.bg} ${color.text} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
      <Icon size={18} />
    </div>
  </div>
);

// --- NEW: Driver Schedule Component (Gantt Style - Ultra Compact) ---
const DriverSchedule = ({ trips, bookings, profile, onViewTripDetails }: { trips: Trip[], bookings: Booking[], profile?: Profile | null, onViewTripDetails: (trip: Trip) => void }) => {
  // Tooltip State
  const [tooltipData, setTooltipData] = useState<{ trip: Trip, x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleTrips = useMemo(() => {
    return trips.filter(t => t.status !== 'CANCELLED');
  }, [trips]);

  const daysToRender = useMemo(() => {
    if (visibleTrips.length === 0) {
      return [];
    }
    const dates = visibleTrips.map(t => new Date(t.departure_time));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);
    
    const days = [];
    let currentDatePointer = new Date(minDate);
    
    while (currentDatePointer <= maxDate) {
        days.push(new Date(currentDatePointer));
        currentDatePointer.setDate(currentDatePointer.getDate() + 1);
    }
    return days;
  }, [visibleTrips]);

  // Helper to calculate bar position and width
  const getTripStyle = (trip: Trip) => {
    const dep = new Date(trip.departure_time);
    const arr = trip.arrival_time 
      ? new Date(trip.arrival_time) 
      : new Date(dep.getTime() + 3 * 60 * 60 * 1000); // Default 3h

    const startHour = dep.getHours() + dep.getMinutes() / 60;
    const endHour = arr.getHours() + arr.getMinutes() / 60;
    
    let duration = endHour - startHour;
    if (duration < 0) duration += 24; 
    if (duration < 0.2) duration = 0.2; // Min width

    const left = (startHour / 24) * 100;
    const width = (duration / 24) * 100;

    return {
      left: `${left}%`,
      width: `${width}%`
    };
  };

  const getTripsForSpecificDay = (day: Date) => {
    return visibleTrips.filter(t => {
      const tripDate = new Date(t.departure_time);
      return tripDate.getDate() === day.getDate() && tripDate.getMonth() === day.getMonth() && tripDate.getFullYear() === day.getFullYear();
    });
  };

  // --- Interaction Logic ---
  const handleMouseEnter = (e: React.MouseEvent, trip: Trip) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    
    setTooltipData(prev => {
        if (prev?.trip.id === trip.id) return prev;
        return {
            trip,
            x: e.clientX,
            y: e.clientY
        };
    });
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
        setTooltipData(null);
    }, 300);
  };

  const handleTooltipMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleTooltipMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
        setTooltipData(null);
    }, 300);
  };

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm h-full flex flex-col overflow-hidden relative" ref={containerRef}>
      {/* Header Controls */}
      <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-white z-20">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <CalendarRange size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">Lịch xe chạy</h3>
            <p className="text-[10px] text-slate-500">Timeline</p>
          </div>
        </div>
      </div>

      {visibleTrips.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 min-h-[400px]">
          <Car size={64} className="mb-4 opacity-10" />
          <p className="text-sm font-bold uppercase tracking-wider">Không có chuyến xe nào khớp bộ lọc trong tháng này</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50/30">
          <div className="min-w-[1000px] relative pb-10">
            
            {/* Timeline Header (Hours) */}
            <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm h-6">
              <div className="w-12 shrink-0 border-r border-slate-200 bg-slate-50 flex items-center justify-center text-[9px] font-bold text-slate-500 uppercase">Ngày</div>
              <div className="flex-1 relative">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100 flex items-center justify-center" style={{ left: `${(i / 24) * 100}%`, width: `${100/24}%` }}>
                    <span className="text-[7px] font-bold text-slate-400">{i}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Days Rows */}
            <div className="relative">
              {daysToRender.map((day) => {
                const dayTrips = getTripsForSpecificDay(day);
                const isToday = day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth() && day.getFullYear() === new Date().getFullYear();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div key={day.toISOString()} className={`flex h-6 border-b border-slate-200 group hover:bg-white transition-colors relative ${isToday ? 'bg-blue-50' : ''}`}>
                    <div className={`w-12 shrink-0 border-r border-slate-200 flex items-center justify-center gap-1 z-10 sticky left-0 ${isToday ? 'bg-blue-100 text-blue-700' : 'bg-slate-50/50 text-slate-500'}`}>
                      <span className={`text-[10px] font-bold ${isWeekend && !isToday ? 'text-rose-500' : ''}`}>
                        {day.getDate()}
                      </span>
                      <span className="text-[7px] font-bold uppercase opacity-70">
                        {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
                      </span>
                    </div>

                    <div className="flex-1 relative">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="absolute top-0 bottom-0 border-l border-white pointer-events-none" 
                          style={{ left: `${(i / 24) * 100}%` }}
                        ></div>
                      ))}

                      {dayTrips.map(trip => {
                        const style = getTripStyle(trip);
                        const isCompleted = trip.status === 'COMPLETED';
                        const isRunning = trip.status === 'ON_TRIP';
                        
                        return (
                          <div
                            key={trip.id}
                            onMouseEnter={(e) => handleMouseEnter(e, trip)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => onViewTripDetails(trip)}
                            className={`absolute top-[4px] bottom-[4px] rounded shadow-sm overflow-hidden cursor-pointer hover:brightness-110 hover:shadow-md hover:z-50 hover:scale-y-150 transition-all ${
                              isRunning 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse-blue ring-1 ring-blue-300' 
                                : isCompleted 
                                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500' 
                                  : 'bg-gradient-to-r from-violet-400 to-fuchsia-500'
                            }`}
                            style={style}
                          >
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      <div className="p-2 border-t border-slate-100 bg-white rounded-b-[24px] flex items-center justify-center gap-6 text-[9px] font-bold text-slate-500">
          <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-gradient-to-r from-violet-400 to-fuchsia-500"></div> Sắp chạy
          </div>
          <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-gradient-to-r from-blue-500 to-indigo-500"></div> Đang chạy
          </div>
          <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-gradient-to-r from-emerald-400 to-teal-500"></div> Hoàn thành
          </div>
      </div>

      {tooltipData && createPortal(
        (() => {
          const cardWidth = 320;
          const cardHeight = 350;
          let left = tooltipData.x + 20;
          let top = tooltipData.y - 20;

          if (left + cardWidth > window.innerWidth) {
              left = tooltipData.x - cardWidth - 20;
          }
          if (top + cardHeight > window.innerHeight) {
              top = window.innerHeight - cardHeight - 10;
          }

          return (
            <div 
                className="fixed z-[9999] pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
                style={{ left, top }}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
            >
                <div className="w-[320px] shadow-2xl rounded-[24px] ring-2 ring-white/50 backdrop-blur-3xl bg-white/95">
                   <TripCard 
                      trip={tooltipData.trip} 
                      onBook={() => onViewTripDetails(tooltipData.trip)} 
                      userBookings={bookings}
                      profile={profile || null} 
                      onViewTripDetails={onViewTripDetails} 
                   />
                </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

interface DashboardProps {
  bookings: Booking[];
  trips: Trip[];
  profile?: Profile | null;
  onViewTripDetails?: (trip: Trip) => void;
  currentView?: 'overview' | 'schedule'; 
}

const Dashboard: React.FC<DashboardProps> = ({ bookings, trips, profile, onViewTripDetails, currentView = 'overview' }) => {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'THIS_MONTH' | 'ALL'>('THIS_MONTH');
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState<string[]>(['ALL']); // UPDATED: Changed from ['956 Xanh'] to ['ALL']
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [vehicleFilter, setVehicleFilter] = useState<string[]>(['ALL']);

  const uniqueDrivers = useMemo(() => {
    const drivers = new Set<string>();
    trips.forEach(trip => {
      if (trip.driver_name) drivers.add(trip.driver_name);
    });
    return [{ label: 'Tất cả tài xế', value: 'ALL' }, ...Array.from(drivers).map(name => ({ label: name, value: name }))];
  }, [trips]);

  const uniqueVehicles = useMemo(() => {
    const vehicles = new Set<string>();
    trips.forEach(trip => {
        const parts = (trip.vehicle_info || '').split('(');
        const plate = parts.length > 1 ? parts[1].replace(')', '').trim() : '';
        const driver = trip.driver_name || '';
        
        if (plate && driver) {
            vehicles.add(`${plate} ✧ ${driver}`);
        }
    });
    return [{ label: 'Tất cả xe', value: 'ALL' }, ...Array.from(vehicles).map(name => ({ label: name, value: name }))];
  }, [trips]);

  // Unified filtering logic for both bookings and trips
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (timeRange === '7D') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (timeRange === '30D') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (timeRange === 'THIS_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else { // 'ALL'
      startDate = new Date(0);
      endDate = new Date(8640000000000000);
    }

    const searchLower = searchTerm.toLowerCase();

    const filterFn = (item: Booking | Trip) => {
        const isBooking = 'passenger_id' in item;
        const trip = isBooking ? (item as any).trips : item;
        
        if (!trip) return false;

        // Use driver_profile.full_name if available (from join), else fallback to driver_name
        const driverName = trip?.driver_profile?.full_name || trip?.driver_name || '';
        const vehicleInfo = trip?.vehicle_info || '';
        const tripStatus = trip?.status;
        
        const isSearchValid = !searchTerm || 
                              driverName.toLowerCase().includes(searchLower) || 
                              vehicleInfo.toLowerCase().includes(searchLower);

        const isDriverValid = driverFilter.includes('ALL') || (driverName && driverFilter.includes(driverName));
        const isStatusValid = statusFilter.includes('ALL') || (tripStatus && statusFilter.includes(tripStatus));

        const isVehicleValid = vehicleFilter.includes('ALL') || (() => {
            const parts = (vehicleInfo || '').split('(');
            const plate = parts.length > 1 ? parts[1].replace(')', '').trim() : '';
            const driver = driverName || '';
            const key = `${plate} ✧ ${driver}`;
            return key ? vehicleFilter.includes(key) : false;
        })();

        return isSearchValid && isDriverValid && isStatusValid && isVehicleValid;
    };
    
    const validBookings = bookings.filter(b => {
      const bDate = new Date(b.created_at);
      const effectiveEndDate = (timeRange === '7D' || timeRange === '30D') ? now : endDate;
      const isTimeValid = bDate >= startDate && bDate <= effectiveEndDate;
      const isBookingStatusValid = b.status === 'CONFIRMED' || b.status === 'COMPLETED' || b.status === 'PICKED_UP' || b.status === 'ON_BOARD';
      return isTimeValid && isBookingStatusValid && filterFn(b);
    });

    const validTrips = trips.filter(t => {
      const tripDate = new Date(t.departure_time);
      const isTimeValid = tripDate >= startDate && tripDate <= endDate;
      return isTimeValid && filterFn(t);
    });

    return { bookings: validBookings, trips: validTrips, startDate };
  }, [bookings, trips, timeRange, searchTerm, driverFilter, statusFilter, vehicleFilter]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.bookings.reduce((sum, b) => sum + b.total_price, 0);
    const totalBookings = filteredData.bookings.length;
    const totalSeats = filteredData.bookings.reduce((sum, b) => sum + b.seats_booked, 0);
    const activeDrivers = new Set(filteredData.bookings.map(b => (b as any).trips?.driver_id)).size;
    return { totalRevenue, totalBookings, totalSeats, activeDrivers };
  }, [filteredData.bookings]);

  const revenueByDateData = useMemo(() => {
    const map = new Map<string, number>();
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 30;
    
    if (timeRange !== 'ALL') {
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            map.set(key, 0);
        }
    }

    filteredData.bookings.forEach(b => {
        const date = new Date(b.created_at);
        const key = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        map.set(key, (map.get(key) || 0) + b.total_price);
    });

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredData.bookings, timeRange]);

  const revenueByDriverData = useMemo(() => {
    const map = new Map<string, { revenue: number, trips: number, avatar: string }>();
    
    filteredData.bookings.forEach(b => {
        const trip = (b as any).trips;
        const name = trip?.driver_profile?.full_name || trip?.driver_name || 'Không tên';
        const current = map.get(name) || { revenue: 0, trips: 0, avatar: name.charAt(0) };
        map.set(name, {
            revenue: current.revenue + b.total_price,
            trips: current.trips + 1,
            avatar: current.avatar
        });
    });

    return Array.from(map.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
  }, [filteredData.bookings]);

  const revenueByVehicleData = useMemo(() => {
    const map = new Map<string, number>();
    
    filteredData.bookings.forEach(b => {
        const trip = (b as any).trips;
        const rawType = (trip?.vehicle_info || 'Khác').split(' (')[0].trim();
        let type = rawType;
        if (rawType.includes('Sedan') || rawType.includes('4 chỗ')) type = 'Sedan 4 chỗ';
        else if (rawType.includes('SUV') || rawType.includes('7 chỗ')) type = 'SUV 7 chỗ';
        else if (rawType.includes('Limousine')) type = 'Limousine';
        
        map.set(type, (map.get(type) || 0) + b.total_price);
    });

    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [filteredData.bookings]);

  return (
    <div className="space-y-4 pb-20 animate-slide-up max-w-[1600px] mx-auto h-[calc(100vh-140px)] flex flex-col">
      
      <div className="bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-100 p-5 rounded-[32px] shadow-sm space-y-4 backdrop-blur-sm relative z-30 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-3 w-full md:flex-1">
               <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                  <input 
                    type="text" placeholder="Tìm kiếm nhanh..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 h-[42px] bg-white/80 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50/50" 
                  />
               </div>
               
                <div className="flex-1 md:w-48 md:flex-none shrink-0">
                    <UnifiedDropdown 
                      label="Thời gian" icon={CalendarDays} value={timeRange} width="w-full" showCheckbox={false}
                      options={[
                        { label: '7 Ngày qua', value: '7D' },
                        { label: 'Tháng này', value: 'THIS_MONTH' },
                        { label: '30 Ngày qua', value: '30D' },
                        { label: 'Tất cả', value: 'ALL' }
                      ]}
                      onChange={(val: string) => setTimeRange(val as any)}
                    />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-3 w-full">
             <UnifiedDropdown 
                label="Tài xế" 
                icon={User} 
                value={driverFilter} 
                isDriver={true}
                width="w-full lg:w-48"
                showCheckbox={true}
                options={uniqueDrivers}
                onChange={setDriverFilter}
             />
             <UnifiedDropdown 
                label="Phương tiện" 
                icon={Car} 
                value={vehicleFilter} 
                width="w-full lg:w-48"
                showCheckbox={true}
                isVehicle={true}
                options={uniqueVehicles}
                onChange={setVehicleFilter}
             />
             <UnifiedDropdown 
                label="Trạng thái chuyến" 
                icon={ClipboardList} 
                value={statusFilter} 
                isStatus={true}
                statusConfig={statusFilterOptions}
                width="w-full lg:w-48"
                showCheckbox={true}
                options={statusFilterOptions}
                onChange={setStatusFilter}
             />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
        {currentView === 'overview' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                  title="TỔNG DOANH THU" 
                  value={formatCurrency(stats.totalRevenue)} 
                  subValue="Thực nhận (đã xác nhận)"
                  icon={DollarSign} 
                  color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }} 
                  trend={12.5}
              />
              <StatCard 
                  title="ĐƠN HÀNG" 
                  value={stats.totalBookings} 
                  subValue="Số lượng vé bán ra"
                  icon={CheckCircle2} 
                  color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }} 
                  trend={8.2}
              />
              <StatCard 
                  title="GHẾ ĐÃ BÁN" 
                  value={stats.totalSeats} 
                  subValue={`~${(stats.totalBookings > 0 ? stats.totalSeats/stats.totalBookings : 0).toFixed(1)} ghế/đơn`}
                  icon={Users} 
                  color={{ bg: 'bg-amber-50', text: 'text-amber-600' }} 
              />
              <StatCard 
                  title="TÀI XẾ" 
                  value={stats.activeDrivers} 
                  subValue="Có doanh thu trong kỳ"
                  icon={Car} 
                  color={{ bg: 'bg-sky-50', text: 'text-sky-600' }} 
              />
            </div>

            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Calendar size={14} className="text-indigo-500" />
                      Biểu đồ doanh thu
                  </h3>
              </div>
              <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueByDateData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} 
                              dy={10}
                          />
                          <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} 
                              tickFormatter={(value) => `${value / 1000000}M`}
                          />
                          <Tooltip 
                              contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                              itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '11px' }}
                              labelStyle={{ color: '#64748b', fontSize: '10px', marginBottom: '2px' }}
                              formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                          />
                          <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#6366f1" 
                              strokeWidth={2} 
                              fillOpacity={1} 
                              fill="url(#colorRevenue)" 
                              activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <Award size={14} className="text-amber-500" />
                          Top Tài xế
                      </h3>
                      <button className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors">Xem tất cả</button>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                      {revenueByDriverData.length > 0 ? revenueByDriverData.map((driver, index) => (
                          <div key={index} className="flex items-center gap-3 group p-1.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                              <div className="relative shrink-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] border ${
                                      index === 0 ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                      index === 1 ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                      index === 2 ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                      'bg-white text-slate-400 border-slate-100'
                                  }`}>
                                      {driver.avatar}
                                  </div>
                                  {index < 3 && (
                                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[7px] text-white font-bold border border-white ${
                                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-orange-500'
                                      }`}>
                                          {index + 1}
                                      </div>
                                  )}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="text-[11px] font-bold text-slate-800 truncate">{driver.name}</span>
                                      <span className="text-[11px] font-black text-indigo-600">{formatCurrency(driver.revenue)}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                          className={`h-full rounded-full transition-all duration-1000 ${
                                              index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 
                                              'bg-indigo-500 opacity-70'
                                          }`} 
                                          style={{ width: `${(driver.revenue / revenueByDriverData[0].revenue) * 100}%` }}
                                      ></div>
                                  </div>
                              </div>
                          </div>
                      )) : (
                          <div className="h-32 flex items-center justify-center text-slate-400 text-[10px] italic">Chưa có dữ liệu tài xế</div>
                      )}
                  </div>
              </div>

              <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <PieChartIcon size={14} className="text-emerald-500" />
                          Loại xe
                      </h3>
                  </div>
                  
                  <div className="flex flex-row items-center h-full gap-4">
                      <div className="h-[140px] w-[140px] relative shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={revenueByVehicleData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={40}
                                      outerRadius={60}
                                      paddingAngle={5}
                                      dataKey="value"
                                      stroke="none"
                                  >
                                      {revenueByVehicleData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip 
                                      formatter={(value: number) => formatCurrency(value)}
                                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '10px' }}
                                  />
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">Tổng</span>
                          </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-2 overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
                          {revenueByVehicleData.map((entry, index) => (
                              <div key={index} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                      <span className="text-[10px] font-bold text-slate-600 truncate">{entry.name}</span>
                                  </div>
                                  <div className="text-right pl-2">
                                      <p className="text-[10px] font-bold text-slate-800">{formatCurrency(entry.value)}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
            </div>
          </div>
        ) : (
          <DriverSchedule trips={filteredData.trips} bookings={bookings} profile={profile} onViewTripDetails={onViewTripDetails || (() => {})} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
