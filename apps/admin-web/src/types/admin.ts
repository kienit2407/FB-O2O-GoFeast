// Admin Portal Types for FaB-O2O Super App

export type AdminRole = 'SUPER_ADMIN' | 'OPS_ADMIN' | 'FINANCE_ADMIN';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'blocked';
export type MerchantTier = 'regular' | 'preferred' | 'premium';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  tier: MerchantTier;
  status: MerchantStatus;
  branchesCount: number;
  rating: number;
  totalOrders: number;
  acceptanceRate: number;
  cancellationRate: number;
  avgPrepTime: number;
  logo?: string;
  coverImage?: string;
  documents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  merchantId: string;
  name: string;
  address: string;
  isActive: boolean;
  acceptingOrders: boolean;
}

export type DriverStatus = 'pending' | 'approved' | 'rejected' | 'blocked';
export type VehicleType = 'motorbike' | 'car' | 'bicycle';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: VehicleType;
  vehicleBrand: string;
  vehiclePlate: string;
  status: DriverStatus;
  completedTrips: number;
  cancellationRate: number;
  rating: number;
  area: string;
  lastActiveAt: Date;
  documents: {
    idCard: string;
    drivingLicense: string;
    vehiclePhoto: string;
  };
  createdAt: Date;
}

export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalOrders: number;
  cancellations: number;
  lastActiveAt: Date;
  status: 'active' | 'blocked';
  createdAt: Date;
}

export type OrderType = 'food' | 'ride' | 'dine-in';
export type FoodOrderStatus = 'pending' | 'accepted' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
export type RideStatus = 'searching' | 'on_trip' | 'completed' | 'cancelled';
export type DineInStatus = 'placed' | 'preparing' | 'served' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  type: OrderType;
  status: FoodOrderStatus | RideStatus | DineInStatus;
  customerId: string;
  customerName: string;
  customerPhone: string;
  merchantId?: string;
  merchantName?: string;
  driverId?: string;
  driverName?: string;
  items?: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  platformSubsidy: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'wallet';
  address?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  timeline: OrderTimeline[];
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderTimeline {
  status: string;
  timestamp: Date;
  note?: string;
}

export type VoucherType = 'delivery' | 'food' | 'special';
export type DiscountType = 'percentage' | 'fixed' | 'freeship';

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description: string;
  type: VoucherType;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount: number;
  usageLimitPerUser: number;
  totalUsageLimit: number;
  usedCount: number;
  validFrom: Date;
  validTo: Date;
  serviceType: 'delivery' | 'dine-in' | 'ride' | 'all';
  applicableMerchants: 'all' | string[];
  userSegment: 'new' | 'all' | 'inactive';
  status: 'active' | 'inactive' | 'expired';
  createdAt: Date;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  deeplink: string;
  placement: 'home_slider' | 'section_banner';
  validFrom: Date;
  validTo: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface Popup {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  ctaText: string;
  ctaLink: string;
  targetSegment: 'all' | 'new' | 'inactive';
  frequencyCap: number;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'flash_sale';
  discountValue: number;
  totalQuantity: number;
  remainingQuantity: number;
  quantityPerUser: number;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'active' | 'ended';
  createdAt: Date;
}

export interface Brand {
  id: string;
  name: string;
  ownerEmail: string;
  branchesCount: number;
  totalGMV: number;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface SystemConfig {
  deliveryFee: {
    baseFee: number;
    feePerKm: number;
    maxRadius: number;
  };
  commission: {
    merchantDefault: number;
    driverDefault: number;
  };
}

export interface Category {
  id: string;
  nameVi: string;
  nameEn: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  entityType: string;
  entityId: string;
  diff?: Record<string, unknown>;
  ip: string;
  createdAt: Date;
}

export interface SystemEvent {
  id: string;
  type: 'payment' | 'map' | 'kafka' | 'db' | 'system';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface DashboardMetrics {
  totalOrdersToday: number;
  gmvToday: number;
  activeUsers: number;
  activeDrivers: number;
  cancellationRate: number;
  acceptanceRate: number;
  ordersPerHour: { hour: string; orders: number }[];
}
