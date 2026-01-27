import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Phone, User, MapPin, Users, CreditCard, AlertCircle, CheckCircle2, Sparkles, Info, Navigation, Calendar, Clock, ArrowRight, Car, Map, ShieldCheck, Wifi, Snowflake, Droplets, Star, Award, Copy, GripVertical, Crown, Check, Search, Ticket, Wallet, MessageSquare, ChevronDown, Play, Timer, Zap, Gem, Trophy, Heart, Medal, UserSearch, Loader2, Handshake } from 'lucide-react';
import { Trip, Profile, TripStatus, MembershipTier } from '../types';
import CopyableCode from './CopyableCode';
import { getVehicleConfig, getTripStatusDisplay } from './SearchTrips';
import { LOCAL_LOCATIONS } from '../services/locationData';
import { supabase } from '../lib/supabase';

interface BookingModalProps {
  trip: Trip;
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { phone: string; seats: number; note: string; passengerId?: string }) => void;
}

const searchLocalPlaces = (query: string) => {
  if (!query || query.length < 1) return [];
  const normalizedQuery = query.toLowerCase().trim();
  const matches = LOCAL_LOCATIONS.filter(loc => 
    loc.name.toLowerCase().includes(normalizedQuery) || 
    loc.shortName.toLowerCase().includes(normalizedQuery)
  );
  return matches.slice(0, 5).map(item => item.name);
};

const getTierConfig = (tier: MembershipTier = 'standard') => {
    switch (tier) {
        case 'silver': return { label: 'Bạc', icon: Medal, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', discountVal: 0.1, discountLabel: '10%' };
        case 'gold': return { label: 'Vàng', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', discountVal: 0.2, discountLabel: '20%' };
        case 'diamond': return { label: 'Kim Cương', icon: Gem, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100', discountVal: 0.3, discountLabel: '30%' };
        case 'family': return { label: 'Gia Đình', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', discountVal: 0.8, discountLabel: '80%' };
        default: return { label: 'Thường', icon: User, color: 'text-slate-400', bg: 'bg-white', border: 'border-slate-100', discountVal: 0, discountLabel: '0%' };
    }
};

const BookingModal: React.FC<BookingModalProps> = ({ trip, profile, isOpen, onClose, onConfirm }) => {
  const [phone, setPhone] = useState('');
  const [seats, setSeats] = useState(1);
  const [note, setNote] = useState('');
  
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupDetail, setPickupDetail] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [dropoffDetail, setDropoffDetail] = useState('');
  
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<string[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const [showSeatPicker, setShowSeatPicker] = useState(false);
  
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [driverIsProvider, setDriverIsProvider] = useState(false);

  const isRequest = trip.is_request;
  const isStaff = profile?.role === 'admin' || profile?.role === 'manager';

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // States for Staff Booking
  const [isStaffBooking, setIsStaffBooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const pickupRef = useRef<HTMLDivElement>(null);
  const dropoffRef = useRef<HTMLDivElement>(null);
  const seatPickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (profile) setPhone(profile.phone || '');
      setPickupLocation(trip.origin_name);
      setDropoffLocation(trip.dest_name);
      setPickupDetail('');
      setDropoffDetail('');
      setSeats(isRequest ? trip.seats : 1);
      document.body.style.overflow = 'hidden';
      
      const fetchDriverDetails = async () => {
        if (!trip.driver_id) return;
        // FIX: Lấy thêm 'role' để kiểm tra quyền hạn tài xế
        const { data: driverProfile } = await supabase.from('profiles').select('role, is_discount_provider').eq('id', trip.driver_id).single();
        // FIX: Chỉ kích hoạt giảm giá nếu đúng là Tài xế và có bật chế độ ưu đãi
        if (driverProfile) {
            setDriverIsProvider((driverProfile.role === 'driver' && driverProfile.is_discount_provider) || false);
        }
        
        if (!trip.is_request && trip.vehicle_info) {
            const parts = trip.vehicle_info.split(' (');
            if (parts.length > 1) {
                const plate = parts[1].replace(')', '').trim();
                const { data } = await supabase.from('vehicles').select('image_url').eq('license_plate', plate).maybeSingle();
                if (data?.image_url) setVehicleImage(data.image_url); else setVehicleImage(null);
            } else { setVehicleImage(null); }
        } else { setVehicleImage(null); }
      };
      
      fetchDriverDetails();

    } else {
        setDriverIsProvider(false);
        setVehicleImage(null);
        setIsStaffBooking(false);
        setSelectedUser(null);
        setSearchQuery('');
    }
    return () => {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, profile, trip, isRequest]);
  
  useEffect(() => {
    if (selectedUser) {
        setPhone(selectedUser.phone || '');
    } else {
        setPhone(profile?.phone || '');
    }
  }, [selectedUser, profile]);
  
  // Search Users Debounced Effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
    }
    if (searchQuery.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
            .limit(5);

        if (error) {
            console.error(error);
            setSearchResults([]);
        } else {
            setSearchResults(data || []);
        }
        setIsSearching(false);
    }, 500);

    return () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside modal content (modalRef)
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
         onClose();
         return; // Exit early
      }

      if (pickupRef.current && !pickupRef.current.contains(event.target as Node)) setShowPickupSuggestions(false);
      if (dropoffRef.current && !dropoffRef.current.contains(event.target as Node)) setShowDropoffSuggestions(false);
      if (seatPickerRef.current && !seatPickerRef.current.contains(event.target as Node)) setShowSeatPicker(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchResults([]);
    };
    if(isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => { setPickupSuggestions(searchLocalPlaces(pickupLocation)); }, [pickupLocation]);
  useEffect(() => { setDropoffSuggestions(searchLocalPlaces(dropoffLocation)); }, [dropoffLocation]);

  const { originalPrice, discountAmount, finalPrice, discountLabel, tierConfig } = useMemo(() => {
      const baseTotal = trip.price * seats;
      let discount = 0;
      const tier = (selectedUser || profile)?.membership_tier || 'standard';
      const config = getTierConfig(tier);

      if (!isRequest && driverIsProvider && tier !== 'standard') {
          discount = baseTotal * config.discountVal;
      }

      return {
          originalPrice: baseTotal,
          discountAmount: discount,
          finalPrice: baseTotal - discount,
          discountLabel: `Giảm giá thành viên ${config.label}`,
          tierConfig: config
      };
  }, [trip.price, seats, profile, driverIsProvider, isRequest, isOpen, selectedUser]);


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phone.length < 10) { setError('Số điện thoại không hợp lệ'); return; }
    if (!pickupLocation.trim() || !dropoffLocation.trim()) { setError('Vui lòng chọn điểm đón và điểm trả chính'); return; }
    
    setIsSubmitting(true);

    const fullPickup = pickupDetail ? `${pickupLocation} (${pickupDetail})` : pickupLocation;
    const fullDropoff = dropoffDetail ? `${dropoffLocation} (${dropoffDetail})` : dropoffLocation;

    const fullNote = `
[LỘ TRÌNH CỤ THỂ]
📍 Đón: ${fullPickup}
🏁 Trả: ${fullDropoff}
---
💬 Lời nhắn: ${note}
    `.trim();

    setTimeout(() => {
      onConfirm({ phone, seats, note: fullNote, passengerId: selectedUser?.id });
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  const getSeatColor = (n: number) => {
    if (n <= 2) return 'bg-emerald-500';
    if (n <= 4) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const isWaitingList = !isRequest && trip.available_seats <= 0;
  
  const departureDate = new Date(trip.departure_time);
  const arrivalDateObj = trip.arrival_time ? new Date(trip.arrival_time) : new Date(departureDate.getTime() + 3 * 60 * 60 * 1000);
  const depTime = departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const depDate = departureDate.toLocaleDateString('vi-VN');
  const arrTime = arrivalDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const arrDate = arrivalDateObj.toLocaleDateString('vi-VN');
  const tripCode = trip.trip_code || `T${trip.id.substring(0, 5).toUpperCase()}`;

  const statusInfo = getTripStatusDisplay(trip);
  const StatusIcon = statusInfo.icon;
  
  const vehicleRaw = trip.vehicle_info || '';
  const vehicleParts = vehicleRaw.split(' (');
  let vehicleModel = vehicleParts[0] || '---';
  if (vehicleModel === 'Cần bao xe') { vehicleModel = 'Cần tìm xe'; }
  const licensePlate = vehicleParts[1] ? vehicleParts[1].replace(')', '') : '';
  const vehicleConfig = getVehicleConfig(vehicleModel);
  const VIcon = isRequest ? Users : vehicleConfig.icon;

  const bookedSeats = trip.seats - trip.available_seats;
  const fillPercentage = trip.seats > 0 ? (bookedSeats / trip.seats) * 100 : 0;
  
  let fillBarColor: string;
  if (isRequest) {
    const bookingsCount = trip.bookings_count || 0;
    fillBarColor = bookingsCount === 0 ? 'bg-slate-200' : bookingsCount === 1 ? 'bg-emerald-500' : 'bg-rose-500';
  } else {
    if (bookedSeats <= 0) fillBarColor = 'bg-slate-200';
    else if (fillPercentage < 50) fillBarColor = 'bg-emerald-500';
    else if (fillPercentage < 100) fillBarColor = 'bg-amber-500';
    else fillBarColor = 'bg-rose-500';
  }

  const createdAtDate = trip.created_at ? new Date(trip.created_at) : null;
  const createdAtTime = createdAtDate ? createdAtDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const createdAtDay = createdAtDate ? `${String(createdAtDate.getDate()).padStart(2, '0')}/${String(createdAtDate.getMonth() + 1).padStart(2, '0')}` : '--/--';

  const isOngoing = trip.status === TripStatus.ON_TRIP;
  const isUrgent = trip.status === TripStatus.URGENT;
  const isPreparing = trip.status === TripStatus.PREPARING;
  const isCompleted = trip.status === TripStatus.COMPLETED;
  const isCancelled = trip.status === TripStatus.CANCELLED;

  const rightTheme = isRequest 
    ? { textMain: 'text-orange-600', bgSoft: 'bg-orange-50/50', bgBadge: 'bg-orange-50', borderBadge: 'border-orange-100', textBadge: 'text-orange-600', border: 'border-orange-100', ring: 'focus:ring-orange-100', focusBorder: 'focus:border-orange-400', button: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200', iconColor: 'text-orange-500', dot: 'bg-orange-500' }
    : { textMain: 'text-indigo-600', bgSoft: 'bg-indigo-50/50', bgBadge: 'bg-indigo-50', borderBadge: 'border-indigo-100', textBadge: 'text-indigo-600', border: 'border-indigo-100', ring: 'focus:ring-indigo-100', focusBorder: 'focus:border-indigo-400', button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200', iconColor: 'text-indigo-500', dot: 'bg-indigo-500' };

  const TripMainInfoCard = ({ className = "" }) => (
    <div className={`bg-white p-4 rounded-[24px] border shadow-sm flex flex-col justify-between group overflow-hidden relative ${isOngoing ? 'border-blue-200 bg-blue-50/20' : isUrgent ? 'border-rose-400 bg-rose-50/20' : isPreparing ? 'border-amber-300 bg-amber-50/10' : 'border-slate-100'} ${isCompleted || isCancelled ? 'opacity-80' : ''} ${className}`}>
        <div>
            <div className="flex items-center justify-between mb-3"><div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold z-10 ${statusInfo.style}`}>{isOngoing ? <Play size={10} className="animate-pulse" /> : <StatusIcon size={10} />} {statusInfo.label}</div><div className="flex flex-col items-center"><span className="text-[8px] font-bold text-slate-500">{isRequest ? (trip.seats === 7 ? 'Bao xe' : `${trip.seats} ghế`) + ` (${trip.bookings_count || 0} xe nhận)` : `Còn ${trip.available_seats}/${trip.seats} ghế trống`}</span><div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5"><div className={`h-full rounded-full transition-all duration-500 ${fillBarColor}`} style={{ width: `${isRequest ? 100 : fillPercentage}%` }}></div></div></div><p className={`text-sm font-bold tracking-tight ${isRequest ? 'text-orange-600' : 'text-indigo-600'}`}>{trip.price === 0 ? 'Thoả thuận' : new Intl.NumberFormat('vi-VN').format(trip.price) + 'đ'}</p></div>
            <div className="flex flex-col gap-2.5 items-start mb-3 min-h-[30px] justify-center"><div className="flex items-center gap-2.5 w-full"><div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg shrink-0 ${isRequest ? 'bg-orange-500 shadow-orange-100' : 'bg-indigo-600 shadow-indigo-100'}`}>{trip.driver_name?.charAt(0) || 'U'}</div><h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate flex-1">{trip.driver_name}</h4></div><div className="flex items-center gap-1.5 min-w-0 flex-wrap pl-0.5"><span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate ${isRequest ? 'bg-orange-50 text-orange-600 border-orange-100' : vehicleConfig.style}`}><VIcon size={9} /> {isRequest ? (trip.vehicle_info || 'Cần tìm xe') : vehicleModel}</span>{!isRequest && licensePlate && (<div className="inline-flex items-center bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm self-start whitespace-nowrap"><CopyableCode code={licensePlate} className="text-[9px] font-black uppercase tracking-wider" label={licensePlate} /></div>)}</div></div>
            <div className="space-y-2.5 mb-3 relative"><div className="absolute left-[7px] top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-indigo-100/70 via-slate-100/70 to-emerald-100/70"></div><div className="flex items-center gap-3 relative z-10"><div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border shadow-lg bg-indigo-100/70 border-indigo-200/50 shadow-indigo-200/50"><div className="w-2 h-2 rounded-full shadow-inner bg-indigo-600"></div></div><div className="flex-1"><p className="font-bold text-slate-700 text-[12px] truncate leading-tight">{trip.origin_name}</p><div className="flex items-center gap-1.5 mt-1"><div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border shadow-sm bg-indigo-50 text-indigo-600 border-indigo-100"><Clock size={8} /> <span className="text-[9px] font-black">{depTime}</span></div><div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /> <span className="text-[9px] font-bold">{depDate}</span></div></div></div></div><div className="flex items-center gap-3 relative z-10"><div className="w-4 h-4 rounded-full bg-emerald-100/70 flex items-center justify-center shrink-0 border border-emerald-200/50 shadow-lg shadow-emerald-200/50"><div className="w-2 h-2 rounded-full shadow-inner bg-emerald-600"></div></div><div className="flex-1"><p className="font-bold text-slate-700 text-[12px] truncate leading-tight">{trip.dest_name}</p><div className="flex items-center gap-1.5 mt-1"><div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm"><Clock size={8} /> <span className="text-[9px] font-black">{arrTime}</span></div><div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /> <span className="text-[9px] font-bold">{arrDate}</span></div></div></div></div></div>
        </div>
        <div className="mt-auto pt-3 border-t border-slate-100 grid grid-cols-2 items-center"><div className="flex justify-start"><div className="inline-flex items-center bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100 shadow-sm"><CopyableCode code={tripCode} className="text-[9px] font-black" label={tripCode} /></div></div><div className="flex justify-end items-center gap-1 text-[9px] font-bold text-slate-400"><Clock size={10} className="shrink-0" /><span>{createdAtTime} {createdAtDay}</span></div></div>
    </div>
  );

  const TripDriverInfoCard = ({ className = "" }) => (
    !isRequest ? (
         <div className={`bg-white rounded-[24px] border border-emerald-100 p-5 shadow-sm space-y-3 flex flex-col justify-center ${className}`}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500" /><h4 className="text-xs font-bold text-slate-800">Thông tin xe & tài xế</h4></div>{driverIsProvider && (<div className="text-amber-500 text-[10px] font-black flex items-center gap-1"><Handshake size={14} /> Đối tác Ưu đãi</div>)}</div><div className="flex items-center gap-4"><div className="relative"><div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200"><div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-300"><User size={20} /></div></div><div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white p-0.5 rounded-full border border-white shadow-sm"><Crown size={8} fill="currentColor" /></div></div><div className="flex-1"><div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-800">Tài xế {trip.driver_name?.split(' ').pop()}</span><span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 border border-yellow-100 rounded text-[9px] font-bold flex items-center gap-0.5">5.0 <Star size={8} fill="currentColor" /></span></div><p className="text-[10px] text-slate-400 mt-0.5">Thành viên Đối tác • 150+ Chuyến</p></div></div><div className="h-px bg-slate-100 w-full"></div><div className="flex gap-4"><div className="w-20 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative">{vehicleImage ? (<img src={vehicleImage} alt="Xe" className="w-full h-full object-cover" />) : (<Car size={20} className="text-slate-300" />)}</div><div className="flex-1"><p className="text-xs font-bold text-slate-800 mb-1">Tiện ích trên xe</p><div className="flex flex-wrap gap-1.5"><div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"><Wifi size={10} className="text-blue-500" /> Wifi</div><div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"><Snowflake size={10} className="text-cyan-500" /> Điều hoà</div><div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"><Droplets size={10} className="text-blue-400" /> Nước</div></div></div></div></div>
    ) : null
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      {/* Updated Wrapper to support positioning context for the button */}
      <div className="relative w-[calc(100%-24px)] md:w-full max-w-6xl h-[90vh] md:h-[85vh] mx-3 md:mx-0 z-[150] animate-in zoom-in-95 duration-300">
        <div ref={modalRef} className="bg-[#F8FAFC] w-full h-full rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                <div className="hidden md:flex w-1/2 h-full flex-col bg-emerald-50/40 border-r border-slate-200 p-6 pt-8"><div className="flex items-center gap-3 mb-5 shrink-0 h-[32px]"><div className="p-2 bg-emerald-100/50 rounded-xl text-emerald-600 border border-emerald-100"><Info size={18} /></div><h3 className="text-lg font-black text-slate-800 tracking-tight">Thông tin chuyến</h3></div><div className="flex-1 flex flex-col gap-4 min-h-0"><TripMainInfoCard className="flex-1" /><TripDriverInfoCard className="h-[210px] shrink-0" /></div></div>
                <div className={`w-full md:w-1/2 h-full flex flex-col relative ${rightTheme.bgSoft} p-6`}>
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                        <div className="md:hidden space-y-4"><div className="flex items-center gap-3 mb-5 shrink-0 h-[32px]"><div className="p-2 bg-emerald-100/50 rounded-xl text-emerald-600 border border-emerald-100"><Info size={18} /></div><h3 className="text-lg font-black text-slate-800 tracking-tight">Thông tin chuyến</h3></div><TripMainInfoCard className="h-auto" /><TripDriverInfoCard className="h-auto" /><div className="w-full h-px bg-slate-200/50 my-2"></div></div>
                        <div className="flex items-center gap-3 mb-1 shrink-0 h-[32px]"><div className={`p-2 rounded-xl border ${rightTheme.bgBadge} ${rightTheme.borderBadge} ${rightTheme.textMain}`}><CreditCard size={18} /></div><h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">{isRequest ? 'Nhận chuyến ngay' : 'Đặt chỗ ngay'}{isWaitingList && <span className="bg-amber-100 text-amber-600 text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Đăng ký chờ</span>}</h3></div>
                        <div className="flex flex-col gap-4 md:h-full md:min-h-0">
                            {isStaff && (
                            <div ref={searchRef} className={`p-4 rounded-[24px] bg-white border shadow-sm relative flex flex-col shrink-0 ${selectedUser ? 'border-indigo-200' : 'border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold flex items-center gap-2 text-indigo-600">
                                        <UserSearch size={14} /> Đặt hộ cho thành viên
                                    </h4>
                                    {selectedUser && <button onClick={() => { setSelectedUser(null); setSearchQuery(''); }} className="text-[9px] font-bold text-rose-500 hover:underline">Đặt cho tôi</button>}
                                </div>
                                
                                {selectedUser ? (
                                    <div className="p-2 bg-indigo-50 rounded-xl flex items-center justify-between border border-indigo-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{selectedUser.full_name.charAt(0)}</div>
                                            <span className="text-xs font-bold text-slate-800">{selectedUser.full_name}</span>
                                        </div>
                                        <button onClick={() => { setSelectedUser(null); setSearchQuery(''); }} className="p-1 rounded-full hover:bg-white"><X size={14} className="text-slate-400" /></button>
                                    </div>
                                ) : (
                                    <>
                                    <div className="relative">
                                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm theo Tên hoặc SĐT..." className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"/>
                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2">{isSearching ? <Loader2 size={12} className="animate-spin text-slate-400" /> : <Search size={12} className="text-slate-400" />}</div>
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
                                        {searchResults.map(user => (
                                            <button key={user.id} onClick={() => { setSelectedUser(user); setSearchResults([]); setSearchQuery(''); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-bold">{user.full_name.charAt(0)}</div>
                                                <div>
                                                    <div>{user.full_name}</div>
                                                    <div className="text-[9px] text-slate-400 font-medium">{user.phone}</div>
                                                </div>
                                            </button>
                                        ))}
                                        </div>
                                    )}
                                    </>
                                )}
                            </div>
                            )}

                            <div className={`p-5 rounded-[24px] bg-white border border-slate-100 shadow-sm relative flex flex-col md:flex-1`}><h4 className={`text-xs font-bold mb-3 flex items-center gap-2 ${rightTheme.textMain} shrink-0`}><Navigation size={14} /> {isRequest ? 'Lộ trình của khách' : 'Chi tiết điểm đón & trả'}</h4><div className="relative pl-3 flex-1 flex flex-col justify-center"><div className="absolute left-[15px] top-3 bottom-12 w-0.5 border-l-2 border-dashed border-slate-300/60"></div><div className="relative mb-5 group" ref={pickupRef}><div className={`absolute left-0 top-2.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${rightTheme.dot}`}></div><div className="pl-7 space-y-2"><label className="text-xs font-bold text-slate-800 block">Điểm đón mong muốn</label><div className="relative"><input type="text" value={pickupLocation} onChange={(e) => { setPickupLocation(e.target.value); setShowPickupSuggestions(true); }} onFocus={() => setShowPickupSuggestions(true)} placeholder="Tìm địa điểm..." className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none ${rightTheme.focusBorder} ${rightTheme.ring} focus:ring-4 transition-all shadow-sm focus:bg-white`}/>{showPickupSuggestions && pickupSuggestions.length > 0 && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">{pickupSuggestions.map((s, idx) => (<button key={idx} onClick={() => { setPickupLocation(s); setShowPickupSuggestions(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0">{s}</button>))}</div>)}</div><div className="relative mt-2"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400"><Info size={14} /></div><input type="text" value={pickupDetail} onChange={(e) => setPickupDetail(e.target.value)} placeholder="VD: Đón ở cổng sau, số nhà 123..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all shadow-sm"/></div></div></div><div className="relative group" ref={dropoffRef}><div className={`absolute left-0 top-2.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${rightTheme.dot}`}></div><div className="pl-7 space-y-2"><label className="text-xs font-bold text-slate-800 block">Điểm trả mong muốn</label><div className="relative"><input type="text" value={dropoffLocation} onChange={(e) => { setDropoffLocation(e.target.value); setShowDropoffSuggestions(true); }} onFocus={() => setShowDropoffSuggestions(true)} placeholder="Tìm địa điểm..." className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none ${rightTheme.focusBorder} ${rightTheme.ring} focus:ring-4 transition-all shadow-sm focus:bg-white`}/>{showDropoffSuggestions && dropoffSuggestions.length > 0 && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">{dropoffSuggestions.map((s, idx) => (<button key={idx} onClick={() => { setDropoffLocation(s); setShowDropoffSuggestions(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0">{s}</button>))}</div>)}</div><div className="relative mt-2"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400"><Info size={14} /></div><input type="text" value={dropoffDetail} onChange={(e) => setDropoffDetail(e.target.value)} placeholder="VD: Trả ở ngã tư, đối diện..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all shadow-sm"/></div></div></div></div></div>
                            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4 md:h-[230px] shrink-0 flex flex-col justify-center"><div className="flex gap-3 h-[60px]"><div className="flex-1 min-w-0"><label className={`text-xs font-bold text-slate-800 mb-1.5 ml-1 flex items-center gap-1.5`}><Phone size={10} className={rightTheme.textMain} /> Số điện thoại</label><input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="09..." className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl ${rightTheme.focusBorder} ${rightTheme.ring} focus:ring-4 outline-none font-bold text-slate-700 text-xs transition-all h-[38px] focus:bg-white`}/></div><div className="w-[55px] shrink-0" ref={seatPickerRef}><label className={`text-xs font-bold text-slate-800 mb-1.5 ml-1 flex items-center gap-1.5`}><Ticket size={10} className={rightTheme.textMain} /> Vé</label><div className="relative h-[38px]">{!isRequest ? (<><button type="button" onClick={() => setShowSeatPicker(!showSeatPicker)} className={`w-full h-full flex items-center justify-center gap-1 bg-slate-50 border border-slate-200 rounded-xl ${rightTheme.focusBorder} ${rightTheme.ring} focus:ring-4 outline-none font-bold text-slate-700 text-xs transition-all active:scale-95 focus:bg-white`}>{seats <= 6 && <div className={`w-1.5 h-1.5 rounded-full ${getSeatColor(seats)}`}></div>}<span>{seats}</span><ChevronDown size={10} className="text-slate-400" /></button>{showSeatPicker && (<div className="absolute top-full left-0 mt-1 w-[140px] bg-white border border-slate-100 rounded-xl shadow-xl z-50 p-2 grid grid-cols-3 gap-1 animate-in fade-in zoom-in-95 duration-200 -translate-x-[40px]">{[1, 2, 3, 4, 5, 6].map((s) => (<button key={s} onClick={() => { setSeats(s); setShowSeatPicker(false); }} className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all relative ${seats === s ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'hover:bg-slate-50 text-slate-600'}`}>{s <= 6 && <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${getSeatColor(s)}`}></div>}{s}</button>))}</div>)}</>) : (<div className="w-full h-full flex items-center justify-center gap-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed">{trip.seats === 7 ? 'Bao xe' : `${trip.seats}`}</div>)}</div></div>{!isRequest && (<div className="w-[105px] shrink-0"><label className={`text-xs font-bold text-slate-800 mb-1.5 ml-1 flex items-center gap-1.5`}><Wallet size={10} className={rightTheme.textMain} /> Thành tiền</label><div className={`w-full h-[38px] px-2 rounded-xl border flex flex-col items-center justify-center ${rightTheme.bgBadge} ${rightTheme.borderBadge}`}><div className="flex items-center gap-1">{discountAmount > 0 && <span className="text-[9px] text-slate-400 line-through decoration-slate-400">{new Intl.NumberFormat('vi-VN').format(originalPrice)}</span>}<span className={`text-xs font-black ${rightTheme.textBadge} truncate`}>{new Intl.NumberFormat('vi-VN').format(finalPrice)}đ</span></div></div></div>)}</div>{!isRequest && discountAmount > 0 && (<div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100"><tierConfig.icon size={12} className={tierConfig.color} /><span className="text-[10px] font-bold text-slate-700">{discountLabel}: <span className="text-emerald-600">-{new Intl.NumberFormat('vi-VN').format(discountAmount)}đ</span></span></div>)}<div><label className={`text-xs font-bold text-slate-800 mb-1.5 ml-1 flex items-center gap-1.5`}><MessageSquare size={10} className={rightTheme.textMain} /> Lời nhắn</label><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={isRequest ? "VD: Tôi sẽ đón bạn đúng giờ, xe sạch sẽ..." : "VD: Có hành lý, đón ở ngõ..."} rows={2} className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl ${rightTheme.focusBorder} ${rightTheme.ring} focus:ring-4 outline-none font-medium text-xs text-slate-700 transition-all resize-none focus:bg-white`}/></div></div>
                        </div>
                        {error && (<div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold animate-in slide-in-from-top-1"><AlertCircle size={14} /> {error}</div>)}
                    </div>
                </div>
            </div>
            <div className="w-full bg-white border-t border-slate-100 p-4 md:p-5 flex justify-center items-center rounded-b-[32px] shrink-0 relative z-20"><button onClick={handleSubmit} disabled={isSubmitting} className={`w-full md:w-auto md:min-w-[280px] px-8 py-3.5 rounded-full text-white font-bold text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] transform hover:-translate-y-0.5 ${rightTheme.button}`}>{isSubmitting ? 'Đang xử lý...' : (<>{isRequest ? <Zap size={18} /> : <CreditCard size={18} />}{isWaitingList ? 'Đăng ký chờ' : (isRequest ? 'Nhận chuyến ngay' : 'Xác nhận đặt')}</>)}</button></div>
        </div>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 md:-top-4 md:-right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[210] border-2 border-white"
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default BookingModal;