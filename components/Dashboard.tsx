
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { TrendingUp, Users, MapPin, DollarSign, ArrowUpRight, XCircle, AlertCircle, ShoppingBag, CheckCircle2, Navigation, Sparkles } from 'lucide-react';
import { Trip, Booking } from '../types';

const MiniStatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
    <div className={`p-4 rounded-2xl ${color} text-white shadow-lg shadow-emerald-100/20 group-hover:scale-110 transition-transform`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <h3 className="text-slate-400 text-[11px] font-normal truncate">{title}</h3>
        {trend && <span className="text-emerald-500 text-[10px] font-normal bg-emerald-50 px-1.5 py-0.5 rounded-md">{trend}</span>}
      </div>
      <p className="text-xl font-bold text-slate-800 tracking-tight leading-none mt-1.5">{value}</p>
    </div>
  </div>
);

interface DashboardProps {
  bookings: Booking[];
  trips: Trip[];
}

const Dashboard: React.FC<DashboardProps> = ({ bookings, trips }) => {
  const stats = useMemo(() => {
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.total_price, 0);
    const totalSeats = trips.reduce((sum, t) => sum + t.seats, 0);
    const bookedSeats = confirmedBookings.reduce((sum, b) => sum + b.seats_booked, 0);
    const fillRate = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;
    
    return {
      totalRevenue,
      fillRate,
      tripsCount: trips.length,
      bookingsCount: bookings.length,
      confirmedCount: confirmedBookings.length
    };
  }, [bookings, trips]);

  const chartData = useMemo(() => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dayLabel: days[d.getDay()],
        revenue: Math.floor(Math.random() * 2000000)
      };
    });
  }, []);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <MiniStatCard title="Chuyến xe" value={stats.tripsCount} icon={Navigation} color="bg-emerald-600" trend="+4" />
        <MiniStatCard title="Yêu cầu" value={stats.bookingsCount} icon={CheckCircle2} color="bg-orange-500" />
        <MiniStatCard title="Xác nhận" value={stats.confirmedCount} icon={CheckCircle2} color="bg-emerald-500" />
        <MiniStatCard title="Tỷ lệ lấp đầy" value={`${stats.fillRate}%`} icon={TrendingUp} color="bg-teal-600" />
        <MiniStatCard title="Doanh thu" value={new Intl.NumberFormat('vi-VN').format(stats.totalRevenue)} icon={DollarSign} color="bg-sky-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Tăng trưởng doanh thu 7 ngày</h3>
            <div className="flex gap-2">
               <button className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-normal text-slate-400 hover:text-emerald-600 transition-colors">Tuần này</button>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dayLabel" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: '400'}} dy={15} />
                <Tooltip 
                   cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                   contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Cột phải: Phân tích hành vi - Cập nhật Gradient Emerald-Indigo */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-indigo-50/60 p-10 rounded-[40px] border border-emerald-100 shadow-sm flex flex-col backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-10">
            <Sparkles className="text-emerald-500" size={18} />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Phân tích hành vi</h3>
          </div>
          <div className="space-y-6 flex-1">
            <div className="flex flex-col gap-2">
               <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-500">Nhu cầu đặt xe</span>
                  <span className="text-xs font-bold text-emerald-600">82%</span>
               </div>
               <div className="w-full bg-slate-200/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-[82%] rounded-full shadow-sm"></div>
               </div>
            </div>
            <div className="flex flex-col gap-2">
               <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-500">Tốc độ xác nhận</span>
                  <span className="text-xs font-bold text-indigo-600">1.2m Avg</span>
               </div>
               <div className="w-full bg-slate-200/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[95%] rounded-full shadow-sm"></div>
               </div>
            </div>
            <div className="mt-10 p-6 bg-indigo-600 rounded-[32px] text-white shadow-xl shadow-indigo-100">
               <p className="text-[11px] font-normal opacity-60">Thống kê tháng</p>
               <p className="text-2xl font-bold mt-2">+150 Trips</p>
               <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                     <p className="text-[10px] font-normal opacity-60">Mới</p>
                     <p className="font-bold">42</p>
                  </div>
                  <div className="text-center">
                     <p className="text-[10px] font-normal opacity-60">Hoàn thành</p>
                     <p className="font-bold">108</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
