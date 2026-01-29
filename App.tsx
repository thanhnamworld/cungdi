
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
import { Trip, Booking, TripStatus, Notification, Profile } from './types.ts';
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]); 
  const [staffBookings, setStaffBookings] = useState<Booking[]>([]); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userStats, setUserStats] = useState({ tripsCount: 0, bookingsCount: 0 });
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'register'>('login'); 

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false); 
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); 
  
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedTripBookings, setSelectedTripBookings] = useState<Booking[]>([]); 
  
  const [isPostTripModalOpen, setIsPostTripModalOpen] = useState(false); // New state for PostTrip Modal
  const [postTripMode, setPostTripMode] = useState<'DRIVER' | 'PASSENGER'>('DRIVER');

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showAlert = useCallback((config: Omit<AlertConfig, 'isOpen'>) => {
    setAlertConfig({ ...config, isOpen: true });
  }, []);

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  };

  /* 
  // --- AUTO LOGIN DISABLED FOR PRODUCTION ---
  useEffect(() => {
    const autoLogin = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        console.log("Đang tự động đăng nhập...");
        const { error } = await supabase.auth.signInWithPassword({
          phone: '+84825846888', 
          password: '123123'
        });

        if (error) {
            console.error("Auto-login failed:", error);
            showAlert({
                title: 'Lỗi tự động đăng nhập',
                message: error.message,
                variant: 'danger',
                confirmText: 'Đóng'
            });
        }
      }
    };
    setTimeout(autoLogin, 500);
  }, [showAlert]);
  */

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
  const tripsRef = useRef(trips);
  const bookingsRef = useRef(bookings);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { tripsRef.current = trips; }, [trips]);
  useEffect(() => { bookingsRef.current = bookings; }, [bookings]);

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
    if (data) setProfile(data);
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
        const allBookings = t.bookings || [];
        const confirmedBookings = allBookings.filter((b: any) => b.status === 'CONFIRMED');
        const bookedSeats = confirmedBookings.reduce((sum: number, b: any) => sum + b.seats_booked, 0);
        const realAvailableSeats = t.seats - bookedSeats;
        const activeOffers = allBookings.filter((b: any) => b.status !== 'CANCELLED' && b.status !== 'EXPIRED');

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

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 20));
  };

  const fetchStaffBookings = useCallback(async (userProfile: Profile) => {
    if (!userProfile) return;
    // Updated query: include driver_profile inside trips to get the driver name correctly for Dashboard filtering
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
      if (user?.id) {
        fetchUserBookings(user.id);
        fetchUserStats(user.id);
        if (profile) fetchStaffBookings(profile);
      }
    }, 300) as unknown as number;
  }, [fetchTrips, fetchUserBookings, fetchStaffBookings, fetchUserStats, user?.id, profile]);

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
    if ((isTripDetailModalOpen || isBookingModalOpen) && selectedTrip?.id) fetchSelectedTripDetails(selectedTrip.id);
    else if (!isTripDetailModalOpen && !isBookingModalOpen) { setSelectedTrip(null); setSelectedTripBookings([]); }
  }, [isTripDetailModalOpen, isBookingModalOpen, selectedTrip?.id, fetchSelectedTripDetails]);

  useEffect(() => {
    const channel = supabase.channel('app-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload) => {
        const currentUser = userRef.current;
        const currentProfile = profileRef.current;
        const { eventType, new: newRecord, old: oldRecord } = payload;

        if (currentUser) {
            if (eventType === 'UPDATE' && newRecord.passenger_id === currentUser.id && newRecord.status !== oldRecord.status) {
                const statusLabel = bookingStatusOptions.find(s => s.value === newRecord.status)?.label || newRecord.status;
                let title = 'Cập nhật đơn hàng';
                let msg = `Đơn #${newRecord.id.substring(0,5).toUpperCase()} của bạn đã chuyển sang trạng thái: ${statusLabel}`;
                let type: 'info' | 'success' | 'warning' = 'info';
                
                if (newRecord.status === 'CONFIRMED') {
                    type = 'success';
                    msg = `Tuyệt vời! Đơn #${newRecord.id.substring(0,5).toUpperCase()} đã được tài xế xác nhận.`;
                } else if (newRecord.status === 'CANCELLED') {
                    type = 'warning';
                    msg = `Đơn #${newRecord.id.substring(0,5).toUpperCase()} đã bị hủy.`;
                } else if (newRecord.status === 'PICKED_UP') {
                    type = 'success';
                    msg = `Tài xế đã đón bạn cho đơn #${newRecord.id.substring(0,5).toUpperCase()}. Chúc bạn thượng lộ bình an!`;
                }

                addNotification(title, msg, type);
            }

            if (currentProfile?.role === 'driver') {
                const relevantTrip = tripsRef.current.find(t => t.id === newRecord.trip_id && t.driver_id === currentUser.id);
                
                if (relevantTrip) {
                    if (eventType === 'INSERT') {
                        addNotification(
                            'Khách mới đặt chỗ', 
                            `Chuyến ${relevantTrip.origin_name} -> ${relevantTrip.dest_name} vừa có yêu cầu mới (${newRecord.seats_booked} ghế).`, 
                            'success'
                        );
                    } else if (eventType === 'UPDATE' && newRecord.status === 'CANCELLED' && oldRecord.status !== 'CANCELLED') {
                         addNotification(
                            'Khách hủy đặt chỗ', 
                            `Một đơn đặt chỗ trên chuyến ${relevantTrip.origin_name} -> ${relevantTrip.dest_name} vừa bị hủy.`, 
                            'warning'
                        );
                    }
                }
            }
        }
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, async (payload) => {
         const currentUser = userRef.current;
         const { eventType, new: newRecord, old: oldRecord } = payload;
         
         if (currentUser && eventType === 'UPDATE') {
             const myBooking = bookingsRef.current.find(b => b.trip_id === newRecord.id && b.status === 'CONFIRMED');
             
             if (myBooking && newRecord.status !== oldRecord.status) {
                 const statusInfo = getTripStatusDisplay(newRecord as Trip);
                 let msg = `Chuyến xe bạn đặt (${newRecord.origin_name} -> ${newRecord.dest_name}) đã chuyển sang: ${statusInfo.label}`;
                 let type: 'info' | 'success' | 'warning' = 'info';

                 if (newRecord.status === 'ON_TRIP') {
                     msg = `Xe bắt đầu chạy! Chuyến ${newRecord.origin_name} -> ${newRecord.dest_name} đang khởi hành.`;
                     type = 'success';
                 } else if (newRecord.status === 'CANCELLED') {
                     msg = `Rất tiếc, chuyến xe ${newRecord.origin_name} -> ${newRecord.dest_name} đã bị hủy bởi tài xế.`;
                     type = 'warning';
                 } else if (newRecord.status === 'COMPLETED') {
                     msg = `Chuyến đi ${newRecord.origin_name} -> ${newRecord.dest_name} đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ!`;
                     type = 'success';
                 }
                 
                 addNotification('Thông báo chuyến đi', msg, type);
             }
         }
         refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, async (payload) => { refreshAllData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshAllData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      let hasGlobalChanges = false;

      const { data: latestTrips } = await supabase.from('trips').select('*, bookings(seats_booked, status)');
      
      for (const trip of latestTrips || []) {
        const confirmedBookings = trip.bookings?.filter((b: any) => b.status === 'CONFIRMED') || [];
        const bookedSeats = confirmedBookings.reduce((sum: number, b: any) => sum + b.seats_booked, 0);
        const realAvailable = trip.seats - bookedSeats;
        
        if (realAvailable !== trip.available_seats) {
           await supabase.from('trips').update({ available_seats: realAvailable }).eq('id', trip.id);
           hasGlobalChanges = true;
        }

        if (trip.status === TripStatus.CANCELLED || trip.status === TripStatus.COMPLETED) continue;
        
        const departure = new Date(trip.departure_time);
        const arrival = trip.arrival_time ? new Date(trip.arrival_time) : new Date(departure.getTime() + 3 * 60 * 60 * 1000);
        let targetStatus = trip.status;
        const diffMins = Math.floor((departure.getTime() - now.getTime()) / 60000);
        
        if (now > arrival) targetStatus = TripStatus.COMPLETED;
        else if (now >= departure && now <= arrival) targetStatus = TripStatus.ON_TRIP;
        else {
          if (diffMins <= 60 && diffMins > 0) targetStatus = TripStatus.URGENT;
          else targetStatus = TripStatus.PREPARING;
          
          if (realAvailable <= 0) targetStatus = TripStatus.FULL;
        }
        
        if (targetStatus !== trip.status) {
          hasGlobalChanges = true;
          await supabase.from('trips').update({ status: targetStatus }).eq('id', trip.id);
        }

        const { data: tripBookings } = await supabase.from('bookings').select('*').eq('trip_id', trip.id);
        for (const booking of tripBookings || []) {
          if (now >= departure && now <= arrival && (booking.status === 'CONFIRMED' || booking.status === 'PICKED_UP')) {
            await supabase.from('bookings').update({ status: 'ON_BOARD' }).eq('id', booking.id);
            hasGlobalChanges = true;
          }
          if (now > arrival && booking.status === 'PENDING') {
            await supabase.from('bookings').update({ status: 'EXPIRED' }).eq('id', booking.id);
            hasGlobalChanges = true;
          }
        }
      }

      if (hasGlobalChanges) refreshAllData();
    }, 60000); 
    return () => clearInterval(interval);
  }, [refreshAllData]);

  const filteredTrips = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - appSettings.historyDays);
    cutoffDate.setHours(0, 0, 0, 0);

    return trips.filter(trip => {
      const departureDate = new Date(trip.departure_time);
      
      // Filter out trips older than history limit
      if (departureDate < new Date()) {
         if (departureDate < cutoffDate) return false;
      }

      // We REMOVED the global check for !appSettings.showPastTrips here
      // to allow history to be shown in management views.
      // SearchTrips component will implement its own filter for future trips only.

      if (!appSettings.showCancelled && trip.status === TripStatus.CANCELLED) {
        return false;
      }
      return true;
    });
  }, [trips, appSettings]);

  const filteredBookings = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - appSettings.historyDays);
    cutoffDate.setHours(0, 0, 0, 0);

    return bookings.filter(booking => {
        const trip = booking.trip_details || trips.find(t => t.id === booking.trip_id);
        const departureDate = trip ? new Date(trip.departure_time) : new Date(booking.created_at);

        if (departureDate < new Date()) {
            if (departureDate < cutoffDate) return false;
        }

        if (!appSettings.showCancelled) {
            if (booking.status === 'CANCELLED') return false;
            if (trip && trip.status === TripStatus.CANCELLED) return false;
        }

        return true;
    });
  }, [bookings, trips, appSettings]);

  const filteredStaffBookings = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - appSettings.historyDays);
    cutoffDate.setHours(0, 0, 0, 0);

    return staffBookings.filter(booking => {
       const trip = (booking as any).trips;
       const departureDate = trip ? new Date(trip.departure_time) : new Date(booking.created_at);

       if (departureDate < new Date() && departureDate < cutoffDate) return false;

       if (!appSettings.showCancelled) {
           if (booking.status === 'CANCELLED') return false;
           if (trip && trip.status === TripStatus.CANCELLED) return false;
       }
       return true;
    });
  }, [staffBookings, appSettings]);


  const pendingOrderCount = useMemo(() => {
    return filteredStaffBookings.filter(b => b.status === 'PENDING').length;
  }, [filteredStaffBookings]);
  
  const activeTripsCount = useMemo(() => {
    if (!profile) return 0;
    const nonTerminalTripStatus: TripStatus[] = [TripStatus.PREPARING, TripStatus.URGENT, TripStatus.FULL, TripStatus.ON_TRIP];
    const myActiveTrips = filteredTrips.filter(t => t.driver_id === profile.id && nonTerminalTripStatus.includes(t.status)).length;
    return myActiveTrips;
  }, [filteredTrips, profile]);

  const activeBookingsCount = useMemo(() => {
    if (!profile) return 0;
    const nonTerminalBookingStatus = ['PENDING', 'CONFIRMED', 'PICKED_UP', 'ON_BOARD'];
    const myActiveBookings = filteredBookings.filter(b => nonTerminalBookingStatus.includes(b.status)).length;
    return myActiveBookings;
  }, [filteredBookings, profile]);


  const handlePostTrip = async (tripsToPost: any[], forUserId?: string) => {
    if (!user) return;
    const authorId = forUserId || user.id;

    try {
      const formattedTrips = tripsToPost.map(t => ({
        driver_id: authorId, 
        origin_name: t.origin.name, 
        origin_desc: t.origin.description, 
        dest_name: t.destination.name, 
        dest_desc: t.destination.description, 
        departure_time: t.departureTime, 
        arrival_time: t.arrivalTime,
        price: t.price, 
        seats: t.seats, 
        available_seats: t.availableSeats, 
        vehicle_info: t.vehicleInfo, 
        status: TripStatus.PREPARING,
        is_request: t.isRequest 
      }));
      const { error } = await supabase.from('trips').insert(formattedTrips);
      if (error) throw error;
      refreshAllData();
      
      // Auto close modal handled by props in PostTrip
      setIsPostTripModalOpen(false); 
      setActiveTab('manage-trips'); 
    } catch (err: any) { 
      showAlert({ title: 'Đăng chuyến thất bại', message: err.message || 'Đã có lỗi xảy ra, vui lòng thử lại.', variant: 'danger', confirmText: 'Đóng' });
    }
  };

  const handleConfirmBooking = async (data: { phone: string; seats: number; note: string; passengerId?: string }) => {
    if (!selectedTrip || !user) return;
    const { data: latestTrip } = await supabase.from('trips').select('available_seats, status, departure_time').eq('id', selectedTrip.id).single();
    if (latestTrip && (latestTrip.status === TripStatus.CANCELLED || latestTrip.status === TripStatus.COMPLETED || new Date(latestTrip.departure_time) < new Date())) {
      showAlert({ title: 'Chuyến không hợp lệ', message: 'Xin lỗi, chuyến xe này không còn khả dụng để đặt chỗ.', variant: 'warning', confirmText: 'Đã hiểu' });
      return;
    }
    
    if (!selectedTrip.is_request && latestTrip && latestTrip.available_seats < data.seats) {
      showAlert({ title: 'Không đủ chỗ', message: `Chuyến xe chỉ còn ${latestTrip.available_seats} ghế trống. Vui lòng chọn lại số lượng.`, variant: 'warning', confirmText: 'Đã hiểu' });
      return;
    }

    const passengerIdForBooking = data.passengerId || user.id;

    const { error: bookingError } = await supabase.from('bookings').insert({
      trip_id: selectedTrip.id, 
      passenger_id: passengerIdForBooking, 
      passenger_phone: data.phone,
      seats_booked: data.seats, 
      total_price: selectedTrip.price * data.seats, 
      status: 'PENDING',
      note: data.note
    });
    
    if (bookingError) {
      showAlert({ title: 'Đặt chỗ thất bại', message: bookingError.message, variant: 'danger', confirmText: 'Đóng' });
    } else {
      setIsBookingModalOpen(false);
      refreshAllData();
      setActiveTab('manage-orders');
    }
  };

  const handleOpenBookingModal = (tripId: string) => {
    if (!user) { 
        openAuthModal('register');
        return; 
    }
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
    if (!user) {
        openAuthModal('register');
        return;
    }
    setPostTripMode(mode);
    setIsPostTripModalOpen(true);
  };

  const renderContent = () => {
    const commonProps = { trips: filteredTrips, onBook: handleOpenBookingModal, userBookings: filteredBookings, profile, onViewTripDetails: handleViewTripDetails, onPostClick: handlePostClick };
    
    // Choose the correct data source for Dashboard based on role
    // User sees their OWN bookings (`filteredBookings`).
    // Driver/Manager sees their TRIPS' bookings (`filteredStaffBookings`).
    const dashboardData = profile?.role === 'user' ? filteredBookings : filteredStaffBookings;
    const handleManageVehicles = () => setIsVehicleModalOpen(true);

    switch (activeTab) {
      case 'dashboard-overview': return profile ? <Dashboard bookings={dashboardData} trips={filteredTrips} profile={profile} onViewTripDetails={handleViewTripDetails} currentView="overview" onManageVehicles={handleManageVehicles} /> : <SearchTrips {...commonProps} />;
      case 'dashboard-schedule': return profile ? <Dashboard bookings={dashboardData} trips={filteredTrips} profile={profile} onViewTripDetails={handleViewTripDetails} currentView="schedule" onManageVehicles={handleManageVehicles} /> : <SearchTrips {...commonProps} />;
      case 'dashboard-vehicles': return profile ? <Dashboard bookings={dashboardData} trips={filteredTrips} profile={profile} onViewTripDetails={handleViewTripDetails} currentView="vehicles" onManageVehicles={handleManageVehicles} /> : <SearchTrips {...commonProps} />;
      // Fallback for old link if any
      case 'dashboard': return profile ? <Dashboard bookings={dashboardData} trips={filteredTrips} profile={profile} onViewTripDetails={handleViewTripDetails} currentView="overview" onManageVehicles={handleManageVehicles} /> : <SearchTrips {...commonProps} />;
      case 'search': return <SearchTrips {...commonProps} />;
      case 'manage-trips': return <TripManagement profile={profile} trips={filteredTrips} bookings={staffBookings} onRefresh={refreshAllData} onViewTripDetails={handleViewTripDetails} showAlert={showAlert} />;
      case 'manage-orders': return <OrderManagement profile={profile} trips={filteredTrips} onRefresh={refreshAllData} onViewTripDetails={handleViewTripDetails} showAlert={showAlert} />;
      case 'admin': return (profile?.role === 'admin' || profile?.role === 'manager') ? <AdminPanel showAlert={showAlert} /> : <SearchTrips {...commonProps} />;
      default: return <SearchTrips {...commonProps} />;
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        notifications={notifications} 
        clearNotification={(id) => setNotifications(n => n.map(x => x.id === id ? {...x, read: true} : x))} 
        profile={profile}
        profileLoading={profileLoading}
        onLoginClick={() => openAuthModal('login')} 
        onProfileClick={() => !user ? openAuthModal('register') : setIsProfileModalOpen(true)} 
        onOpenSettings={() => setIsSettingsModalOpen(true)} 
        pendingOrderCount={pendingOrderCount}
        activeTripsCount={activeTripsCount}
        activeBookingsCount={activeBookingsCount}
        onPostClick={handlePostClick}
      >
        <div className="animate-slide-up">{renderContent()}</div>
      </Layout>
      {selectedTrip && <BookingModal trip={selectedTrip} profile={profile} isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} onConfirm={handleConfirmBooking} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={() => refreshAllData()} showAlert={showAlert} initialView={authModalView} />
      <ProfileManagement isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} profile={profile} onUpdate={() => user && fetchProfile(user.id)} stats={userStats} allTrips={trips} userBookings={bookings} onManageVehicles={() => setIsVehicleModalOpen(true)} />
      {selectedTrip && <TripDetailModal trip={selectedTrip} currentBookings={selectedTripBookings} profile={profile} isOpen={isTripDetailModalOpen} onClose={() => { setIsTripDetailModalOpen(false); refreshAllData(); }} onRefresh={() => fetchSelectedTripDetails(selectedTrip.id)} showAlert={showAlert} />}
      <VehicleManagementModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} profile={profile} onVehiclesUpdated={refreshAllData} showAlert={showAlert} />
      
      <GlobalSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={appSettings}
        onSave={handleSaveSettings}
      />

      <ConfirmationModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={closeAlert}
        onConfirm={() => {
          if (alertConfig.onConfirm) alertConfig.onConfirm();
          closeAlert();
        }}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        variant={alertConfig.variant}
      />

      {/* New PostTrip Modal */}
      <PostTrip 
        isOpen={isPostTripModalOpen}
        onClose={() => setIsPostTripModalOpen(false)}
        onPost={handlePostTrip}
        profile={profile}
        onManageVehicles={() => setIsVehicleModalOpen(true)}
        initialMode={postTripMode}
      />
    </>
  );
};

export default App;
