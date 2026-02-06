import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Calendar, Users, Car, CheckCircle2, Navigation, Clock, Repeat, ChevronDown, Banknote, Loader2, AlertTriangle, Info, ArrowRight, DollarSign, Check, Map as MapIcon, Timer, PlusCircle, ToggleLeft, ToggleRight, Sparkles, UserSearch, X, ListChecks, Save } from 'lucide-react';
import { getRouteDetails } from '../services/geminiService.ts';
import { LOCAL_LOCATIONS } from '../services/locationData.ts';
import CustomDatePicker from './CustomDatePicker.tsx';
import CustomTimePicker from './CustomTimePicker.tsx';
import { getVehicleConfig, UnifiedDropdown } from './SearchTrips.tsx'; 
import { supabase } from '../lib/supabase.ts';
import { Profile, Trip } from '../types.ts';

interface Vehicle {
  id: string;
  vehicle_type: string;
  license_plate: string;
  year_of_manufacture?: number;
  last_inspection_date?: string;
  image_url?: string;
}

interface PostTripProps {
  onPost: (trips: any[], forUserId?: string) => void;
  onUpdate?: (tripId: string, data: any) => void;
  profile: Profile | null;
  onManageVehicles: () => void;
  initialMode?: 'DRIVER' | 'PASSENGER';
  isOpen: boolean; 
  onClose: () => void; 
  editingTrip?: Trip | null;
}

const DAYS_OF_WEEK = [
  { label: 'T2', value: 1 }, { label: 'T3', value: 2 }, { label: 'T4', value: 3 },
  { label: 'T5', value: 4 }, { label: 'T6', value: 5 }, { label: 'T7', value: 6 }, { label: 'CN', value: 0 },
];

const getTomorrowFormatted = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const d = String(tomorrow.getDate()).padStart(2, '0');
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const y = String(tomorrow.getFullYear()).slice(-2); // Lấy 2 số cuối
  return `${d}-${m}-${y}`;
};

const priceSuggestions = [
  { label: '100K', value: 100000 },
  { label: '150K', value: 150000 },
  { label: '200K', value: 200000 },
  { label: '250K', value: 250000 },
  { label: '300K', value: 300000 },
];

const searchLocalPlaces = async (query: string) => {
  if (!query || query.length < 1) return [];
  const normalizedQuery = query.toLowerCase().trim();
  const matches = LOCAL_LOCATIONS.filter(loc => 
    loc.name.toLowerCase().includes(normalizedQuery) || 
    loc.shortName.toLowerCase().includes(normalizedQuery)
  );
  return matches.slice(0, 6).map(item => {
    let displayName = item.name.replace(/^Thị trấn\s/, '').replace(/^Huyện\s/, '');
    return {
      name: displayName,
      shortName: item.shortName,
      uri: `https://www.google.com/maps/search/${encodeURIComponent(item.name)}`
    };
  });
};

const PostTrip: React.FC<PostTripProps> = ({ onPost, onUpdate, profile, onManageVehicles, initialMode = 'DRIVER', isOpen, onClose, editingTrip }) => {
  const [postMode, setPostMode] = useState<'DRIVER' | 'PASSENGER'>(initialMode);

  useEffect(() => {
    if (isOpen) {
        if (editingTrip) {
            setPostMode(editingTrip.is_request ? 'PASSENGER' : 'DRIVER');
        } else {
            setPostMode(initialMode);
        }
    }
  }, [initialMode, isOpen, editingTrip]);

  const [origin, setOrigin] = useState('');
  const [originDetail, setOriginDetail] = useState('');
  const [destination, setDestination] = useState('');
  const [destDetail, setDestDetail] = useState('');
  const [originUri, setOriginUri] = useState('');
  const [destUri, setDestUri] = useState('');
  
  const [date, setDate] = useState(getTomorrowFormatted());
  const [time, setTime] = useState('08:00');
  const [arrivalTime, setArrivalTime] = useState('10:00');
  const [seats, setSeats] = useState(1); 
  const [price, setPrice] = useState('150000'); 
  const [loading, setLoading] = useState(false);
  const [analyzingRoute, setAnalyzingRoute] = useState(false);
  const [routeData, setRouteData] = useState<{ distance: string; duration: string; durationInMinutes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isNegotiable, setIsNegotiable] = useState(false);

  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  const [showSeatsPicker, setShowSeats] = useState(false);
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  
  const [originSuggestions, setOriginSuggestions] = useState<{name: string, uri: string}[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<{name: string, uri: string}[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]); // Changed to any to support joined vehicles
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const isStaff = profile?.role === 'admin' || profile?.role === 'manager';
  
  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const arrivalTimePickerRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);
  const vehiclePickerRef = useRef<HTMLDivElement>(null);
  const seatsPickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (editingTrip) {
        setOrigin(editingTrip.origin_name);
        setDestination(editingTrip.dest_name);
        setPrice(editingTrip.price.toString());
        setSeats(editingTrip.seats);
        setOriginDetail(editingTrip.origin_desc || '');
        setDestDetail(editingTrip.dest_desc || '');
        
        const dep = new Date(editingTrip.departure_time);
        const d = String(dep.getDate()).padStart(2, '0');
        const m = String(dep.getMonth() + 1).padStart(2, '0');
        const y = String(dep.getFullYear()).slice(-2); // 2-digit year
        setDate(`${d}-${m}-${y}`);
        setTime(`${String(dep.getHours()).padStart(2, '0')}:${String(dep.getMinutes()).padStart(2, '0')}`);
        
        if (editingTrip.arrival_time) {
            const arr = new Date(editingTrip.arrival_time);
            setArrivalTime(`${String(arr.getHours()).padStart(2, '0')}:${String(arr.getMinutes()).padStart(2, '0')}`);
        }

        if (editingTrip.price === 0 && editingTrip.is_request) {
            setIsNegotiable(true);
        } else {
            setIsNegotiable(false);
        }
        
        // Cannot edit recurring or vehicle details easily from here for now without complex logic
        setIsRecurring(false);
        
    } else {
        // Reset defaults for new post
        if (postMode === 'DRIVER') {
           setSeats(4);
           if (price === '0') setPrice('150000');
           setIsNegotiable(false);
        } else {
           setSeats(1);
           setPrice('0'); 
           setIsNegotiable(true);
        }
        setSelectedUser(null);
        setSearchQuery('');
    }
  }, [postMode, editingTrip, isOpen]);

  const fetchUserVehicles = async () => {
    // Priority: If selectedUser already has vehicles loaded from search/cache, use them
    if (selectedUser && (selectedUser as any).vehicles) {
        const preloadedVehicles = (selectedUser as any).vehicles;
        setUserVehicles(preloadedVehicles);
        if (preloadedVehicles.length > 0) {
             // Only reset/default selection if we don't have a valid selection for this user
             setSelectedVehicleId(preloadedVehicles[0].id);
        } else {
             setSelectedVehicleId('');
        }
        return;
    }

    const userIdToFetch = selectedUser?.id || profile?.id;
    if (!userIdToFetch) return;

    const { data, error } = await supabase.from('vehicles').select('*').eq('user_id', userIdToFetch);
    if (data) {
      setUserVehicles(data);
      
      // Auto-select vehicle if editing
      if (editingTrip && editingTrip.vehicle_info) {
          const parts = editingTrip.vehicle_info.split('(');
          if (parts.length > 1) {
              const plate = parts[1].replace(')', '').trim();
              const matched = data.find(v => v.license_plate === plate);
              if (matched) {
                  setSelectedVehicleId(matched.id);
                  return;
              }
          }
      }
      
      // Default selection
      setSelectedVehicleId(data.length > 0 ? data[0].id : '');
    } else {
      setUserVehicles([]);
      setSelectedVehicleId('');
    }
  };

  useEffect(() => { fetchUserVehicles(); }, [profile, selectedUser, isOpen, editingTrip]);
  
  const formatNumber = (num: string) => {
    if (!num) return "";
    const value = num.replace(/\D/g, "");
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
        // 1. Tìm các user_id có xe khớp biển số trước
        const { data: vehicles } = await supabase
            .from('vehicles')
            .select('user_id')
            .ilike('license_plate', `%${searchQuery}%`);
        
        const vehicleUserIds = vehicles?.map(v => v.user_id) || [];
        
        // 2. Tạo điều kiện tìm kiếm: Tên OR SĐT OR (ID nằm trong danh sách biển số khớp)
        let orCondition = `full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`;
        if (vehicleUserIds.length > 0) {
            orCondition += `,id.in.(${vehicleUserIds.join(',')})`;
        }

        let query = supabase
            .from('profiles')
            .select('*, vehicles(*)') // Fetch ALL vehicle info to avoid RLS issues later
            .or(orCondition);

        if (postMode === 'DRIVER') {
            query = query.eq('role', 'driver');
        }
        const { data, error } = await query.limit(5);
        if (error) console.error(error);
        else setSearchResults(data || []);
        setIsSearching(false);
    }, 500);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, postMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle closing main modal if clicking outside
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          // Optional: You can uncomment this to enable click-outside-to-close
          // onClose(); 
      }

      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) setShowDatePicker(false);
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) setShowTimePicker(false);
      if (arrivalTimePickerRef.current && !arrivalTimePickerRef.current.contains(event.target as Node)) setShowArrivalTimePicker(false);
      if (vehiclePickerRef.current && !vehiclePickerRef.current.contains(event.target as Node)) setShowVehiclePicker(false);
      if (seatsPickerRef.current && !seatsPickerRef.current.contains(event.target as Node)) setShowSeats(false);
      if (originRef.current && !originRef.current.contains(event.target as Node)) setOriginSuggestions([]);
      if (destRef.current && !destRef.current.contains(event.target as Node)) setDestSuggestions([]);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchResults([]);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    const search = async () => {
      if (origin.length >= 1 && !originUri) setOriginSuggestions(await searchLocalPlaces(origin));
      else setOriginSuggestions([]);
    };
    search();
  }, [origin, originUri]);

  useEffect(() => {
    const search = async () => {
      if (destination.length >= 1 && !destUri) setDestSuggestions(await searchLocalPlaces(destination));
      else setDestSuggestions([]);
    };
    search();
  }, [destination, destUri]);
  
  useEffect(() => {
    const analyze = async () => {
      if (originUri && destUri && origin && destination && !editingTrip) {
        setAnalyzingRoute(true);
        setRouteData(null);
        try {
          const data = await getRouteDetails(origin, destination);
          if (data) setRouteData(data);
        } catch (e) {
          console.error(e);
        } finally {
          setAnalyzingRoute(false);
        }
      }
    };
    analyze();
  }, [originUri, destUri, origin, destination, editingTrip]);

  // Handle automatic arrival time calculation
  useEffect(() => {
    const [h, m] = time.split(':').map(Number);
    const depDate = new Date();
    depDate.setHours(h, m, 0, 0);

    let durationMs = 2 * 60 * 60 * 1000; // Default 2h

    if (routeData?.durationInMinutes) {
        durationMs = routeData.durationInMinutes * 60 * 1000;
    } else if (editingTrip) {
        // Calculate original duration to preserve spacing when shifting time
        const origDep = new Date(editingTrip.departure_time);
        const origArr = editingTrip.arrival_time ? new Date(editingTrip.arrival_time) : new Date(origDep.getTime() + durationMs);
        durationMs = origArr.getTime() - origDep.getTime();
    }

    const arrDate = new Date(depDate.getTime() + durationMs);
    setArrivalTime(`${String(arrDate.getHours()).padStart(2, '0')}:${String(arrDate.getMinutes()).padStart(2, '0')}`);
  }, [time, routeData, editingTrip]); // Trigger on Time Change, Route Data Change, or Editing Trip Load

  const toggleDay = (day: number) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const authorProfile = selectedUser || profile;
    if (!authorProfile) return;

    const selectedVehicle = userVehicles.find(v => v.id === selectedVehicleId);
    const rawPrice = price.replace(/\D/g, "");
    
    if (!origin || !destination || (!isRecurring && !date) || (isRecurring && selectedDays.length === 0)) {
      setError("Vui lòng điền đầy đủ thông tin lộ trình và thời gian.");
      return;
    }

    if (postMode === 'DRIVER' && rawPrice === '') {
        setError("Vui lòng nhập giá vé.");
        return;
    }
    
    if (postMode === 'DRIVER' && !selectedVehicle) {
        setError(selectedUser ? `Tài xế '${selectedUser.full_name}' chưa có phương tiện nào.` : "Vui lòng chọn phương tiện của bạn.");
        return;
    }

    if (postMode === 'DRIVER' && parseInt(rawPrice) <= 0) {
      setError("Giá vé phải lớn hơn 0.");
      return;
    }

    if (postMode === 'PASSENGER' && !isNegotiable && (rawPrice === '' || parseInt(rawPrice) <= 0)) {
        setError("Vui lòng nhập mức giá mong muốn hoặc bật chế độ 'Thoả thuận'.");
        return;
    }

    // Determine Departure/Arrival Times
    let tripsToCreate: any[] = [];
    
    if (editingTrip) {
       // UPDATE MODE: Only update current trip
       const [d, m, y] = date.split('-').map(Number);
       // Handle 2-digit year
       const fullYear = y < 100 ? 2000 + y : y;
       const departure = new Date(fullYear, m - 1, d);
       const [h, min] = time.split(':').map(Number);
       departure.setHours(h, min, 0, 0);
       
       const arrival = new Date(fullYear, m - 1, d);
       const [ah, amin] = arrivalTime.split(':').map(Number);
       arrival.setHours(ah, amin, 0, 0);
       if (arrival < departure) arrival.setDate(arrival.getDate() + 1);
       
       tripsToCreate.push({ departureTime: departure.toISOString(), arrivalTime: arrival.toISOString() });
    } else if (isRecurring) {
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + i);
        if (selectedDays.includes(nextDay.getDay())) {
          const [h, m] = time.split(':');
          nextDay.setHours(parseInt(h), parseInt(m), 0, 0);
          const [ah, am] = arrivalTime.split(':');
          const nextArrDay = new Date(nextDay);
          nextArrDay.setHours(parseInt(ah), parseInt(am), 0, 0);
          if (nextArrDay < nextDay) nextArrDay.setDate(nextArrDay.getDate() + 1);
          tripsToCreate.push({ departureTime: nextDay.toISOString(), arrivalTime: nextArrDay.toISOString() });
        }
      }
    } else {
      const [d, m, y] = date.split('-').map(Number);
      // Handle 2-digit year
      const fullYear = y < 100 ? 2000 + y : y;
      const departure = new Date(fullYear, m - 1, d);
      const [h, min] = time.split(':').map(Number);
      departure.setHours(h, min, 0, 0);
      
      if (departure < new Date() && !isStaff && !editingTrip) {
        setError("Không thể đặt chuyến trong quá khứ. Vui lòng chọn ngày giờ trong tương lai.");
        return;
      }
      
      const arrival = new Date(fullYear, m - 1, d);
      const [ah, amin] = arrivalTime.split(':').map(Number);
      arrival.setHours(ah, amin, 0, 0);
      if (arrival < departure) arrival.setDate(arrival.getDate() + 1);
      tripsToCreate.push({ departureTime: departure.toISOString(), arrivalTime: arrival.toISOString() });
    }
    
    setLoading(true);
    
    const finalPrice = isNegotiable ? 0 : (parseInt(rawPrice) || 0);

    const tripBase = {
      origin: { name: origin, description: originDetail, mapsUrl: originUri },
      destination: { name: destination, description: destDetail, mapsUrl: destUri },
      price: finalPrice, 
      seats: seats,
      availableSeats: editingTrip ? (editingTrip.available_seats - (editingTrip.seats - seats)) : seats, // Complex logic if reducing seats, simplistic here: reset to seats if new
      vehicleInfo: postMode === 'DRIVER' ? `${selectedVehicle?.vehicle_type} (${selectedVehicle?.license_plate})` : 'Cần tìm xe',
      isRecurring: isRecurring,
      recurringDays: selectedDays,
      isRequest: postMode === 'PASSENGER' 
    };

    try {
      if (editingTrip && onUpdate) {
          const updatePayload = {
              origin_name: tripBase.origin.name,
              origin_desc: tripBase.origin.description,
              dest_name: tripBase.destination.name,
              dest_desc: tripBase.destination.description,
              departure_time: tripsToCreate[0].departureTime,
              arrival_time: tripsToCreate[0].arrivalTime,
              price: tripBase.price,
              seats: tripBase.seats,
              vehicle_info: tripBase.vehicleInfo,
              // Note: available_seats logic handled in App.tsx typically to verify bookings
          };
          await onUpdate(editingTrip.id, updatePayload);
      } else {
          await onPost(tripsToCreate.map(t => ({ ...tripBase, departureTime: t.departureTime, arrivalTime: t.arrivalTime })), selectedUser?.id);
      }
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra khi lưu.");
    } finally {
      setLoading(false);
    }
  };
  
  const mapUrl = origin && destination 
    ? `https://maps.google.com/maps?q=${encodeURIComponent(origin)}+to+${encodeURIComponent(destination)}&output=embed`
    : origin 
      ? `https://maps.google.com/maps?q=${encodeURIComponent(origin)}&output=embed`
      : `https://maps.google.com/maps?q=Hanoi,Vietnam&output=embed`;

  const getSeatDotColor = (s: number) => {
    if (s <= 2) return 'bg-emerald-500';
    if (s <= 5) return 'bg-amber-500';
    if (s > 6) return 'bg-purple-500';
    return 'bg-rose-500';
  };

  const selectedVehicle = userVehicles.find(v => v.id === selectedVehicleId);
  const selectedVehicleConfig = getVehicleConfig(selectedVehicle?.vehicle_type || '');
  const SIcon = selectedVehicleConfig.icon;

  const isBaoXe = seats === 7;
  const minDate = new Date();
  minDate.setHours(0,0,0,0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-[calc(100%-24px)] md:w-full max-w-4xl h-[90vh] md:h-[85vh] mx-3 md:mx-0 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div ref={modalRef} className="bg-white w-full h-full rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
            {/* Header - Centered Pill */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-center bg-white shrink-0 z-20">
                <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
                    <button 
                    disabled={!!editingTrip}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${postMode === 'DRIVER' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`} 
                    onClick={() => setPostMode('DRIVER')}
                    >
                    <Car size={14} /> {editingTrip ? 'Chuyến xe' : 'Có xe trống'}
                    </button>
                    <button 
                    disabled={!!editingTrip}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${postMode === 'PASSENGER' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`} 
                    onClick={() => setPostMode('PASSENGER')}
                    >
                    <CheckCircle2 size={14} /> {editingTrip ? 'Yêu cầu' : 'Cần tìm xe'}
                    </button>
                </div>
            </div>

            {/* Scrollable Content - Reduced Padding */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 bg-slate-50">
                
                {isStaff && !editingTrip && (
                    <div ref={searchRef} className={`mb-4 p-3 rounded-[24px] bg-white border shadow-sm relative flex flex-col shrink-0 ${selectedUser ? 'border-indigo-200' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold flex items-center gap-2 text-indigo-600">
                            <UserSearch size={14} /> {postMode === 'DRIVER' ? 'Đăng chuyến hộ tài xế' : 'Đăng yêu cầu hộ hành khách'}
                        </h4>
                        {selectedUser && <button type="button" onClick={() => { setSelectedUser(null); setSearchQuery(''); }} className="text-[9px] font-bold text-rose-500 hover:underline">Đăng cho tôi</button>}
                    </div>
                    
                    {selectedUser ? (
                        <div className="p-2 bg-indigo-50 rounded-xl flex items-center justify-between border border-indigo-100">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{selectedUser.full_name.charAt(0)}</div>
                                <div>
                                    <span className="text-xs font-bold text-slate-800">{selectedUser.full_name}</span>
                                    {/* Hiển thị biển số xe nếu có */}
                                    {(selectedUser as any).vehicles && (selectedUser as any).vehicles.length > 0 && (
                                        <span className="text-[9px] text-slate-500 block">
                                            {(selectedUser as any).vehicles.map((v:any) => v.license_plate).join(', ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button type="button" onClick={() => { setSelectedUser(null); setSearchQuery(''); }} className="p-1 rounded-full hover:bg-white"><X size={14} className="text-slate-400" /></button>
                        </div>
                    ) : (
                        <>
                        <div className="relative">
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={postMode === 'DRIVER' ? 'Tìm tài xế theo Tên/SĐT/Biển số...' : 'Tìm hành khách theo Tên/SĐT...'} className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"/>
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2">{isSearching ? <Loader2 size={12} className="animate-spin text-slate-400" /> : <UserSearch size={12} className="text-slate-400" />}</div>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
                            {searchResults.map(user => (
                                <button key={user.id} type="button" onClick={() => { setSelectedUser(user); setSearchResults([]); setSearchQuery(''); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-bold">{user.full_name.charAt(0)}</div>
                                    <div>
                                        <div>{user.full_name} <span className="text-[9px] text-slate-400">({user.role})</span></div>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] text-slate-400 font-medium">{user.phone}</span>
                                            {user.vehicles && user.vehicles.length > 0 && (
                                                <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-500 border border-slate-200">
                                                    {user.vehicles[0].license_plate}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                            </div>
                        )}
                        </>
                    )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={`rounded-[32px] border border-white/50 shadow-sm ${postMode === 'PASSENGER' ? 'bg-gradient-to-br from-orange-50 to-white' : 'bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-blue-50/50'}`}>
                    {error && (
                    <div className="mx-4 mt-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 shadow-sm animate-in slide-in-from-top-2">
                        <AlertTriangle size={18} className="shrink-0" />
                        <p className="text-xs font-bold">{error}</p>
                    </div>
                    )}

                    <div className="p-4 md:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    
                    {/* Left Column: Route & Map */}
                    <div className="space-y-3">
                        <h3 className={`text-sm font-bold flex items-center gap-2 font-outfit tracking-tight ${postMode === 'PASSENGER' ? 'text-orange-700' : 'text-slate-700'}`}>
                        <Navigation size={16} className={postMode === 'PASSENGER' ? 'text-orange-600' : 'text-indigo-600'} /> 1. Lộ trình {postMode === 'PASSENGER' ? 'bạn đi' : ''}
                        </h3>
                        
                        <div className={`p-3 md:p-4 rounded-[24px] border shadow-sm space-y-2 relative ${postMode === 'PASSENGER' ? 'bg-white border-slate-100' : 'bg-white/80 border-white'}`}>
                        <div className={`absolute left-[23px] top-9 bottom-9 w-1 rounded-full ${postMode === 'PASSENGER' ? 'bg-gradient-to-b from-orange-200 to-rose-200' : 'bg-gradient-to-b from-blue-200 to-emerald-200'}`}></div>
                        
                        {/* Origin Input */}
                        <div className="relative" ref={originRef}>
                            <div className="flex gap-3">
                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${
                                originUri 
                                ? (postMode === 'PASSENGER' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 animate-pulse-orange' : 'bg-blue-600 text-white shadow-lg shadow-blue-200 animate-pulse-blue')
                                : (postMode === 'PASSENGER' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100')
                            }`}>
                                <Navigation size={14} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 block tracking-wider">Điểm đón</label>
                                <input type="text" value={origin} onChange={(e) => { setOrigin(e.target.value); setOriginUri(''); setError(null); setRouteData(null); }} placeholder="Tìm địa chỉ đón..." required className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-bold text-xs text-slate-800 placeholder:text-slate-400 ${postMode === 'PASSENGER' ? 'focus:ring-2 focus:ring-orange-500' : 'focus:ring-2 focus:ring-emerald-500'}`} />
                                <input type="text" value={originDetail} onChange={(e) => setOriginDetail(e.target.value)} placeholder="Số nhà, ngõ ngách..." className="w-full px-3 py-1.5 bg-white border border-slate-100 rounded-lg outline-none text-[11px] italic text-slate-600 font-medium" />
                            </div>
                            </div>
                            {originSuggestions.length > 0 && (
                            <div className="absolute top-full left-11 right-0 z-50 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden mt-1">
                                {originSuggestions.map((s, idx) => (
                                <button key={idx} type="button" onClick={() => { setOrigin(s.name); setOriginUri(s.uri); setOriginSuggestions([]); }} className={`w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0 ${postMode === 'PASSENGER' ? 'hover:bg-orange-50' : 'hover:bg-emerald-50'}`}>{s.name}</button>
                                ))}
                            </div>
                            )}
                        </div>

                        {/* Destination Input */}
                        <div className="relative" ref={destRef}>
                            <div className="flex gap-3">
                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${
                                destUri 
                                ? (postMode === 'PASSENGER' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 animate-pulse-rose' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 animate-pulse-emerald')
                                : (postMode === 'PASSENGER' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100')
                            }`}>
                                <MapPin size={14} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 block tracking-wider">Điểm trả</label>
                                <input type="text" value={destination} onChange={(e) => { setDestination(e.target.value); setDestUri(''); setError(null); setRouteData(null); }} placeholder="Tìm địa chỉ trả..." required className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-bold text-xs text-slate-800 placeholder:text-slate-400 ${postMode === 'PASSENGER' ? 'focus:ring-2 focus:ring-orange-500' : 'focus:ring-2 focus:ring-emerald-500'}`} />
                                <input type="text" value={destDetail} onChange={(e) => setDestDetail(e.target.value)} placeholder="Ghi chú điểm trả..." className="w-full px-3 py-1.5 bg-white border border-slate-100 rounded-lg outline-none text-[11px] italic text-slate-600 font-medium" />
                            </div>
                            </div>
                            {destSuggestions.length > 0 && (
                            <div className="absolute top-full left-11 right-0 z-50 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden mt-1">
                                {destSuggestions.map((s, idx) => (
                                <button key={idx} type="button" onClick={() => { setDestination(s.name); setDestUri(s.uri); setDestSuggestions([]); }} className={`w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0 ${postMode === 'PASSENGER' ? 'hover:bg-orange-50' : 'hover:bg-emerald-50'}`}>{s.name}</button>
                                ))}
                            </div>
                            )}
                        </div>
                        </div>

                        {/* Map Preview & Stats */}
                        <div className={`p-3 md:p-4 rounded-[24px] border space-y-2 shadow-sm ${postMode === 'PASSENGER' ? 'bg-white border-slate-100' : 'bg-white/60 border-white/60'}`}>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${postMode === 'PASSENGER' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {analyzingRoute ? <Loader2 size={14} className="animate-spin" /> : <MapIcon size={14} />}
                                </div>
                                <div className="min-w-0">
                                <p className="text-[9px] font-bold text-slate-400">Quãng đường</p>
                                <p className="text-xs font-black text-slate-800 truncate h-4 flex items-center">{routeData?.distance || '---'}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${postMode === 'PASSENGER' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                {analyzingRoute ? <Loader2 size={14} className="animate-spin" /> : <Timer size={14} />}
                                </div>
                                <div className="min-w-0">
                                <p className="text-[9px] font-bold text-slate-400">Thời gian</p>
                                <p className="text-xs font-black text-slate-800 truncate h-4 flex items-center">{routeData?.duration || '---'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-32 rounded-[20px] overflow-hidden border border-slate-200 shadow-inner relative bg-slate-100">
                            <iframe width="100%" height="100%" frameBorder="0" src={mapUrl} className="grayscale-[0.1] contrast-[1.05]" />
                        </div>
                        </div>
                    </div>

                    {/* Right Column: Time, Cost & Vehicle */}
                    <div className="space-y-3">
                        <h3 className={`text-sm font-bold flex items-center gap-2 font-outfit tracking-tight ${postMode === 'PASSENGER' ? 'text-orange-700' : 'text-slate-700'}`}>
                        <Clock size={16} className={postMode === 'PASSENGER' ? 'text-orange-600' : 'text-indigo-600'} /> 2. Thời gian & chi phí
                        </h3>
                        
                        <div className={`p-3 md:p-4 rounded-[24px] border shadow-sm space-y-3 ${postMode === 'PASSENGER' ? 'bg-white border-slate-100' : 'bg-white/80 border-white'}`}>
                        {!editingTrip && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg shadow-sm ${postMode === 'PASSENGER' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}><Repeat size={14} /></div>
                                <span className="text-xs font-bold text-slate-700 font-outfit">Lịch đi định kỳ</span>
                                </div>
                                <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={`w-10 h-5 rounded-full transition-all relative ${isRecurring ? (postMode === 'PASSENGER' ? 'bg-orange-500 shadow-orange-200' : 'bg-emerald-600 shadow-emerald-100') + ' shadow-lg' : 'bg-slate-300'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isRecurring ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {!isRecurring ? (
                            <div className="flex gap-3">
                                <div className="flex-1 relative z-30" ref={datePickerRef}>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 block mb-1 tracking-wider">Ngày đi</label>
                                    <button type="button" onClick={() => setShowDatePicker(!showDatePicker)} className={`w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 shadow-sm transition-all h-[38px] ${postMode === 'PASSENGER' ? 'hover:border-orange-300' : 'hover:border-emerald-300'}`}>
                                    <span>{date}</span><Calendar size={14} className={postMode === 'PASSENGER' ? 'text-orange-500' : 'text-emerald-500'} />
                                    </button>
                                    {showDatePicker && (
                                        <div className="absolute top-full left-0 z-[60] mt-2">
                                            <CustomDatePicker selectedDate={date} onSelect={setDate} onClose={() => setShowDatePicker(false)} minDate={isStaff ? undefined : minDate} />
                                        </div>
                                    )}
                                </div>
                                <div className="w-[28%] relative z-30" ref={timePickerRef}>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 block mb-1 tracking-wider">Giờ đi</label>
                                    <button type="button" onClick={() => setShowTimePicker(!showTimePicker)} className={`w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 shadow-sm transition-all h-[38px] ${postMode === 'PASSENGER' ? 'hover:border-orange-300' : 'hover:border-emerald-300'}`}><span>{time}</span></button>
                                    {showTimePicker && (
                                        <div className={`absolute top-full z-[60] mt-2 ${postMode === 'DRIVER' ? 'left-1/2 -translate-x-1/2' : 'right-0'}`}>
                                            <CustomTimePicker selectedTime={time} onSelect={setTime} onClose={() => setShowTimePicker(false)} />
                                        </div>
                                    )}
                                </div>
                                {postMode === 'DRIVER' && (
                                <div className="w-[28%] relative z-30" ref={arrivalTimePickerRef}>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 block mb-1 tracking-wider">Đến</label>
                                    <button type="button" onClick={() => setShowArrivalTimePicker(!showArrivalTimePicker)} className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 shadow-sm transition-all hover:bg-white h-[38px]"><span>{arrivalTime}</span></button>
                                    {showArrivalTimePicker && (
                                        <div className="absolute top-full right-0 z-[60] mt-2">
                                            <CustomTimePicker selectedTime={arrivalTime} onSelect={setArrivalTime} onClose={() => setShowArrivalTimePicker(false)} />
                                        </div>
                                    )}
                                </div>
                                )}
                            </div>
                            ) : (
                            <>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 block mb-1 tracking-wider">Lặp lại vào</label>
                                    <div className="grid grid-cols-7 gap-1">
                                    {DAYS_OF_WEEK.map(day => (
                                        <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${selectedDays.includes(day.value) ? (postMode === 'PASSENGER' ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-100' : 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>{day.label}</button>
                                    ))}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1 relative z-30" ref={timePickerRef}>
                                        <label className="text-[10px] font-bold text-slate-400 ml-1 block mb-1 tracking-wider">Giờ đi</label>
                                        <button type="button" onClick={() => setShowTimePicker(!showTimePicker)} className={`w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 shadow-sm transition-all h-[38px] ${postMode === 'PASSENGER' ? 'hover:border-orange-300' : 'hover:border-emerald-300'}`}><span>{time}</span><Clock size={14} className={postMode === 'PASSENGER' ? 'text-orange-500' : 'text-emerald-500'} /></button>
                                        {showTimePicker && (
                                            <div className="absolute top-full left-0 z-[60] mt-2">
                                                <CustomTimePicker selectedTime={time} onSelect={setTime} onClose={() => setShowTimePicker(false)} />
                                            </div>
                                        )}
                                    </div>
                                    {postMode === 'DRIVER' && (
                                    <div className="flex-1 relative z-30" ref={arrivalTimePickerRef}>
                                        <label className="text-[10px] font-bold text-slate-400 ml-1 block mb-1 tracking-wider">Dự kiến đến</label>
                                        <button type="button" onClick={() => setShowArrivalTimePicker(!showArrivalTimePicker)} className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 shadow-sm transition-all hover:bg-white h-[38px]"><span>{arrivalTime}</span><Clock size={14} className="text-slate-400" /></button>
                                        {showArrivalTimePicker && (
                                            <div className="absolute top-full right-0 z-[60] mt-2">
                                                <CustomTimePicker selectedTime={arrivalTime} onSelect={setArrivalTime} onClose={() => setShowArrivalTimePicker(false)} />
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </div>
                            </>
                            )}
                        </div>
                        </div>

                        {/* Vehicle Selection (Only for Driver) */}
                        {postMode === 'DRIVER' && (
                        <div className="space-y-1" ref={vehiclePickerRef}>
                            <label className="text-[10px] font-bold text-slate-500 ml-1 block tracking-wider">Phương tiện</label>
                            <div className="relative flex items-center gap-2">
                                <button type="button" onClick={() => setShowVehiclePicker(!showVehiclePicker)} className="w-full flex items-center justify-between px-3 py-2 bg-white/80 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-900 transition-all hover:bg-white disabled:opacity-50 shadow-sm h-[38px]">
                                {selectedVehicle ? (
                                    <div className="flex items-center gap-2">
                                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${selectedVehicleConfig.style}`}>
                                        <SIcon size={10} />
                                        <span>{selectedVehicle.vehicle_type}</span>
                                    </div>
                                    <div className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-bold">
                                        {selectedVehicle.license_plate}
                                    </div>
                                    </div>
                                ) : (
                                    <span className="text-slate-400">{userVehicles.length > 0 ? "Chọn xe..." : (selectedUser ? `${selectedUser.full_name} chưa có xe` : "Chưa có xe nào")}</span>
                                )}
                                <ChevronDown size={12} className="text-slate-400" />
                                </button>
                                <button type="button" onClick={onManageVehicles} className="w-[38px] h-[38px] bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm flex items-center justify-center shrink-0">
                                <PlusCircle size={14}/>
                                </button>
                                {showVehiclePicker && (
                                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-100 rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-200">
                                    {userVehicles.length > 0 ? (
                                        userVehicles.map(v => {
                                        const config = getVehicleConfig(v.vehicle_type);
                                        const VIcon = config.icon;
                                        return (
                                            <button key={v.id} type="button" onClick={() => { setSelectedVehicleId(v.id); setShowVehiclePicker(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left ${selectedVehicleId === v.id ? 'bg-indigo-50/50' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${config.style}`}>
                                                <VIcon size={10} />
                                                <span>{v.vehicle_type}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500">{v.license_plate}</span>
                                            </div>
                                            {selectedVehicleId === v.id && <Check size={12} className="text-indigo-600" />}
                                            </button>
                                        );
                                        })
                                    ) : (
                                        <div className="p-2 text-center text-[10px] text-slate-400">Không có xe nào</div>
                                    )}
                                </div>
                                )}
                            </div>
                        </div>
                        )}
                        
                        {/* Seats */}
                        <div className={`space-y-1 ${postMode === 'PASSENGER' ? 'pt-0' : ''}`} ref={seatsPickerRef}>
                        <label className="text-[10px] font-bold text-slate-500 ml-1 block tracking-wider">
                            {postMode === 'DRIVER' ? 'Số ghế trống' : 'Số lượng người đi'}
                        </label>
                        <div className="relative">
                            <button type="button" onClick={() => setShowSeats(!showSeatsPicker)} className={`w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none hover:bg-white transition-all shadow-sm h-[38px] ${postMode === 'PASSENGER' ? 'bg-white' : 'bg-white/80'}`}>
                            <div className="flex items-center justify-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${getSeatDotColor(seats)}`}></div>
                                <span>{isBaoXe ? 'Bao xe' : `${seats} ${postMode === 'DRIVER' ? 'ghế' : 'người'}`}</span>
                            </div>
                            <ChevronDown size={12} className="text-slate-400" />
                            </button>
                            {showSeatsPicker && (
                            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-100 rounded-xl shadow-2xl p-1 grid grid-cols-4 gap-1 animate-in fade-in zoom-in-95 duration-200">
                                {[1, 2, 3, 4, 5, 6].map(s => (
                                    <button key={s} type="button" onClick={() => { setSeats(s); setShowSeats(false); }} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${seats === s ? (postMode === 'DRIVER' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100') : 'hover:bg-slate-50 text-slate-600'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full mb-1 ${getSeatDotColor(s)}`}></div>
                                    <span className="text-[10px] font-black">{s}</span>
                                    </button>
                                ))}
                                <button type="button" onClick={() => { setSeats(7); setShowSeats(false); }} className={`col-span-2 flex flex-col items-center justify-center p-2 rounded-lg transition-all ${seats === 7 ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'hover:bg-slate-50 text-slate-600'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full mb-1 bg-purple-500`}></div>
                                    <span className="text-[10px] font-black">Bao xe</span>
                                </button>
                            </div>
                            )}
                        </div>
                        </div>
                        
                        {/* Price with Toggle for Passenger */}
                        <div className="space-y-2 pt-0.5">
                        <div className="flex justify-between items-center h-5">
                            <label className="text-[10px] font-bold text-slate-500 ml-1 block tracking-wider">{postMode === 'DRIVER' ? 'Giá vé / ghế' : 'Ngân sách dự kiến'}</label>
                            {postMode === 'PASSENGER' ? (
                            <button 
                                type="button"
                                onClick={() => setIsNegotiable(!isNegotiable)}
                                className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/60 transition-all hover:bg-slate-200/50"
                            >
                                <span className={`text-[9px] font-bold ${isNegotiable ? 'text-orange-600' : 'text-slate-600'}`}>Giá thoả thuận</span>
                                {isNegotiable ? <ToggleRight size={18} className="text-orange-500 fill-orange-500/20" /> : <ToggleLeft size={18} className="text-slate-400" />}
                            </button>
                            ) : (
                            <div className="flex flex-wrap gap-1">
                                {priceSuggestions.map((suggestion) => (
                                <button key={suggestion.value} type="button" onClick={() => setPrice(suggestion.value.toString())} className={`px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-500 transition-colors whitespace-nowrap hover:bg-emerald-50 hover:text-emerald-600`}>{suggestion.label}</button>
                                ))}
                            </div>
                            )}
                        </div>
                        
                        <div className="relative group">
                            {postMode === 'PASSENGER' && isNegotiable ? (
                            <div className="w-full h-[48px] border-2 border-orange-100 rounded-[20px] bg-orange-50/50 flex items-center justify-center text-orange-600 font-bold text-sm shadow-sm">
                                Thoả thuận
                            </div>
                            ) : (
                            <>
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center ${postMode === 'PASSENGER' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                <DollarSign size={14} />
                                </div>
                                <input 
                                type="text" 
                                value={formatNumber(price)} 
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    setPrice(val === '' ? '0' : val);
                                }}
                                onFocus={() => {
                                    if(price === '0') setPrice('');
                                }}
                                onBlur={() => {
                                    if(price === '' || price === '0') setPrice('0');
                                }}
                                placeholder="0"
                                required 
                                className={`w-full pl-12 pr-10 py-2 border-2 rounded-[20px] text-xl font-black outline-none text-right shadow-sm transition-all h-[48px] ${postMode === 'PASSENGER' ? 'border-orange-100 text-orange-600 bg-orange-50/50 focus:border-orange-500 focus:bg-white' : 'border-emerald-100 text-emerald-600 bg-white/50 focus:border-emerald-500 focus:bg-white'}`} 
                                />
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 font-black text-sm ${postMode === 'PASSENGER' ? 'text-orange-500' : 'text-emerald-500'}`}>đ</span>
                            </>
                            )}
                        </div>
                        {/* Show price suggestions for Passenger only when NOT negotiable */}
                        {postMode === 'PASSENGER' && !isNegotiable && (
                            <div className="flex flex-wrap gap-1 justify-end mt-1">
                                {priceSuggestions.map((suggestion) => (
                                <button key={suggestion.value} type="button" onClick={() => setPrice(suggestion.value.toString())} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-500 transition-colors whitespace-nowrap hover:bg-orange-50 hover:text-orange-600">{suggestion.label}</button>
                                ))}
                            </div>
                        )}
                        </div>

                        <button type="submit" disabled={loading} className={`w-full h-[48px] text-white rounded-[20px] font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] font-outfit mt-1 ${postMode === 'PASSENGER' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>
                        {loading ? <Loader2 className="animate-spin" size={16} /> : (editingTrip ? <><Save size={16} strokeWidth={2.5} /> Lưu thay đổi</> : <><Send size={16} strokeWidth={2.5} /> {postMode === 'DRIVER' ? 'Đăng chuyến ngay' : 'Đăng nhu cầu ngay'}</>)}
                        </button>
                    </div>
                    </div>
                </form>
            </div>
        </div>
        <button 
          onClick={onClose} 
          className="absolute -top-4 -right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[210] border-2 border-white"
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default PostTrip;