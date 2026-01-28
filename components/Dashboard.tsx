
import React, { useMemo, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Calendar, Filter, Search, 
  Car, CheckCircle2, Award, Zap, ChevronDown, BarChart3, PieChart as PieChartIcon, ArrowUpRight
} from 'lucide-react';
import { Trip, Booking } from '../types';

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

interface DashboardProps {
  bookings: Booking[];
  trips: Trip[];
}

const Dashboard: React.FC<DashboardProps> = ({ bookings, trips }) => {
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
    <div className="space-y-6 pb-20 animate-slide-up max-w-[1600px] mx-auto">
      
      {/* 1. Header Toolbar */}
      <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                <BarChart3 size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800">Tổng quan kinh doanh</h2>
                <p className="text-xs text-slate-400 font-medium">Theo dõi hiệu suất vận hành</p>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Lọc theo tài xế, loại xe..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                />
            </div>

            {/* Time Filter */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
                {[
                    { label: '7 Ngày', val: '7D' },
                    { label: '30 Ngày', val: '30D' },
                    { label: 'Tháng này', val: 'THIS_MONTH' },
                    { label: 'Tất cả', val: 'ALL' }
                ].map((opt) => (
                    <button
                        key={opt.val}
                        onClick={() => setTimeRange(opt.val as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${timeRange === opt.val ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
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

      {/* 3. Main Chart: Revenue by Date */}
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
        
        {/* 4. Top Drivers Leaderboard */}
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

        {/* 5. Revenue by Vehicle Type (Donut Chart) */}
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
  );
};

export default Dashboard;
