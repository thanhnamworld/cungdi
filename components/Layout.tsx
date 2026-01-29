
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Search, PlusCircle, Ticket, Bell, LogOut, Car, LogIn, Settings, ClipboardList, ShoppingBag, Users as UsersIcon, User, X, ChevronUp, ChevronDown, MoreHorizontal, Shield, HelpCircle, CheckCircle2, AlertCircle, Grid, Menu, Plus, FileText, ListChecks, Medal, Trophy, Gem, Heart, Award, Zap, Phone, Users, BarChart3, CalendarRange
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
  onOpenSettings: () => void;
  pendingOrderCount?: number;
  activeTripsCount?: number;
  activeBookingsCount?: number;
  onPostClick?: (mode: 'DRIVER' | 'PASSENGER') => void; 
}

const getRoleConfig = (role?: UserRole) => {
  switch(role) {
    case 'admin': return { label: 'Quản trị', color: 'text-rose-600', bg: 'bg-rose-50', icon: Shield };
    case 'manager': return { label: 'Điều phối', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Settings };
    case 'driver': return { label: 'Tài xế', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Car };
    default: return { label: 'Thành viên', color: 'text-slate-600', bg: 'bg-slate-50', icon: User };
  }
};

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

type NavItem = {
  id: string;
  label: string;
  icon: any;
  onClick?: () => void;
  children?: NavItem[];
  badge?: number;
  color?: string;
};

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, notifications, clearNotification, profile, profileLoading, onLoginClick, onProfileClick, onOpenSettings, pendingOrderCount = 0, activeTripsCount = 0, activeBookingsCount = 0, onPostClick }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showMobileManageMenu, setShowMobileManageMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const isStaff = profile?.role === 'admin' || profile?.role === 'manager';
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
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
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

  const handlePostButton = () => {
      if (onPostClick) onPostClick('DRIVER');
  };

  const mainNavItems: NavItem[] = [
    { id: 'search', label: 'Tìm chuyến', icon: Search, color: 'text-sky-500' },
    { id: 'post-new-trip', label: 'Đăng chuyến mới', icon: PlusCircle, onClick: handlePostButton, color: 'text-emerald-500' },
  ];

  const personalManageItems: NavItem[] = [
    { id: 'manage-trips', label: 'Chuyến xe', icon: Car, color: 'text-blue-500' },
    { id: 'manage-orders', label: 'Yêu cầu', icon: CheckCircle2, badge: (isStaff && pendingOrderCount > 0) ? pendingOrderCount : undefined, color: 'text-orange-500' },
    { 
        id: 'dashboard', 
        label: 'Thống kê', 
        icon: LayoutDashboard,
        color: 'text-purple-500',
        children: [
            { id: 'dashboard-overview', label: 'Tổng quan', icon: BarChart3, color: 'text-purple-500' },
            { id: 'dashboard-schedule', label: 'Lịch trình', icon: CalendarRange, color: 'text-teal-500' },
            { id: 'dashboard-vehicles', label: 'Quản lý xe', icon: Car, color: 'text-sky-500' }
        ]
    },
  ];

  const adminManageItems: NavItem[] = [
    { id: 'admin', label: 'Thành viên', icon: Users, color: 'text-rose-500' },
  ];

  const MobileNavItem = ({ id, icon: Icon, label, onClick, isActive, isMain = false, hasBadge = false }: any) => (
    <button 
      type="button" 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-300 relative ${isMain ? '-mt-8' : ''} ${isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {isMain ? (
        <div className="relative group">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-[3.5px] border-[#F8FAFC] transition-all duration-300 active:scale-95 text-white relative overflow-hidden ${
                isActive 
                ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 shadow-[0_6px_15px_rgba(16,185,129,0.4)]' 
                : 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 shadow-[0_6px_15px_rgba(100,116,139,0.3)]'
            }`}>
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
                <div className={`absolute bottom-0 right-0 w-2/3 h-2/3 bg-gradient-to-tl to-transparent pointer-events-none rounded-full blur-sm ${
                    isActive ? 'from-emerald-900/10' : 'from-slate-900/10'
                }`}></div>
                
                <Icon size={20} strokeWidth={3} className="drop-shadow-md relative z-10" />
            </div>
        </div>
      ) : (
        <>
          <div className={`p-1 rounded-xl transition-colors relative ${isActive ? 'bg-emerald-50' : 'bg-transparent'}`}>
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            {hasBadge && (
              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></div>
            )}
          </div>
          <span className={`text-[8px] font-bold ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>{label}</span>
        </>
      )}
    </button>
  );

  const renderNavList = (items: NavItem[]) => {
      return items.map((item) => {
          const isActive = activeTab === item.id;
          const hasChildren = item.children && item.children.length > 0;

          if (hasChildren) {
            const isGroupActive = item.children?.some(child => activeTab === child.id);
            
            return (
              <div key={item.id} className="w-full mb-1">
                <div className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 ${isGroupActive ? 'text-emerald-600' : 'text-slate-600'}`}>
                    <item.icon size={18} className={isGroupActive ? 'text-emerald-600' : (item.color || 'text-slate-500')} />
                    <span className={`text-sm text-left ${isGroupActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </div>
                <div className="ml-4 pl-5 border-l-2 border-slate-100 space-y-1 mb-2">
                  {item.children?.map(child => {
                    const isChildActive = activeTab === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => setActiveTab(child.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs transition-all ${
                          isChildActive 
                            ? 'text-emerald-600 bg-emerald-100 font-bold' 
                            : 'text-slate-600 font-medium hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <child.icon size={14} className={isChildActive ? child.color || 'text-emerald-600' : 'text-slate-500'}/>
                        <span>{child.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          }

          return (
            <div key={item.id} className="w-full">
                <button
                    type="button"
                    onClick={() => {
                        if (item.onClick) {
                            item.onClick();
                        } else {
                            setActiveTab(item.id);
                        }
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                        isActive ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-slate-600 font-medium hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                >
                    <item.icon size={18} className={isActive ? 'text-emerald-600' : `${item.color || 'text-slate-500'} group-hover:text-emerald-600`} />
                    <span className="text-sm flex-1 text-left">{item.label}</span>
                    
                    {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-rose-200">
                            {item.badge}
                        </span>
                    )}
                </button>
            </div>
          );
      });
  };

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col">
      {profile && (
        <div className="h-9 shrink-0 bg-emerald-100/80 backdrop-blur-sm border-b border-emerald-200 text-slate-700 flex items-center justify-between px-4 text-xs font-bold z-50">
          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${tierConfig.bg} ${tierConfig.color.replace('text-','text-slate-800 ')} ${tierConfig.border}`}>
               <TierIcon size={10} className={tierConfig.color} /> 
               {tierConfig.label}
               {tierConfig.discountVal > 0 && <span className="bg-white/50 px-1 rounded text-rose-600 ml-0.5">-{tierConfig.discountLabel}</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 bg-emerald-100/70 text-emerald-800 px-2 sm:px-3 py-1 rounded-full border border-emerald-200/80 shadow-sm" title="Chuyến xe hôm nay">
              <Car size={12} className="text-emerald-600" />
              <span className="font-bold text-[10px] sm:text-[9px]">
                {activeTripsCount}<span className="hidden sm:inline ml-1">Chuyến xe</span>
              </span>
            </div>
            <div className="flex items-center gap-1 bg-orange-100/70 text-orange-800 px-2 sm:px-3 py-1 rounded-full border border-orange-200/80 shadow-sm" title="Yêu cầu hôm nay">
              <CheckCircle2 size={12} className="text-orange-600" />
              <span className="font-bold text-[10px] sm:text-[9px]">
                {activeBookingsCount}<span className="hidden sm:inline ml-1">Yêu cầu</span>
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden flex-col xl:flex-row">
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
            {renderNavList(mainNavItems)}

            {profile && (
              <>
                <div className="my-2 border-t border-slate-200/50"></div>
                {renderNavList(personalManageItems)}
              </>
            )}

            {isStaff && (
                <>
                    <div className="my-2 border-t border-slate-200/50"></div>
                    {renderNavList(adminManageItems)}
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

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <header className="h-20 bg-gradient-to-r from-emerald-50/80 via-white/90 to-indigo-50/80 backdrop-blur-md border-b border-emerald-100/50 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
            <div className="flex items-center gap-3 z-20">
              <button 
                type="button"
                onClick={() => { setActiveTab('search'); scrollToTop(); }}
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80 active:scale-95"
              >
                <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-100 shrink-0">
                  <Car className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  Cùng đi<span className="text-emerald-600">.</span>
                </span>
              </button>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[140px] md:max-w-md z-10 pointer-events-none opacity-80 md:opacity-100">
                <RoadAnimation />
            </div>

            <div className="flex items-center gap-0.5 sm:gap-2 z-20">
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 sm:p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
                title="Cài đặt phần mềm"
              >
                <Settings size={20} />
              </button>

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
            </div>
          </header>

          <div ref={mainContentRef} className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-32 xl:pb-10 custom-scrollbar">
            {children}
          </div>

          <div className="fixed bottom-24 xl:bottom-8 right-4 xl:right-8 z-50 flex flex-col gap-2.5">
              <button onClick={handleScrollAction} className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-all active:scale-90 animate-in fade-in zoom-in-95">
                  <div className={`transition-transform duration-500 ease-in-out ${isScrolled ? 'rotate-0' : 'rotate-180'}`}>
                      <ChevronUp size={18} />
                  </div>
              </button>
              <button onClick={() => setShowUserGuide(true)} className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all active:scale-90 animate-in fade-in zoom-in-95">
                  <HelpCircle size={18} />
              </button>
              <a href="https://zalo.me/0852659956" target="_blank" rel="noreferrer" className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-90 animate-in fade-in zoom-in-95 overflow-hidden border border-slate-100">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg" alt="Zalo" className="w-full h-full object-cover scale-90" />
              </a>
              <a href="tel:0852659956" className="w-9 h-9 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-700 transition-all active:scale-90 animate-in fade-in zoom-in-95">
                  <Phone size={18} />
              </a>
          </div>

          <nav className="xl:hidden fixed bottom-5 left-4 right-4 z-[70] flex justify-center" ref={mobileMenuRef}>
            {showMobileManageMenu && (
              <div className="absolute bottom-full right-0 mb-4 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 flex flex-col gap-1 animate-in slide-in-from-bottom-2 fade-in duration-200 origin-bottom-right max-h-[70vh] overflow-y-auto custom-scrollbar">
                {[...personalManageItems.flatMap(i => i.children ? i.children : [i]), ...(isStaff ? adminManageItems.flatMap(i => i.children ? i.children : [i]) : [])].map((item) => {
                  if (item.id === 'post-new-trip') return null;
                  const isActive = activeTab === item.id;
                  return (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setShowMobileManageMenu(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all relative shrink-0 ${isActive ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                      <item.icon size={18} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                      <span className="text-xs font-bold">{item.label}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600"></div>}
                      {item.id === 'manage-orders' && pendingOrderCount > 0 && isStaff && (
                        <span className="ml-auto bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {pendingOrderCount}
                        </span>
                      )}
                    </button>
                  );
                })}
                <div className="h-px bg-slate-100 my-1 shrink-0"></div>
                {profile ? (
                    <>
                        <button onClick={() => { onProfileClick(); setShowMobileManageMenu(false); }} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all hover:bg-slate-50 text-slate-600 shrink-0">
                            <div className="relative"><User size={18} className="text-slate-400" /><div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white"></div></div>
                            <span className="text-xs font-bold">Hồ sơ: {profile.full_name}</span>
                        </button>
                        <button onClick={() => { supabase.auth.signOut(); setShowMobileManageMenu(false); }} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all hover:bg-rose-50 text-rose-500 shrink-0">
                            <LogOut size={18} /><span className="text-xs font-bold">Đăng xuất</span>
                        </button>
                    </>
                ) : (
                    <button onClick={() => { onLoginClick(); setShowMobileManageMenu(false); }} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all bg-emerald-600 text-white shadow-lg shadow-emerald-200 shrink-0">
                        <LogIn size={18} /><span className="text-xs font-bold">Đăng nhập ngay</span>
                    </button>
                )}
              </div>
            )}
            <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[22px] px-2 py-1.5 flex items-center justify-around gap-1 w-full max-w-[340px] relative">
              <MobileNavItem id="post" icon={PlusCircle} label="Đăng tin" isActive={false} onClick={handlePostButton} />
              <MobileNavItem id="manage-trips" icon={Car} label="Chuyến xe" isActive={activeTab === 'manage-trips'} onClick={() => setActiveTab('manage-trips')} />
              <MobileNavItem id="search" icon={Search} label="" isMain={true} isActive={activeTab === 'search'} onClick={() => setActiveTab('search')} />
              <MobileNavItem id="manage-orders" icon={CheckCircle2} label="Yêu cầu" isActive={activeTab === 'manage-orders'} onClick={() => setActiveTab('manage-orders')} />
              <MobileNavItem id="manage" icon={Grid} label="Menu" hasBadge={pendingOrderCount > 0 && isStaff} isActive={personalManageItems.some(i => i.id === activeTab || i.children?.some(c => c.id === activeTab))} onClick={() => setShowMobileManageMenu(!showMobileManageMenu)} />
            </div>
          </nav>
        </main>
      </div>
      <UserGuideModal isOpen={showUserGuide} onClose={() => setShowUserGuide(false)} profile={profile} />
    </div>
  );
};

export default Layout;
