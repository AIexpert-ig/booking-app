import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export interface Dress {
  id: string;
  name: string;
  description?: string;
  category: string;
  basePrice: number;
  cleaningBufferDays: number;
  image_url?: string;
  createdAt?: Timestamp;
}

export interface InventoryItem {
  id: string;
  dressId: string;
  size: string;
  color?: string;
  sku?: string;
  notes?: string;
  status: 'available' | 'maintenance' | 'retired';
}

export interface Reservation {
  id: string;
  itemId: string;
  dressId: string;
  customer_name: string;
  customerEmail: string;
  startDate: Timestamp;
  endDate: Timestamp;
  bufferEndDate: Timestamp;
  totalPrice: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  createdAt?: Timestamp;
}

export interface BookingWithDress extends Reservation {
  dress?: Dress;
}

export interface MaintenanceLog {
  id: string;
  itemId: string;
  cost: number;
  description: string;
  date: Timestamp;
}

export interface IncomeData {
  revenue: number;
  maintenanceCosts: number;
  fixedCosts: number;
  grossProfit: number;
  netProfit: number;
  bookingCount: number;
}
