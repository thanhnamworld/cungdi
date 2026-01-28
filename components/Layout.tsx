
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Search, PlusCircle, Ticket, Bell, LogOut, Car, LogIn, Settings, ClipboardList, ShoppingBag, Users as UsersIcon, User, X, ChevronUp, ChevronDown, MoreHorizontal, Shield, HelpCircle, CheckCircle2, AlertCircle, Grid, Menu, Plus, FileText, ListChecks, Medal, Trophy, Gem, Heart, Award, Zap, Phone, Users
} from 'lucide-react';
import { Notification, Profile, UserRole, MembershipTier } from '../types';
import { supabase } from '../lib/supabase';
import UserGuideModal from './UserGuideModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: Notification[];
  clearNotification: (id: string) => void;
  profile?: Profile | null;
  profileLoading: boolean;
  onLoginClick: () => void;
  onProfileClick: () => void;
  pendingOrderCount?: number;
  activeTripsCount?: number;
  activeBookingsCount?: number;
}

const getRoleConfig = (role?: UserRole) => {
  switch(role) {
    case 'admin': return { label: 'Quản trị', color: 'text-rose-600', bg: 'bg-rose-50', icon: Shield };
    case 'manager': return { label: 'Điều phối', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Settings };
    case 'driver': return { label: 'Tài xế', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Car };
    default: return { label: 'Thành viên', color: 'text-slate-600', bg: 'bg-slate-50', icon: User };
  }
};

// Updated to match ProfileManagement config fully
const getTierConfig = (tier: MembershipTier = 'standard') => {
    switch (tier) {
        case 'silver': return { label: 'Bạc', icon: Medal, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', discountVal: 10, discountLabel: '10%' };
        case 'gold': return { label: 'Vàng', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', discountVal: 20, discountLabel: '20%' };
        case 'diamond': return { label: 'Kim Cương', icon: Gem, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100', discountVal: 30, discountLabel: '30%' };
        case 'family': return { label: 'Gia Đình', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', discountVal: 80, discountLabel: '80%' };
        default: return { label: 'Thường', icon: Award, color: 'text-slate-400', bg: 'bg-white', border: 'border-slate-100', discountVal: 0, discountLabel: '0%' };
    }
};

const RoadAnimation = () => {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return (
    <div className="w-full">
      <div className="road-container">
        <div className="road-line-v2"></div>
        <div className="absolute inset-0 flex justify-between items-center px-4 z-0">
          {days.map((day, i) => (
            <div key={i} className="day-container flex-col items-center gap-1 group cursor-default hidden sm:flex">
              <div className="day-dot"></div>
              <span className="text-[7px] font-bold text-slate-500 group-hover:text-emerald-600 transition-colors">
                {day}
              </span>
            </div>
          ))}
        </div>
        
        <div className="animated-car-v2 flex items-center">
          <div className="car-trail"></div>
          <div className="car-body">
            <Car size={12} fill="currentColor" fillOpacity={0.2} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileSkeleton = () => (
    <div className="bg-gradient-to-br from-slate-50/60 via-white to-slate-50/40 border border-slate-100 p-5 rounded-[32px] space-y-4 shadow-sm animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 shrink-0"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
        </div>
        <div className="flex gap-3">
            <div className="flex-1 h-10 bg-slate-200 rounded-2xl"></div>
            <div className="w-12 h-10 bg-slate-200 rounded-2xl"></div>
        </div>
    </div>
);

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, notifications, clearNotification, profile, profileLoading, onLoginClick, onProfileClick, pendingOrderCount = 0, activeTripsCount = 0, activeBookingsCount = 0 }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showMobileManageMenu, setShowMobileManageMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const isStaff = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'driver';
  const canSeePersonalTabs = profile && (profile.role === 'user' || profile.role === 'driver' || profile.role === 'admin');
  const roleConfig = getRoleConfig(profile?.role);
  const RoleIcon = roleConfig.icon;
  const tierConfig = getTierConfig(profile?.membership_tier);
  const TierIcon = tierConfig.icon;

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const mainEl = mainContentRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
        if (mainEl.scrollTop > 300) {
            setIsScrolled(true);
        } else {
            setIsScrolled(false);
        }
    };

    mainEl.addEventListener('scroll', handleScroll);
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollAction = () => {
    if (isScrolled) {
        // Scroll to Top
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // Scroll to Bottom
        mainContentRef.current?.scrollTo({ top: mainContentRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileManageMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Updated Navigation Items
  const navItems = [
    { id: 'search', label: 'Tìm chuyến', icon: Search },
    { id: 'my-trips', label: 'Chuyến xe', icon: Car },
    { id: 'my-requests', label: 'Yêu cầu', icon: CheckCircle2 }, // Unified Icon
  ];

  const manageItems = [
    { id: 'dashboard', label: 'Thống kê', icon: LayoutDashboard, roles: ['admin', 'manager', 'driver'] },
    { id: 'manage-trips', label: 'Quản lý Chuyến xe', icon: Car, roles: ['admin', 'manager', 'driver'] },
    { id: 'manage-orders', label: 'Quản lý Yêu cầu', icon: CheckCircle2, roles: ['admin', 'manager', 'driver'] }, // Unified Icon
    { id: 'admin', label: 'Thành viên', icon: Users, roles: ['admin', 'manager'] },
  ];

  const allPossibleItems = [
    ...navItems, 
    ...manageItems, 
    { id: 'post', label: 'Đăng chuyến', icon: PlusCircle },
    { id: 'profile', label: 'Hồ sơ', icon: User }
  ];

  const activeItem = allPossibleItems.find(item => item.id === activeTab);
  const ActiveIcon = activeItem?.icon || Car;
  const activeLabel = activeItem?.label || 'Cùng đi';

  const MobileNavItem = ({ id, icon: Icon, label, onClick, isActive, isMain = false, hasBadge = false }: any) => (
    <button 
      type="button" 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${isMain ? '-mt-8' : ''} ${isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {isMain ? (
        <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 border-4 border-[#F8FAFC] transition-transform active:scale-95 ${isActive ? 'bg-emerald-700 text-white' : 'bg-emerald-600 text-white'}`}>
          <Icon size={28} />
        </div>
      ) : (
        <>
          <div className={`p-1.5 rounded-xl transition-colors relative ${isActive ? 'bg-emerald-50' : 'bg-transparent'}`}>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            {hasBadge && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white"></div>
            )}
          </div>
          <span className={`text-[9px] font-bold ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>{label}</span>
        </>
      )}
    </button>
  );

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col">
      {profile && (
        <div className="h-9 shrink-0 bg-emerald-100/80 backdrop-blur-sm border-b border-emerald-200 text-slate-700 flex items-center justify-between px-4 text-xs font-bold z-50">
          <div className="flex items-center gap-2">
            {/* Unified Tier Badge - Matching Profile Style */}
            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${tierConfig.bg} ${tierConfig.color.replace('text-','text-slate-800 ')} ${tierConfig.border}`}>
               <TierIcon size={10} className={tierConfig.color} /> 
               {tierConfig.label}
               {tierConfig.discountVal > 0 && <span className="bg-white/50 px-1 rounded text-rose-600 ml-0.5">-{tierConfig.discountLabel}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTripsCount > 0 && (
              <div className="flex items-center gap-1.5 bg-emerald-100/70 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200/80">
                <Car size={10} className="text-emerald-600" />
                <span className="font-bold text-[9px]">{activeTripsCount} Đang chạy</span>
              </div>
            )}
            {activeBookingsCount > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-100/70 text-orange-800 px-3 py-1 rounded-full border border-orange-200/80">
                <CheckCircle2 size={10} className="text-orange-600" />
                <span className="font-bold text-[9px]">{activeBookingsCount} Yêu cầu</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden flex-col xl:flex-row">
        {/* Sidebar Desktop */}
        <aside className="hidden xl:flex flex-col w-72 bg-gradient-to-b from-emerald-50/80 to-indigo-50/60 border-r border-slate-100 p-8 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('search'); scrollToTop(); }}
            className="flex items-center gap-3 mb-10 px-2 text-left"
            aria-label="Về trang chủ"
          >
            <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-100">
              <Car className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Cùng đi<span className="text-emerald-600">.</span>
            </span>
          </button>
          
          <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-2">
            {navItems.map((item) => {
              if (['my-trips', 'my-requests'].includes(item.id) && !canSeePersonalTabs) return null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    activeTab === item.id ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon size={18} className={activeTab === item.id ? 'text-emerald-600' : 'text-slate-500 group-hover:text-emerald-600'} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setActiveTab('post')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                activeTab === 'post' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <PlusCircle size={18} className={activeTab === 'post' ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600'} />
              <span className="text-sm">Đăng chuyến mới</span>
            </button>

            {isStaff && (
              <>
                <div className="my-2 border-t border-slate-200/50"></div>
                {manageItems.filter(item => item.roles.includes(profile?.role || '')).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                      activeTab === item.id ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-emerald-600' : 'text-slate-500 group-hover:text-emerald-600'} />
                    <span className="text-sm">{item.label}</span>
                    {item.id === 'manage-orders' && pendingOrderCount > 0 && (
                      <span className="absolute right-4 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-rose-200">
                        {pendingOrderCount}
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}
          </nav>

          <div className="mt-auto pt-6">
            {profileLoading ? (
              <ProfileSkeleton />
            ) : profile ? (
              <div className="bg-gradient-to-br from-emerald-50/80 to-indigo-50/60 border border-emerald-100 p-5 rounded-[32px] space-y-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 font-bold text-lg shadow-md border border-slate-100 shrink-0">
                    {profile.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-bold text-slate-800 truncate leading-tight">{profile.full_name}</p>
                    <p className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${roleConfig.color}`}>
                      <RoleIcon size={10} /> {roleConfig.label}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={onProfileClick} className="flex-1 py-2.5 bg-white text-emerald-600 rounded-2xl hover:bg-emerald-50 border border-slate-100 flex items-center justify-center gap-2 transition-all shadow-sm font-bold text-xs">
                    <Settings size={14} /> <span>Hồ sơ</span>
                  </button>
                  <button type="button" onClick={() => supabase.auth.signOut()} className="p-2.5 bg-white text-slate-500 rounded-2xl hover:text-rose-600 hover:bg-rose-50 border border-slate-100 transition-all shadow-sm">
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={onLoginClick} className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-[24px] font-bold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-px transition-all transform">
                <LogIn size={18} />Đăng nhập
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <header className="h-20 bg-gradient-to-r from-emerald-50/80 via-white/90 to-indigo-50/80 backdrop-blur-md border-b border-emerald-100/50 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
            {/* Left: Mobile Toggle & Title */}
            <div className="flex items-center gap-3 z-20">
              <button
                type="button"
                onClick={() => { setActiveTab('search'); scrollToTop(); }}
                aria-label="Về trang chủ"
                className="xl:hidden bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-100"
              >
                <Car className="text-white w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5">
                <ActiveIcon size={20} className="text-emerald-600 shrink-0" />
                <h2 className="hidden sm:block text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate max-w-[180px]">
                  {activeLabel}
                </h2>
              </div>
            </div>

            {/* Center: Absolute Road Animation (Visible on Desktop only) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md hidden md:block z-10 pointer-events-none">
                <RoadAnimation />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 z-20">
              <div className="relative" ref={notificationRef}>
                <button 
                  type="button" 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className="p-2 sm:p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-white rounded-xl transition-all relative"
                >
                  <Bell size={20} className={unreadCount > 0 ? 'animate-bell text-rose-500' : ''} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Thông báo</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{unreadCount} mới</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer relative ${!n.read ? 'bg-indigo-50/30' : ''}`}
                            onClick={() => { clearNotification(n.id); setShowNotifications(false); }}
                          >
                            {!n.read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-rose-500 rounded-full"></div>}
                            <div className="flex gap-3">
                              <div className={`p-2 rounded-xl shrink-0 ${n.type === 'success' ? 'bg-emerald-50 text-emerald-600' : n.type === 'warning' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                {n.type === 'success' ? <CheckCircle2 size={14} /> : n.type === 'warning' ? <AlertCircle size={14} /> : <Bell size={14} />}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-800 leading-tight">{n.title}</p>
                                <p className="text-[10px] font-bold text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                                <p className="text-[8px] font-bold text-slate-400 mt-1">
                                  {new Date(n.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} • {new Date(n.timestamp).toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell size={32} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-[10px] font-bold text-slate-500">Không có thông báo nào</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Profile/Login Button - Always visible on Header for Mobile */}
              <button
                  type="button"
                  onClick={profile ? onProfileClick : onLoginClick}
                  className="xl:hidden p-1 rounded-xl hover:bg-white transition-all ml-1"
              >
                  {profile ? (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-emerald-200 border-2 border-white">
                          {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-xl object-cover" />
                          ) : (
                              profile.full_name?.charAt(0).toUpperCase() || 'U'
                          )}
                      </div>
                  ) : (
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                          <User size={20} />
                      </div>
                  )}
              </button>
            </div>
          </header>

          <div ref={mainContentRef} className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-32 xl:pb-10 custom-scrollbar">
            {children}
          </div>

          {/* Floating Action Buttons Container */}
          <div className="fixed bottom-24 xl:bottom-8 right-4 xl:right-8 z-50 flex flex-col gap-2.5">
              {/* Scroll Button */}
              <button
                  onClick={handleScrollAction}
                  className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-all active:scale-90 animate-in fade-in zoom-in-95"
                  aria-label={isScrolled ? "Cuộn lên đầu trang" : "Cuộn xuống cuối trang"}
              >
                  <div className={`transition-transform duration-500 ease-in-out ${isScrolled ? 'rotate-0' : 'rotate-180'}`}>
                      <ChevronUp size={18} />
                  </div>
              </button>

              {/* User Guide Button - Chuyển sang màu Indigo */}
              <button
                  onClick={() => setShowUserGuide(true)}
                  className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all active:scale-90 animate-in fade-in zoom-in-95"
                  title="Hướng dẫn sử dụng"
              >
                  <HelpCircle size={18} />
              </button>

              {/* Zalo Button - Sử dụng Logo Zalo chính thức - Thu nhỏ còn 90% */}
              <a
                  href="https://zalo.me/0852659956"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-90 animate-in fade-in zoom-in-95 overflow-hidden border border-slate-100"
                  title="Chat Zalo tổng đài: 0852659956"
              >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg" 
                    alt="Zalo" 
                    className="w-full h-full object-cover scale-90"
                  />
              </a>

              {/* Hotline Button - Màu Đỏ, không nháy */}
              <a
                  href="tel:0852659956"
                  className="w-9 h-9 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-700 transition-all active:scale-90 animate-in fade-in zoom-in-95"
                  title="Gọi tổng đài: 0852659956"
              >
                  <Phone size={18} />
              </a>
          </div>

          {/* Mobile Navigation - Redesigned Floating Dock */}
          <nav className="xl:hidden fixed bottom-5 left-4 right-4 z-[70] flex justify-center" ref={mobileMenuRef}>
            {/* Management Popover Menu */}
            {showMobileManageMenu && isStaff && (
              <div className="absolute bottom-full right-0 mb-4 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 flex flex-col gap-1 animate-in slide-in-from-bottom-2 fade-in duration-200 origin-bottom-right">
                {manageItems.filter(item => item.roles.includes(profile?.role || '')).map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setShowMobileManageMenu(false); }}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all relative ${isActive ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      <item.icon size={18} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                      <span className="text-xs font-bold">{item.label}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600"></div>}
                      {item.id === 'manage-orders' && pendingOrderCount > 0 && (
                        <span className="ml-auto bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {pendingOrderCount}
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* Add Profile Option to Manage Menu for Staff */}
                <button
                  onClick={() => { onProfileClick(); setShowMobileManageMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all hover:bg-slate-50 text-slate-600 border-t border-slate-50 mt-1"
                >
                  <User size={18} className="text-slate-400" />
                  <span className="text-xs font-bold">Hồ sơ cá nhân</span>
                </button>
              </div>
            )}

            <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[28px] px-3 py-2 flex items-center justify-around gap-1 w-full max-w-[420px] relative">
              <MobileNavItem 
                id="search" 
                icon={Search} 
                label="Tìm kiếm" 
                isActive={activeTab === 'search'} 
                onClick={() => setActiveTab('search')} 
              />
              
              {canSeePersonalTabs && (
                <MobileNavItem 
                  id="my-trips" 
                  icon={Car} 
                  label="Chuyến" 
                  isActive={activeTab === 'my-trips'} 
                  onClick={() => setActiveTab('my-trips')} 
                />
              )}

              {/* Central Main Button */}
              <MobileNavItem 
                  id="post" 
                  icon={Plus} 
                  label="" 
                  isMain={true} 
                  isActive={activeTab === 'post'} 
                  onClick={() => setActiveTab('post')} 
              />

              {canSeePersonalTabs && (
                <MobileNavItem 
                  id="my-requests" 
                  icon={CheckCircle2} 
                  label="Yêu cầu" 
                  isActive={activeTab === 'my-requests'} 
                  onClick={() => setActiveTab('my-requests')} 
                />
              )}

              {isStaff ? (
                <MobileNavItem 
                  id="manage" 
                  icon={Grid} 
                  label="Quản lý" 
                  hasBadge={pendingOrderCount > 0}
                  isActive={manageItems.some(i => i.id === activeTab)} 
                  onClick={() => setShowMobileManageMenu(!showMobileManageMenu)} 
                />
              ) : (
                  <MobileNavItem 
                  id="profile" 
                  icon={User} 
                  label="Hồ sơ" 
                  isActive={activeTab === 'profile'} 
                  onClick={onProfileClick} 
                  />
              )}
            </div>
          </nav>
        </main>
      </div>
      {/* User Guide Modal */}
      <UserGuideModal isOpen={showUserGuide} onClose={() => setShowUserGuide(false)} profile={profile} />
    </div>
  );
};

export default Layout;
