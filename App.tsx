
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import SearchTrips from './components/SearchTrips.tsx';
import PostTrip from './components/PostTrip.tsx';
import BookingsList from './components/BookingsList.tsx';
import ProfileManagement from './components/ProfileManagement.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import BookingModal from './components/BookingModal.tsx';
import AuthModal from './components/AuthModal.tsx';
import TripManagement from './components/TripManagement.tsx';
import OrderManagement from './components/OrderManagement.tsx';
import TripDetailModal from './components/TripDetailModal.tsx'; 
import VehicleManagementModal from './components/VehicleManagementModal.tsx';
import ConfirmationModal from './components/ConfirmationModal.tsx';
import GlobalSettingsModal, { AppSettings } from './components/GlobalSettingsModal.tsx';
import { Trip, Booking, TripStatus, Notification, Profile, NotificationCategory } from './types.ts';
import { supabase } from './lib/supabase.ts';
import { getTripStatusDisplay } from './components/SearchTrips.tsx';
import { statusOptions as bookingStatusOptions } from './components/OrderManagement.tsx';

type AlertConfig = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'info' | 'warning';
};

const SETTINGS_KEY = 'tripease_app_settings';
const NOTIFICATIONS_STORAGE_KEY = 'cungdi_user_notifications';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]); 
  const [staffBookings, setStaffBookings] = useState<Booking[]>([]); 
  
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userStats, setUserStats] = useState({ tripsCount: 0, bookingsCount: 0 });

  const pendingOrderCount = useMemo(() => {
    return staffBookings.filter(b => b.status === 'PENDING').length;
  }, [staffBookings]);

  const activeTripsCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return trips.filter(t => {
      const depDate = new Date(t.departure_time);
      return depDate >= today && depDate < tomorrow && t.status !== TripStatus.CANCELLED;
    }).length;
  }, [trips]);

  const activeBookingsCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const isStaff = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'driver';
    const bookingsToCount = isStaff ? staffBookings : bookings;

    return bookingsToCount.filter(b => {
      const trip = (b as any).trips;
      if (!trip) return false;
      const depDate = new Date(trip.departure_time);
      return depDate >= today && depDate < tomorrow && b.status !== 'CANCELLED' && b.status !== 'EXPIRED';
    }).length;
  }, [profile, staffBookings, bookings]);
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'register'>('login'); 

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false); 
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); 
  
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedTripBookings, setSelectedTripBookings] = useState<Booking[]>([]); 
  
  const [isPostTripModalOpen, setIsPostTripModalOpen] = useState(false); 
  const [postTripMode, setPostTripMode] = useState<'DRIVER' | 'PASSENGER'>('DRIVER');

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const showAlert = useCallback((config: Omit<AlertConfig, 'isOpen'>) => {
    setAlertConfig({ ...config, isOpen: true });
  }, []);

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  };

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : { showCancelled: false, showPastTrips: false, historyDays: 30 };
  });

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const refreshTimeoutRef = useRef<number | null>(null);
  const userRef = useRef(user);
  const profileRef = useRef(profile);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const openAuthModal = (view: 'login' | 'register' = 'login') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  };

  const fetchProfile = useCallback(async (userId: string) => {
    if (!userId) {
      setProfileLoading(false);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
        setProfile(data);
        // Kiểm tra xem đã có thông báo chào mừng chưa để tránh trùng lặp khi re-render
        setNotifications(prev => {
            const hasWelcome = prev.some(n => n.title === 'Chào mừng quay trở lại!' && (new Date().getTime() - new Date(n.timestamp).getTime() < 300000));
            if (hasWelcome) return prev;
            return [{
                id: 'welcome-' + Date.now(),
                title: 'Chào mừng quay trở lại!', 
                message: `Chào ${data.full_name}, hệ thống thông báo hiện đang hoạt động.`, 
                type: 'success', 
                category: 'SYSTEM',
                timestamp: new Date().toISOString(),
                read: false
            }, ...prev].slice(0, 50);
        });
    }
    setProfileLoading(false);
  }, []);

  const fetchTrips = useCallback(async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('*, profiles(full_name, phone, role, is_discount_provider), bookings(seats_booked, status)')
      .order('departure_time', { ascending: true });
    
    if (error) return;

    if (data) {
      const formatted = data.map((t: any) => {
        const confirmedBookings = (t.bookings || []).filter((b: any) => b.status === 'CONFIRMED');
        const bookedSeats = confirmedBookings.reduce((sum: number, b: any) => sum + b.seats_booked, 0);
        const realAvailableSeats = t.seats - bookedSeats;
        const activeOffers = (t.bookings || []).filter((b: any) => b.status !== 'CANCELLED' && b.status !== 'EXPIRED');

        return {
          ...t,
          driver_name: t.profiles?.full_name || 'Người dùng ẩn danh',
          driver_phone: t.profiles?.phone || '',
          trip_code: `T${t.id.substring(0, 5).toUpperCase()}`,
          bookings_count: activeOffers.length, 
          is_discount_provider: (t.profiles?.role === 'driver' && t.profiles?.is_discount_provider) || false,
          available_seats: realAvailableSeats < 0 ? 0 : realAvailableSeats
        };
      });
      setTrips(formatted);
    }
  }, []);

  const fetchUserBookings = useCallback(async (userId: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('bookings')
      .select('*, trips(*)')
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) return;
    setBookings(data || []);
  }, []);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info', category: NotificationCategory = 'SYSTEM') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      category,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  };

  const fetchStaffBookings = useCallback(async (userProfile: Profile) => {
    if (!userProfile) return;
    let query = supabase.from('bookings').select('*, profiles:passenger_id(full_name, phone), trips(*, driver_profile:profiles(full_name))').order('created_at', { ascending: false });

    if (userProfile.role === 'driver') {
      const { data: myTrips } = await supabase.from('trips').select('id').eq('driver_id', userProfile.id);
      const myTripIds = myTrips?.map(t => t.id) || [];
      if (myTripIds.length > 0) query = query.in('trip_id', myTripIds);
      else { setStaffBookings([]); return; }
    }
    const { data, error } = await query;
    if (error) return;
    setStaffBookings(data || []);
  }, []);

  const fetchUserStats = useCallback(async (userId: string) => {
    if (!userId) return;
    const { count: tripsCount } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('driver_id', userId);
    const { count: bookingsCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('passenger_id', userId);
    setUserStats({ tripsCount: tripsCount || 0, bookingsCount: bookingsCount || 0 });
  }, []);

  const refreshAllData = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      fetchTrips();
      if (userRef.current?.id) {
        fetchUserBookings(userRef.current.id);
        fetchUserStats(userRef.current.id);
        if (profileRef.current) fetchStaffBookings(profileRef.current);
      }
    }, 300) as unknown as number;
  }, [fetchTrips, fetchUserBookings, fetchStaffBookings, fetchUserStats]);

  const fetchSelectedTripDetails = useCallback(async (tripId: string | null) => {
    if (!tripId) {
      setSelectedTrip(null);
      setSelectedTripBookings([]);
      return;
    }
    const { data: latestTrip } = await supabase.from('trips').select('*, profiles(full_name, phone)').eq('id', tripId).single();
    if (!latestTrip) return;

    const formattedTrip = { ...latestTrip, driver_name: latestTrip.profiles?.full_name || 'Người dùng ẩn danh', driver_phone: latestTrip.profiles?.phone || '', trip_code: `T${latestTrip.id.substring(0, 5).toUpperCase()}` };
    const { data: bookingsForTrip } = await supabase.from('bookings').select('*, profiles:passenger_id(full_name, phone), trips(*)').eq('trip_id', tripId).order('created_at', { ascending: false });

    setSelectedTrip(formattedTrip);
    setSelectedTripBookings(bookingsForTrip || []);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setUser(data.session.user);
        fetchProfile(data.session.user.id);
      } else {
        setProfileLoading(false);
      }
    };
    
    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setProfileLoading(true);
        fetchProfile(currentUser.id);
      } else { 
        setProfile(null); 
        setProfileLoading(false);
        setBookings([]); 
        setStaffBookings([]); 
        setUserStats({ tripsCount: 0, bookingsCount: 0 }); 
      }
    });

    fetchTrips();
    return () => { authListener.subscription.unsubscribe(); };
  }, [fetchTrips, fetchProfile]);

  useEffect(() => { if (user?.id) { fetchUserBookings(user.id); fetchUserStats(user.id); } }, [user?.id, fetchUserBookings, fetchUserStats]);
  useEffect(() => { if (profile) fetchStaffBookings(profile); }, [profile, fetchStaffBookings]);

  useEffect(() => {
    // REALTIME LISTENER
    const channel = supabase.channel('app-global-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trips' }, async (payload) => {
        const currentProfile = profileRef.current;
        const newTrip = payload.new;
        
        if (currentProfile) {
            if (newTrip.is_request && (currentProfile.role === 'driver' || currentProfile.role === 'admin')) {
                addNotification(
                    'Yêu cầu tìm xe mới', 
                    `Khách hàng đang cần tìm xe lộ trình ${newTrip.origin_name} → ${newTrip.dest_name}.`, 
                    'info', 
                    'ORDER'
                );
            } else if (!newTrip.is_request && (currentProfile.role === 'user' || currentProfile.role === 'admin')) {
                addNotification(
                    'Chuyến xe mới khả dụng', 
                    `Một chuyến xe mới lộ trình ${newTrip.origin_name} → ${newTrip.dest_name} vừa được đăng.`, 
                    'success', 
                    'TRIP'
                );
            }
        }
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload) => {
        const currentUser = userRef.current;
        const currentProfile = profileRef.current;
        const { eventType, new: newRecord, old: oldRecord } = payload;

        if (currentUser) {
            // Case 1: Cập nhật trạng thái đơn (Dành cho hành khách)
            if (eventType === 'UPDATE' && newRecord.passenger_id === currentUser.id && newRecord.status !== oldRecord.status) {
                const statusLabel = bookingStatusOptions.find(s => s.value === newRecord.status)?.label || newRecord.status;
                addNotification(
                    'Cập nhật đơn hàng', 
                    `Đơn #${newRecord.id.substring(0,5).toUpperCase()} của bạn đã chuyển sang trạng thái: ${statusLabel}`, 
                    newRecord.status === 'CONFIRMED' || newRecord.status === 'PICKED_UP' ? 'success' : 'warning',
                    'ORDER'
                );
            }

            // Case 2: Đơn hàng mới (Dành cho tài xế)
            if (eventType === 'INSERT') {
                // Kiểm tra xem chuyến xe bị đặt có phải của mình không bằng cách query trực tiếp DB
                const { data: targetTrip } = await supabase
                    .from('trips')
                    .select('driver_id, origin_name, dest_name')
                    .eq('id', newRecord.trip_id)
                    .single();

                if (targetTrip && targetTrip.driver_id === currentUser.id) {
                    addNotification(
                        'Khách mới đặt chỗ', 
                        `Chuyến ${targetTrip.origin_name} → ${targetTrip.dest_name} vừa có yêu cầu mới (${newRecord.seats_booked} ghế).`, 
                        'success',
                        'ORDER'
                    );
                }
            }
        }
        refreshAllData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, async (payload) => {
          if (profileRef.current?.role === 'admin') {
              addNotification(
                  'Thành viên mới gia nhập', 
                  `${payload.new.full_name} vừa đăng ký tài khoản.`, 
                  'info', 
                  'SYSTEM'
              );
          }
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              console.log('⚡ Realtime System: Connected & Subscribed');
          }
      });

    return () => { supabase.removeChannel(channel); };
  }, [refreshAllData]);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const renderContent = () => {
    const commonProps = { trips, onBook: handleOpenBookingModal, userBookings: bookings, profile, onViewTripDetails: handleViewTripDetails, onPostClick: handlePostClick };
    const dashboardData = profile?.role === 'user' ? bookings : staffBookings;
    const handleManageVehicles = () => setIsVehicleModalOpen(true);

    switch (activeTab) {
      case 'dashboard-overview': return profile ? <Dashboard bookings={dashboardData} trips={trips} profile={profile} onViewTripDetails={handleViewTripDetails} currentView="overview" onManageVehicles={handleManageVehicles} /> : <SearchTrips {...commonProps} />;
      case 'dashboard-schedule': return profile ? <Dashboard bookings={dashboardData} trips={trips} profile={profile} onViewTripDetails={handleViewTripDetails} currentView="schedule" onManageVehicles={handleManageVehicles} /> : <SearchTrips {...commonProps} />;
      case 'dashboard-vehicles': return profile ? <Dashboard bookings={dashboardData} trips={trips} profile={profile} onViewTripDetails={handleViewTripDetails} currentView="vehicles" onManageVehicles={handleManageVehicles} /> : <SearchTrips {...commonProps} />;
      case 'dashboard': return profile ? <Dashboard bookings={dashboardData} trips={trips} profile={profile} onViewTripDetails={handleViewTripDetails} currentView="overview" onManageVehicles={handleManageVehicles} /> : <SearchTrips {...commonProps} />;
      case 'search': return <SearchTrips {...commonProps} />;
      case 'manage-trips': return <TripManagement profile={profile} trips={trips} bookings={staffBookings} onRefresh={refreshAllData} onViewTripDetails={handleViewTripDetails} showAlert={showAlert} />;
      case 'manage-orders': return <OrderManagement profile={profile} trips={trips} onRefresh={refreshAllData} onViewTripDetails={handleViewTripDetails} showAlert={showAlert} />;
      case 'admin': return (profile?.role === 'admin' || profile?.role === 'manager') ? <AdminPanel showAlert={showAlert} /> : <SearchTrips {...commonProps} />;
      default: return <SearchTrips {...commonProps} />;
    }
  };

  const handleOpenBookingModal = (tripId: string) => {
    if (!user) { openAuthModal('register'); return; }
    const trip = trips.find(t => t.id === tripId);
    if (trip) { 
      const statusLabel = getTripStatusDisplay(trip).label;
      if (['Hoàn thành', 'Đang chạy', 'Huỷ'].includes(statusLabel)) {
        showAlert({ title: 'Chuyến không hợp lệ', message: 'Chuyến này đã kết thúc, đang chạy hoặc bị hủy, không thể đặt chỗ.', variant: 'info', confirmText: 'Đóng' });
        return; 
      }
      setSelectedTrip(trip); setIsBookingModalOpen(true); 
    }
  };

  const handleViewTripDetails = useCallback((trip: Trip) => { setSelectedTrip(trip); setIsTripDetailModalOpen(true); }, []);

  const handlePostClick = (mode: 'DRIVER' | 'PASSENGER') => {
    if (!user) { openAuthModal('register'); return; }
    setPostTripMode(mode);
    setIsPostTripModalOpen(true);
  };

  const handleConfirmBooking = async (data: { phone: string; seats: number; note: string; passengerId?: string }) => {
    if (!selectedTrip || !user) return;
    const { data: latestTrip } = await supabase.from('trips').select('available_seats, status, departure_time').eq('id', selectedTrip.id).single();
    if (latestTrip && (latestTrip.status === TripStatus.CANCELLED || latestTrip.status === TripStatus.COMPLETED || new Date(latestTrip.departure_time) < new Date())) {
      showAlert({ title: 'Chuyến không hợp lệ', message: 'Xin lỗi, chuyến xe này không còn khả dụng để đặt chỗ.', variant: 'warning', confirmText: 'Đã hiểu' });
      return;
    }
    const passengerIdForBooking = data.passengerId || user.id;
    const { error: bookingError } = await supabase.from('bookings').insert({
      trip_id: selectedTrip.id, passenger_id: passengerIdForBooking, passenger_phone: data.phone,
      seats_booked: data.seats, total_price: selectedTrip.price * data.seats, status: 'PENDING', note: data.note
    });
    if (bookingError) showAlert({ title: 'Đặt chỗ thất bại', message: bookingError.message, variant: 'danger', confirmText: 'Đóng' });
    else { setIsBookingModalOpen(false); refreshAllData(); setActiveTab('manage-orders'); }
  };

  const handlePostTrip = async (tripsToPost: any[], forUserId?: string) => {
    if (!user) return;
    const authorId = forUserId || user.id;
    try {
      const formattedTrips = tripsToPost.map(t => ({
        driver_id: authorId, origin_name: t.origin.name, origin_desc: t.origin.description, dest_name: t.destination.name, dest_desc: t.destination.description, departure_time: t.departureTime, arrival_time: t.arrivalTime,
        price: t.price, seats: t.seats, available_seats: t.availableSeats, vehicle_info: t.vehicleInfo, status: TripStatus.PREPARING, is_request: t.isRequest 
      }));
      const { error } = await supabase.from('trips').insert(formattedTrips);
      if (error) throw error;
      refreshAllData();
      setIsPostTripModalOpen(false); 
      setActiveTab('manage-trips'); 
    } catch (err: any) { 
      showAlert({ title: 'Đăng chuyến thất bại', message: err.message || 'Đã có lỗi xảy ra, vui lòng thử lại.', variant: 'danger', confirmText: 'Đóng' });
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        notifications={notifications} 
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onClearAllNotifications={handleClearAllNotifications}
        profile={profile} profileLoading={profileLoading}
        onLoginClick={() => openAuthModal('login')} 
        onProfileClick={() => !user ? openAuthModal('register') : setIsProfileModalOpen(true)} 
        onOpenSettings={() => setIsSettingsModalOpen(true)} 
        pendingOrderCount={pendingOrderCount} activeTripsCount={activeTripsCount} activeBookingsCount={activeBookingsCount}
        onPostClick={handlePostClick}
      >
        <div className="animate-slide-up">{renderContent()}</div>
      </Layout>
      {selectedTrip && <BookingModal trip={selectedTrip} profile={profile} isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} onConfirm={handleConfirmBooking} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={() => refreshAllData()} showAlert={showAlert} initialView={authModalView} />
      <ProfileManagement isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} profile={profile} onUpdate={() => user && fetchProfile(user.id)} stats={userStats} allTrips={trips} userBookings={bookings} onManageVehicles={() => setIsVehicleModalOpen(true)} />
      {selectedTrip && <TripDetailModal trip={selectedTrip} currentBookings={selectedTripBookings} profile={profile} isOpen={isTripDetailModalOpen} onClose={() => { setIsTripDetailModalOpen(false); refreshAllData(); }} onRefresh={() => fetchSelectedTripDetails(selectedTrip.id)} showAlert={showAlert} />}
      <VehicleManagementModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} profile={profile} onVehiclesUpdated={refreshAllData} showAlert={showAlert} />
      <GlobalSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={appSettings} onSave={handleSaveSettings} />
      <ConfirmationModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} onClose={closeAlert} onConfirm={() => { if (alertConfig.onConfirm) alertConfig.onConfirm(); closeAlert(); }} confirmText={alertConfig.confirmText} cancelText={alertConfig.cancelText} variant={alertConfig.variant} />
      <PostTrip isOpen={isPostTripModalOpen} onClose={() => setIsPostTripModalOpen(false)} onPost={handlePostTrip} profile={profile} onManageVehicles={() => setIsVehicleModalOpen(true)} initialMode={postTripMode} />
    </>
  );
};

export default App;
