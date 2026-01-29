
export type UserRole = 'admin' | 'manager' | 'driver' | 'user';
export type MembershipTier = 'standard' | 'silver' | 'gold' | 'diamond' | 'family';

export interface Profile {
  id: string;
  email?: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  user_code?: string;
  membership_tier?: MembershipTier;
  is_discount_provider?: boolean;
}

export enum TripStatus {
  PREPARING = 'PREPARING',
  URGENT = 'URGENT',
  FULL = 'FULL',
  ON_TRIP = 'ON_TRIP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Location {
  name: string;
  description?: string;
  mapsUrl?: string;
}

export interface Trip {
  id: string;
  driver_id: string;
  driver_name?: string;
  driver_phone?: string;
  origin_name: string;
  origin_desc?: string;
  dest_name: string;
  dest_desc?: string;
  departure_time: string;
  arrival_time?: string;
  created_at?: string;
  price: number;
  seats: number;
  available_seats: number;
  vehicle_info: string;
  status: TripStatus;
  trip_code?: string;
  is_request?: boolean;
  bookings_count?: number;
  is_discount_provider?: boolean;
}

export interface Booking {
  id: string;
  trip_id: string;
  passenger_id: string;
  passenger_phone: string;
  seats_booked: number;
  total_price: number;
  status: 'PENDING' | 'CONFIRMED' | 'PICKED_UP' | 'ON_BOARD' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  trip_details?: Trip;
  booking_code?: string;
  note?: string;
}

export type NotificationCategory = 'TRIP' | 'ORDER' | 'SYSTEM';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  category: NotificationCategory;
  timestamp: string;
  read: boolean;
  metadata?: any; // Lưu trữ trip_id, booking_id để điều hướng nếu cần
}
