
import React, { useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Calendar, Filter, Search, 
  Car, CheckCircle2, Award, Zap, ChevronDown, BarChart3, PieChart as PieChartIcon, ArrowUpRight,
  CalendarRange, ChevronLeft, ChevronRight, Clock, MapPin, Navigation, Info, Users as UsersIcon, Play
} from 'lucide-react';
import { Trip, Booking, Profile } from '../types';
import { UnifiedDropdown, TripCard } from './SearchTrips';

// --- Colors for Charts ---
const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];

// --- Helper Functions ---
const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + 'đ';

// --- Sub-components ---

const StatCard = ({ title, value, subValue, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-full hover:shadow-lg transition-all duration-300 group">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-2xl ${color.bg} ${color.text} group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={22} />
      </div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
          <TrendingUp size={10} className={trend < 0 ? 'rotate-180' : ''} />
        </span>
      )}
    </div>
    <div className="mt-4">
      <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-black text-slate-800 mt-1 tracking-tight">{value}</p>
      {subValue && <p className="text-xs text-slate-500 font-medium mt-1">{subValue}</p>}
    </div>
  </div>
);

// --- NEW: Driver Schedule Component (Gantt Style - Ultra Compact) ---
const DriverSchedule = ({ trips, bookings, profile, onViewTripDetails }: { trips: Trip[], bookings: Booking[], profile?: Profile | null, onViewTripDetails: (trip: Trip) => void }) => {
  // Mặc định chọn tài xế "956 Xanh"
  const [selectedDriver, setSelectedDriver] = useState<string>('956 Xanh');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Tooltip State
  const [tooltipData, setTooltipData] = useState<{ trip: Trip, x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get unique drivers
  const uniqueDrivers = useMemo(() => {
    const drivers = new Set<string>();
    trips.forEach(t => {
      if (t.driver_name) drivers.add(t.driver_name);
    });
    return Array.from(drivers).map(name => ({ label: name, value: name }));
  }, [trips]);

  // Filter trips
  const driverTrips = useMemo(() => {
    if (selectedDriver === 'ALL') return [];
    return trips.filter(t => t.driver_name === selectedDriver && t.status !== 'CANCELLED');
  }, [selectedDriver, trips]);

  // Days in Month Logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

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
    return driverTrips.filter(t => {
      const tripDate = new Date(t.departure_time);
      return tripDate.getDate() === day.getDate() && 
             tripDate.getMonth() === day.getMonth() && 
             tripDate.getFullYear() === day.getFullYear();
    });
  };

  // --- Interaction Logic ---
  const handleMouseEnter = (e: React.MouseEvent, trip: Trip) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    
    // Only set if not already showing this trip to prevent jitter
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
    // Delay closing to allow moving mouse into tooltip
    hoverTimeoutRef.current = setTimeout(() => {
        setTooltipData(null);
    }, 300); // 300ms grace period
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
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm h-full flex flex-col overflow-hidden relative" ref={containerRef}>
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
           <UnifiedDropdown 
              label="Chọn tài xế" 
              icon={Car} 
              value={selectedDriver} 
              onChange={setSelectedDriver} 
              width="w-full sm:w-56"
              options={[{ label: 'Chọn tài xế để xem', value: 'ALL' }, ...uniqueDrivers]} 
              isDriver={true}
              showCheckbox={false}
            />
            
            <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 h-[42px]">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-lg shadow-sm transition-all text-slate-500"><ChevronLeft size={14}/></button>
              <span className="px-3 text-[10px] font-bold text-slate-700 min-w-[70px] text-center">
                T{currentDate.getMonth() + 1}/{currentDate.getFullYear()}
              </span>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-lg shadow-sm transition-all text-slate-500"><ChevronRight size={14}/></button>
            </div>
        </div>
      </div>

      {selectedDriver === 'ALL' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 min-h-[400px]">
          <Car size={64} className="mb-4 opacity-10" />
          <p className="text-sm font-bold uppercase tracking-wider">Vui lòng chọn tài xế để xem lịch trình</p>
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

            {/* Days Rows - Ultra Compact Mode (h-6 = 24px) */}
            <div className="relative">
              {daysInMonth.map((day) => {
                const dayTrips = getTripsForSpecificDay(day);
                const isToday = day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth() && day.getFullYear() === new Date().getFullYear();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div key={day.toISOString()} className={`flex h-6 border-b border-slate-200 group hover:bg-white transition-colors relative ${isToday ? 'bg-blue-50' : ''}`}>
                    {/* Date Label (Left Column) - Ultra Compact */}
                    <div className={`w-12 shrink-0 border-r border-slate-200 flex items-center justify-center gap-1 z-10 sticky left-0 ${isToday ? 'bg-blue-100 text-blue-700' : 'bg-slate-50/50 text-slate-500'}`}>
                      <span className={`text-[10px] font-bold ${isWeekend && !isToday ? 'text-rose-500' : ''}`}>
                        {day.getDate()}
                      </span>
                      <span className="text-[7px] font-bold uppercase opacity-70">
                        {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
                      </span>
                    </div>

                    {/* Timeline Track (Right Column) */}
                    <div className="flex-1 relative">
                      {/* Grid Lines (White lines) */}
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="absolute top-0 bottom-0 border-l border-white pointer-events-none" 
                          style={{ left: `${(i / 24) * 100}%` }}
                        ></div>
                      ))}

                      {/* Trips Bars - Ultra Compact (No Text) */}
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
                            {/* Empty Content - Bar Only */}
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
      
      {/* Legend Footer */}
      <div className="p-2 border-t border-slate-100 bg-white rounded-b-[32px] flex items-center justify-center gap-6 text-[9px] font-bold text-slate-500">
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

      {/* Fixed Tooltip - Interactive via Portal */}
      {tooltipData && createPortal(
        (() => {
          // Positioning logic
          const cardWidth = 320;
          const cardHeight = 350;
          let left = tooltipData.x + 20;
          let top = tooltipData.y - 20;

          // Flip Logic
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
                      userBookings={bookings} // FIX: Pass actual bookings data instead of empty array
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
  currentView?: 'overview' | 'schedule'; // Changed prop name
}

const Dashboard: React.FC<DashboardProps> = ({ bookings, trips, profile, onViewTripDetails, currentView = 'overview' }) => {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'THIS_MONTH' | 'ALL'>('30D');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filter Data based on Time & Search
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    // Set Start Date based on Range
    if (timeRange === '7D') startDate.setDate(now.getDate() - 7);
    else if (timeRange === '30D') startDate.setDate(now.getDate() - 30);
    else if (timeRange === 'THIS_MONTH') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else startDate = new Date(0); // All time

    // Filter Bookings (Confirmed/Completed only for Revenue) & Search
    const validBookings = bookings.filter(b => {
      const bDate = new Date(b.created_at);
      const isTimeValid = bDate >= startDate && bDate <= now;
      const isStatusValid = b.status === 'CONFIRMED' || b.status === 'COMPLETED' || b.status === 'PICKED_UP' || b.status === 'ON_BOARD';
      
      const trip = (b as any).trips;
      const driverName = trip?.driver_profile?.full_name || trip?.driver_name || '';
      const vehicleInfo = trip?.vehicle_info || '';
      
      const searchLower = searchTerm.toLowerCase();
      const isSearchValid = !searchTerm || 
                            driverName.toLowerCase().includes(searchLower) || 
                            vehicleInfo.toLowerCase().includes(searchLower);

      return isTimeValid && isStatusValid && isSearchValid;
    });

    return { bookings: validBookings, startDate };
  }, [bookings, timeRange, searchTerm]);

  // 2. Calculate Aggregates
  const stats = useMemo(() => {
    const totalRevenue = filteredData.bookings.reduce((sum, b) => sum + b.total_price, 0);
    const totalBookings = filteredData.bookings.length;
    const totalSeats = filteredData.bookings.reduce((sum, b) => sum + b.seats_booked, 0);
    
    // Unique drivers in filtered set
    const activeDrivers = new Set(filteredData.bookings.map(b => (b as any).trips?.driver_id)).size;

    return { totalRevenue, totalBookings, totalSeats, activeDrivers };
  }, [filteredData]);

  // 3. Prepare Chart Data: Revenue by Date
  const revenueByDateData = useMemo(() => {
    const map = new Map<string, number>();
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 30; // Default days to show
    
    // Init empty days if range is small
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

    // Convert to Array & Sort
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredData, timeRange]);

  // 4. Prepare Chart Data: Revenue by Driver (Top 5)
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
        .slice(0, 5); // Top 5
  }, [filteredData]);

  // 5. Prepare Chart Data: Revenue by Vehicle Type
  const revenueByVehicleData = useMemo(() => {
    const map = new Map<string, number>();
    
    filteredData.bookings.forEach(b => {
        const trip = (b as any).trips;
        const rawType = (trip?.vehicle_info || 'Khác').split(' (')[0].trim();
        // Simplify types
        let type = rawType;
        if (rawType.includes('Sedan') || rawType.includes('4 chỗ')) type = 'Sedan 4 chỗ';
        else if (rawType.includes('SUV') || rawType.includes('7 chỗ')) type = 'SUV 7 chỗ';
        else if (rawType.includes('Limousine')) type = 'Limousine';
        
        map.set(type, (map.get(type) || 0) + b.total_price);
    });

    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  return (
    <div className="space-y-6 pb-20 animate-slide-up max-w-[1600px] mx-auto h-[calc(100vh-140px)] flex flex-col">
      
      {/* 1. Header Toolbar (Filter for Overview only) */}
      {currentView === 'overview' && (
      <div className="bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-end items-center gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto px-2">
              {/* Search */}
              <div className="relative group w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                  <input 
                      type="text" 
                      placeholder="Lọc tài xế..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-48 pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all h-[38px]"
                  />
              </div>

              {/* Time Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl h-[38px] items-center">
                  {[
                      { label: '7 Ngày', val: '7D' },
                      { label: 'Tháng này', val: 'THIS_MONTH' },
                      { label: 'Tất cả', val: 'ALL' }
                  ].map((opt) => (
                      <button
                          key={opt.val}
                          onClick={() => setTimeRange(opt.val as any)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all h-full ${timeRange === opt.val ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          {opt.label}
                      </button>
                  ))}
              </div>
          </div>
      </div>
      )}

      {/* 2. Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
        {currentView === 'overview' ? (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard 
                  title="Tổng doanh thu" 
                  value={formatCurrency(stats.totalRevenue)} 
                  subValue="Doanh thu thực nhận"
                  icon={DollarSign} 
                  color={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }} 
                  trend={12.5}
              />
              <StatCard 
                  title="Tổng đơn hàng" 
                  value={stats.totalBookings} 
                  subValue="Đơn xác nhận & hoàn thành"
                  icon={CheckCircle2} 
                  color={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }} 
                  trend={8.2}
              />
              <StatCard 
                  title="Số ghế đã bán" 
                  value={stats.totalSeats} 
                  subValue={`Trung bình ${(stats.totalBookings > 0 ? stats.totalSeats/stats.totalBookings : 0).toFixed(1)} ghế/đơn`}
                  icon={Users} 
                  color={{ bg: 'bg-amber-100', text: 'text-amber-600' }} 
              />
              <StatCard 
                  title="Tài xế hoạt động" 
                  value={stats.activeDrivers} 
                  subValue="Có phát sinh doanh thu"
                  icon={Car} 
                  color={{ bg: 'bg-sky-100', text: 'text-sky-600' }} 
              />
            </div>

            {/* Main Chart: Revenue by Date */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-500" />
                      Biểu đồ doanh thu theo thời gian
                  </h3>
              </div>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueByDateData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
                              dy={10}
                          />
                          <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
                              tickFormatter={(value) => `${value / 1000000}M`}
                          />
                          <Tooltip 
                              contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                              itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}
                              labelStyle={{ color: '#64748b', fontSize: '10px', marginBottom: '4px' }}
                              formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                          />
                          <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#6366f1" 
                              strokeWidth={3} 
                              fillOpacity={1} 
                              fill="url(#colorRevenue)" 
                              activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Top Drivers Leaderboard */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Award size={16} className="text-amber-500" />
                          Top Tài xế xuất sắc
                      </h3>
                      <button className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors">Xem tất cả</button>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                      {revenueByDriverData.length > 0 ? revenueByDriverData.map((driver, index) => (
                          <div key={index} className="flex items-center gap-4 group">
                              <div className="relative shrink-0">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border-2 ${
                                      index === 0 ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                      index === 1 ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                      index === 2 ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                      'bg-white text-slate-400 border-slate-100'
                                  }`}>
                                      {driver.avatar}
                                  </div>
                                  {index < 3 && (
                                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold border border-white ${
                                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-orange-500'
                                      }`}>
                                          {index + 1}
                                      </div>
                                  )}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-1.5">
                                      <span className="text-xs font-bold text-slate-800 truncate">{driver.name}</span>
                                      <span className="text-xs font-black text-indigo-600">{formatCurrency(driver.revenue)}</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                          className={`h-full rounded-full transition-all duration-1000 ${
                                              index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 
                                              'bg-indigo-500 opacity-70'
                                          }`} 
                                          style={{ width: `${(driver.revenue / revenueByDriverData[0].revenue) * 100}%` }}
                                      ></div>
                                  </div>
                                  <p className="text-[9px] text-slate-400 mt-1 font-medium">{driver.trips} chuyến thành công</p>
                              </div>
                          </div>
                      )) : (
                          <div className="h-40 flex items-center justify-center text-slate-400 text-xs italic">Chưa có dữ liệu tài xế</div>
                      )}
                  </div>
              </div>

              {/* Revenue by Vehicle Type (Donut Chart) */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <PieChartIcon size={16} className="text-emerald-500" />
                          Phân bổ theo loại xe
                      </h3>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center h-full">
                      <div className="h-[220px] w-[220px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={revenueByVehicleData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
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
                                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                  />
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng cộng</span>
                              <span className="text-sm font-black text-slate-800">{formatCurrency(stats.totalRevenue)}</span>
                          </div>
                      </div>
                      
                      <div className="flex-1 w-full pl-0 sm:pl-8 mt-6 sm:mt-0 space-y-3">
                          {revenueByVehicleData.map((entry, index) => (
                              <div key={index} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                      <span className="text-xs font-bold text-slate-600">{entry.name}</span>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-xs font-bold text-slate-800">{formatCurrency(entry.value)}</p>
                                      <p className="text-[9px] text-slate-400 font-medium">
                                          {((entry.value / stats.totalRevenue) * 100).toFixed(1)}%
                                      </p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

            </div>
          </div>
        ) : (
          <DriverSchedule trips={trips} bookings={bookings} profile={profile} onViewTripDetails={onViewTripDetails || (() => {})} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
