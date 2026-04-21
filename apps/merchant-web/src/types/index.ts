// User & Auth Types
export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  role: UserRole;
  avatar?: string;
  avatar_url?: string;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  status?: string;
  phone?: string;
}

// Merchant & Branch Types
export type BranchStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED';

export interface Merchant {
  id: string;
  name: string;
  description: string;
  cuisineType: string;
  logo?: string;
  hotline: string;
  email: string;
  status: BranchStatus;
}

export interface OperatingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface Branch {
  id: string;
  merchantId: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  status: BranchStatus;
  rejectionReason?: string;
  isAcceptingOrders: boolean;
  isOpen?: boolean;
  operatingHours: OperatingHours[];
  prepTime: number; // minutes
  deliveryRadius: number; // km
  documents: {
    businessLicense?: string;
    storeFrontImage?: string;
  };
  createdAt: string;
}

// Menu Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: Option[];
  //NEW (optional)
  productId?: string;
  minSelect?: number;
  maxSelect?: number;
  order?: number;
}

export interface Option {
  id: string;
  name: string;
  priceAdjustment: number;
  //NEW (optional để không phá code cũ)
  isDefault?: boolean;
  isAvailable?: boolean;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  order?: number;
  isAvailable: boolean;
  imageUrl?: string | null;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  order?: number;
  salePrice?: number;   //sale price (0/undefined = không giảm)
  //add
  totalSold?: number;
  averageRating?: number;
  images?: string[]; //thêm
  optionGroups: OptionGroup[];
  toppings: string[]; // topping IDs
  isAvailable: boolean;
  isActive: boolean;
}

// Order Types
export type OrderType = 'DELIVERY' | 'DINE_IN';
export type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  selectedOptions: { groupName: string; optionName: string; priceAdjustment: number }[];
  selectedToppings: { name: string; price: number }[];
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  type: OrderType;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  tableNumber?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  voucherCode?: string;
  total: number;
  note?: string;
  createdAt: string;
  confirmedAt?: string;
  preparedAt?: string;
  completedAt?: string;
  cancelReason?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    status: 'ASSIGNED' | 'PICKING_UP' | 'ARRIVED' | 'DELIVERING' | 'DELIVERED';
  };
}

// Voucher Types
export type VoucherType = 'ITEM_PERCENT' | 'ITEM_AMOUNT' | 'BUY1GET1' | 'ORDER_PERCENT' | 'ORDER_AMOUNT';
export type ServiceType = 'ALL' | 'DELIVERY' | 'DINE_IN';
export type TimeSlot = 'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'LATE_NIGHT';

export interface Voucher {
  id: string;
  code: string;
  name: string;
  type: VoucherType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderValue?: number;
  validFrom: string;
  validTo: string;
  usageLimitPerUser: number;
  totalUsageLimit: number;
  currentUsage: number;
  timeSlots: TimeSlot[];
  applicableDays: string[];
  serviceType: ServiceType;
  isActive: boolean;
}

// Report Types
export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface BestSeller {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface Review {
  id: string;
  orderId: string;
  customerName: string;
  rating: number;
  comment: string;
  reply?: string;
  createdAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  target: string;
  details: string;
  createdAt: string;
}
