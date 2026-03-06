# FaB-O2O Database Spec V1 (MongoDB) — Food Delivery + Dine-in QR + Promotions + AI (LEAN)

> Scope V1: **Food Delivery + Driver giao đồ ăn + Dine-in QR (optional) + Promotions/Vouchers + AI tracking**
> ✅ **CẮT TOÀN BỘ Ride-hailing**
> ✅ **Merchant chỉ 1 chi nhánh (merchant = branch)**
> ✅ **Không phân role staff trong merchant (owner đăng ký là bán luôn)**

## 0) Global Conventions

- Database: **MongoDB**
- Naming: `snake_case` cho collections & fields
- Soft delete: `deleted_at: Date | null`
- Audit timestamps: `created_at`, `updated_at`
- GeoJSON: `{ type: "Point", coordinates: [lng, lat] }`
- Index:
  - unique + `sparse: true` cho field optional
  - `2dsphere` cho location
- References:
  - dùng `ObjectId` ref collection tương ứng

---

## 1) USERS & AUTHENTICATION (giữ, chỉ chỉnh role)

### 1.1 `users`

> Role tinh gọn: `"customer" | "driver" | "merchant" | "admin"`

```js
{
  _id: ObjectId,

  phone: String,                 // unique (recommended)
  email: String,                 // unique, sparse
  password_hash: String,         // optional (portal)
  auth_methods: [String],      // ["otp","password","google",...]

  oauth_providers: [
    { provider: String, provider_id: String, email: String }
  ],

  full_name: String,
  avatar_url: String,
  date_of_birth: Date,
  gender: String,              // "male"|"female"|"other"

  role: String,                // "customer"|"driver"|"merchant"|"admin"
  status: String,              // "active"|"inactive"|"blocked"|"pending"

  language: String,            // "vi"|"en"
  notification_enabled: Boolean,

  created_at: Date,
  updated_at: Date,
  deleted_at: Date | null
}
```

### 1.2 `user_devices`

```js
{
  _id: ObjectId,
  user_id: ObjectId,

  device_id: String,           // unique per user
  platform: String,            // "ios"|"android"|"web"
  app_version: String,

  fcm_token: String,          // unique sparse
  is_active: Boolean,

  last_seen_at: Date,
  created_at: Date,
  updated_at: Date
}
```

### 1.3 `customer_profiles`

```js
{
  _id: ObjectId,
  user_id: ObjectId, // unique ref users

  current_location: {
    type: "Point",
    coordinates: [Number, Number],
    address: String,
    updated_at: Date
  },

  saved_addresses: [
    {
      _id: ObjectId,
      label: String,
      address: String,
      location: { type: "Point", coordinates: [Number, Number] },

      address_details: {
        street_number: String,
        street: String,
        ward: String,
        district: String,
        city: String,
        country: String
      },

      address_source: String,     // "gps"|"search"|"map_pick"
      delivery_note: String,
      receiver_name: String,
      receiver_phone: String,

      is_default: Boolean,
      created_at: Date,
      updated_at: Date
    }
  ],

  total_orders: Number,
  total_spent: Number,

  created_at: Date,
  updated_at: Date
}
```

### 1.4 `driver_profiles` (food-only)

```js
{
  _id: ObjectId,
  user_id: ObjectId, // unique ref users

  // KYC/Verification (tuỳ bật/tắt)
  id_card_number: String,
  id_card_front_url: String,
  id_card_back_url: String,

  license_number: String,
  license_type: String,         // "A1"|"A2"|"B1"|"B2"
  license_image_url: String,
  license_expiry: Date,

  vehicle_brand: String,
  vehicle_model: String,
  vehicle_plate: String,
  vehicle_image_url: String,

  verification_status: String, // "pending"|"approved"|"rejected"
  verification_note: String,
  verified_at: Date,
  verified_by: ObjectId,       // admin user_id

  
  accept_food_orders: Boolean,

  current_location: { type:"Point", coordinates:[Number, Number] },
  last_location_update: Date,

  // Stats
  total_deliveries: Number,
  total_earnings: Number,
  average_rating: Number,

  // Payout
  bank_name: String,
  bank_account_number: String,
  bank_account_name: String,

  created_at: Date,
  updated_at: Date
}
```

---

## 2) MERCHANT & MENU (LEAN — 1 merchant = 1 branch)

> **Không có brands, không có templates, không có overrides, không có staff roles.**
> Chủ quán đăng ký → tạo merchant record → chờ duyệt (hoặc auto-approve tuỳ policy).

### 2.1 Collection: `merchants`

```js
{
  _id: ObjectId,

  owner_user_id: ObjectId,         // ref users (role="merchant") — 1 owner quản lý 1 merchant

  name: String,
  description: String,

  phone: String,
  email: String,

  category: String,               // "restaurant"|"coffee"|... (StoreCategory)
  logo_url: String,
  cover_image_url: String,

  address: String,
  location: { type:"Point", coordinates:[Number, Number] },

  // Operating hours
  business_hours: [
    { day: Number, open_time: String, close_time: String, is_closed: Boolean }
  ],

  // Order settings
  is_accepting_orders: Boolean,
  min_order_amount: Number,
  average_prep_time_min: Number,
  delivery_radius_km: Number,

  // Approval / Moderation
  approval_status: String,        // "draft"|"pending_approval"|"approved"|"rejected"|"suspended"
  approved_at: Date,
  approved_by: ObjectId,         // admin user_id
  rejection_reason: String,

  // Financial snapshot (platform-controlled)
  commission_rate: Number,        // % platform lấy (VD 0.2)
  tier: String,                  // "regular"|"preferred"|"premium" (optional — nếu chưa cần tier thì bỏ)

  // Documents
  documents: {
    business_license_url: String,
    id_card_front_url: String,
    id_card_back_url: String,
    store_front_image_url: String
  },

  // Stats cache
  total_orders: Number,
  average_rating: Number,
  total_reviews: Number,

  created_at: Date,
  updated_at: Date,
  deleted_at: Date | null
}
```

> **Ghi chú quan trọng (commission_rate & tier):**

- Mặc định bạn vẫn có thể lưu trong merchant để "snapshot runtime" (đỡ join system_configs).
- Nhưng quyền chỉnh **thuộc admin**. Merchant chỉ "xem".

### 2.2 Collection: `categories`

```js
{
  _id: ObjectId,
  merchant_id: ObjectId,

  name: String,
  description: String,
  image_url: String,

  sort_order: Number,
  is_active: Boolean,

  created_at: Date,
  updated_at: Date,
  deleted_at: Date | null
}
```

### 2.3 Collection: `products`

```js
{
  _id: ObjectId,

  merchant_id: ObjectId,
  category_id: ObjectId,

  name: String,
  description: String,
  image_urls: [String],

  base_price: Number,
  sale_price: Number,

  is_available: Boolean,
  is_active: Boolean,
  sort_order: Number,

  total_sold: Number,
  average_rating: Number,

  created_at: Date,
  updated_at: Date,
  deleted_at: Date | null
}
```

### 2.4 Collection: `product_options`

```js
{
  _id: ObjectId,
  product_id: ObjectId,

  name: String,                   // "Size", "Độ ngọt"
  type: String,                   // "single"|"multiple"
  is_required: Boolean,
  min_select: Number,
  max_select: Number,

  choices: [
    {
      _id: ObjectId,
      name: String,
      price_modifier: Number,
      is_default: Boolean,
      is_available: Boolean
    }
  ],

  sort_order: Number,

  created_at: Date,
  updated_at: Date,
  deleted_at: Date | null
}
```


---

## 3) TABLES (Dine-in QR) — optional

### 3.1 Collection: `tables`

```js
{
  _id: ObjectId,
  merchant_id: ObjectId,

  table_number: String,          // unique per merchant
  name: String,
  capacity: Number,

  qr_code_url: String,
  qr_content: String,

  status: String,                // "available"|"occupied"|"reserved"
  current_session_id: ObjectId,  // ref table_sessions

  is_active: Boolean,

  created_at: Date,
  updated_at: Date,
  deleted_at: Date
}
```

### 3.2 Collection: `table_sessions`

```js
{
  _id: ObjectId,
  table_id: ObjectId,
  merchant_id: ObjectId,

  customer_id: ObjectId,         // optional
  guest_name: String,            // optional

  status: String,                // "active"|"completed"|"cancelled"
  started_at: Date,
  ended_at: Date,

  total_amount: Number,

  created_at: Date,
  updated_at: Date
}
```

---

## 4) ORDERS — Food Delivery + Dine-in

### 4.1 Collection: `orders`

```js
{
  _id: ObjectId,
  order_number: String,             // unique: FO-YYYYMMDD-xxxxxx

  order_type: String,               // "delivery"|"dine_in"

  customer_id: ObjectId,
  merchant_id: ObjectId,
  driver_id: ObjectId,              // optional
  table_session_id: ObjectId,       // optional

  items: [
    {
      _id: ObjectId,
      product_id: ObjectId,
      product_name: String,
      product_image: String,
      quantity: Number,

      base_price: Number,
      unit_price: Number,

      selected_options: [
        { option_name:String, choice_name:String, price_modifier:Number }
      ],

      selected_toppings: [
        { topping_id:ObjectId, topping_name:String, price:Number }
      ],

      note: String,
      item_total: Number
    }
  ],

  delivery_address: {
    address: String,
    location: { type:"Point", coordinates:[Number, Number] },
    receiver_name: String,
    receiver_phone: String,
    note: String
  },

  subtotal: Number,
  delivery_fee: Number,
  platform_fee: Number,

  discounts: {
    food_discount: Number,
    delivery_discount: Number,
    total_discount: Number
  },

  applied_vouchers: [
    { voucher_id:ObjectId, voucher_code:String, scope:String, sponsor:String, discount_amount:Number }
  ],

  total_amount: Number,

  payment_method: String,           // "vnpay"|"momo"|"zalopay"|"cash"
  payment_status: String,           // "pending"|"paid"|"failed"|"refunded"
  paid_at: Date,

  status: String,
  status_history: [
    { status:String, changed_at:Date, changed_by:ObjectId, note:String }
  ],

  estimated_prep_time: Number,
  estimated_delivery_time: Date,

  is_rated: Boolean,

  cancelled_by: String,             // "customer"|"merchant"|"driver"|"system"
  cancel_reason: String,

  driver_assigned_at: Date,
  driver_accept_deadline_at: Date,
  assignment_attempts: Number,

  settlement: {
    merchant_gross: Number,
    merchant_commission_rate: Number,
    merchant_commission_amount: Number,
    merchant_net: Number,

    driver_gross: Number,
    driver_commission_rate: Number,
    driver_commission_amount: Number,
    driver_net: Number,

    platform_fee: Number,
    platform_revenue: Number,
    sponsor_cost: Number
  },

  created_at: Date,
  updated_at: Date
}
```

**Order Status (Delivery):**
| Status | Mô tả |
|--------|-------|
| `pending` | Chờ merchant xác nhận |
| `confirmed` | Merchant đã xác nhận |
| `preparing` | Đang chuẩn bị món |
| `ready_for_pickup` | Sẵn sàng, chờ tài xế |
| `driver_assigned` | Đã có tài xế nhận |
| `driver_arrived` | Tài xế đến quán |
| `picked_up` | Tài xế đã lấy hàng |
| `delivering` | Đang giao |
| `delivered` | Đã giao |
| `completed` | Hoàn thành |
| `cancelled` | Đã hủy |

**Order Status (Dine-in):**
| Status | Mô tả |
|--------|-------|
| `pending` | Chờ xác nhận |
| `confirmed` | Đã xác nhận |
| `preparing` | Đang làm |
| `served` | Đã phục vụ |
| `completed` | Hoàn thành |
| `cancelled` | Đã hủy |



---
feed_impressions (MVP)
{
  _id: ObjectId,

  user_id: ObjectId,               // ai thấy
  request_id: String,              // 1 lần gọi /feed/home
  session_id: String,              // optional (1 phiên app)
  
  section: String,                 // "food_for_you" | "people_love" | "restaurants_you_may_like"
  item_type: String,               // "merchant" | "product"
  item_id: ObjectId,               // merchant_id hoặc product_id
  position: Number,                // index trong section (0..)
  
  shown_at: Date,                  // thời điểm show
  geo_cell: String,                // optional (nếu bạn dùng cell)
  distance_km: Number,             // optional
  score: Number,                   // optional (heuristic score)
  model_version: String,           // "heuristic_v1"
  
  created_at: Date
}
## 5) PAYMENTS & WALLET (LEAN — không ride)

### 5.1 Collection: `payments`

```js
{
  _id: ObjectId,

  order_id: ObjectId,               // payment cho order
  user_id: ObjectId,                // ai trả (customer)

  payment_method: String,           // "vnpay"|"momo"|"zalopay"|"cash"
  amount: Number,
  currency: String,                 // "VND"

  idempotency_key: String,          // unique

  gateway_transaction_id: String,
  gateway_response: Object,

  status: String,                   // "pending"|"processing"|"success"|"failed"|"refunded"

  refund_amount: Number,
  refund_reason: String,
  refunded_at: Date,

  created_at: Date,
  updated_at: Date,
  completed_at: Date
}

---

## 6) PROMOTIONS & VOUCHERS

### 6.1 Collection: `banners`

```js
{
  _id: ObjectId,

  title: String,
  subtitle: String,
  image_url: String,
  image_url_mobile: String,

  action_type: String,              // "open_promotion"|"open_merchant"|"open_product"|"open_category"|"open_url"|"none"
  action_data: {
    promotion_id: ObjectId,
    merchant_id: ObjectId,
    product_id: ObjectId,
    category_id: ObjectId,
    url: String,
    deep_link: String
  },

  display_position: String,         // "home_carousel"|"home_middle"|"home_bottom"|"category_top"|"popup"|"splash"

  target_audience: String,          // "all"|"new_user"|"inactive_user"|"logged_in"|"guest"
  target_platforms: [String],
  geo_fence: [String],

  start_date: Date,
  end_date: Date,
  time_slots: [ { start: String, end: String } ],

  popup_settings: {
    show_once_per_day: Boolean,
    show_on_first_open: Boolean,
    delay_seconds: Number,
    dismissible: Boolean
  },

  sort_order: Number,
  is_active: Boolean,

  stats: {
    impressions: Number,
    clicks: Number,
    ctr: Number
  },

  created_by: ObjectId,
  created_at: Date,
  updated_at: Date,
  deleted_at: Date
}
```

### 6.2 Collection: `promotions`

```js
{
  _id: ObjectId,

  created_by_type: String,      // "platform"|"merchant"
  merchant_id: ObjectId,        // optional

  name: String,
  description: String,
  banner_image_url: String,

  scope: String,                // "food"|"delivery"|"dine_in"
  type: String,                 // "percentage"|"fixed_amount"|"free_shipping"
  discount_value: Number,
  max_discount: Number,
  min_order_amount: Number,

  campaign_type: String,        // "normal"|"flash_sale"|"daily_deal"|"weekend_deal"|"monthly_event"
  flash_sale_settings: {
    countdown_enabled: Boolean,
    show_remaining_qty: Boolean,
    quantity_per_time_slot: [ { start_time:String, end_time:String, quantity:Number } ],
    total_quantity: Number,
    remaining_quantity: Number,
    claimed_quantity: Number
  },

  conditions: {
    valid_from: Date,
    valid_to: Date,
    time_slots: [ { start:String, end:String } ],
    applicable_days: [Number],
    geo_fence: [String],
    service_type: String,
    applicable_merchants: [ObjectId],
    user_segment: String
  },

  total_usage_limit: Number,
  per_user_limit: Number,
  current_usage: Number,

  is_active: Boolean,
  is_featured: Boolean,
  show_as_popup: Boolean,

  created_at: Date,
  updated_at: Date
}
```

### 6.3 Collection: `vouchers`

```js
{
  _id: ObjectId,
  promotion_id: ObjectId,

  code: String,                 // unique
  discount_value: Number,
  max_discount: Number,
  min_order_amount: Number,

  usage_limit: Number,
  current_usage: Number,

  assigned_to_user: ObjectId,   // optional (voucher cá nhân)

  is_active: Boolean,
  start_date: Date,
  end_date: Date,

  created_at: Date,
  updated_at: Date
}
```

### 6.4 Collection: `voucher_usages`

```js
{
  _id: ObjectId,

  voucher_id: ObjectId,
  user_id: ObjectId,
  order_id: ObjectId,

  scope: String,            // "food"|"delivery"|"dine_in"
  sponsor: String,          // "platform"|"merchant"
  discount_applied: Number,

  created_at: Date
}
```

---

## 7) REVIEWS

```js
{
  _id: ObjectId,

  review_type: String,      // "order"|"merchant"|"driver"
  user_id: ObjectId,

  order_id: ObjectId,
  merchant_id: ObjectId,
  driver_id: ObjectId,

  rating: Number,
  comment: String,
  images: [String],
  tags: [String],

  reply: { content:String, replied_at:Date, replied_by:ObjectId },

  is_visible: Boolean,

  created_at: Date,
  updated_at: Date
}
```

---

## 8) SYSTEM & CONFIGURATION

### 8.1 Collection: `system_configs`

```js
{
  _id: ObjectId,
  key: String,
  value: Mixed,
  description: String,

  updated_by: ObjectId,
  updated_at: Date
}
```


---

## 9) AI & RECOMMENDATIONS

### 9.1 Collection: `user_interactions`

```js
{
  _id: ObjectId,
  user_id: ObjectId,

  action: String,           // "view"|"add_to_cart"|"order"|"rate"
  weight: Number,

  merchant_id: ObjectId,
  product_id: ObjectId,

  source: String,          // "search"|"home"|"recommendation"
  search_query: String,
  rating: Number,

  created_at: Date
}
```

### 9.2 Collection: `search_logs`

```js
{
  _id: ObjectId,
  user_id: ObjectId,

  search_query: String,
  geo_cell: String,
  timestamp: Date,

  num_results: Number,
  clicked_result_id: ObjectId,
  clicked_position: Number,

  filters_applied: {
    rating_gte: Number,
    distance_lte_km: Number,
    price_range: { min:Number, max:Number }
  },

  source: String,

  created_at: Date
}
```

<!-- ### 9.3 Collection: `merchant_metrics_daily`

```js
{
  _id: ObjectId,
  merchant_id: ObjectId,
  date: Date,

  total_orders: Number,
  acceptance_rate: Number,
  cancellation_rate: Number,
  avg_prep_time: Number,
  avg_rating: Number,

  created_at: Date
}
``` -->

### 9.4 Collection: `recommendations`

```js
{
  _id: ObjectId,
  user_id: ObjectId,

  type: String,            // "products"|"merchants"
  items: [ { item_id:ObjectId, score:Number, reason:String } ],

  generated_at: Date,
  expires_at: Date
}
```

### 9.5 Collection: `carts`

```js
{
  _id: ObjectId,

  user_id: ObjectId,
  merchant_id: ObjectId,

  status: String,                      // "active"|"checked_out"|"abandoned"
  source: String,                      // "home"|"search"|"merchant_detail"

  order_type: String,                  // "delivery"|"dine_in"
  table_id: ObjectId,
  table_session_id: ObjectId,

  delivery_address_snapshot: {
    address_id: ObjectId,
    address: String,
    location: { type:"Point", coordinates:[Number, Number] },
    receiver_name: String,
    receiver_phone: String,
    note: String
  },

  items: [
    {
      _id: ObjectId,
      product_id: ObjectId,
      quantity: Number,

      product_name: String,
      product_image: String,
      base_price: Number,
      sale_price: Number,

      selected_options: [
        { option_id:ObjectId, option_name:String, choice_id:ObjectId, choice_name:String, price_modifier:Number }
      ],

      selected_toppings: [
        { topping_id:ObjectId, topping_name:String, price:Number }
      ],

      note: String,
      item_total_estimated: Number,

      created_at: Date,
      updated_at: Date
    }
  ],

  pricing_estimate: {
    subtotal: Number,
    delivery_fee: Number,
    platform_fee: Number,
    discount_estimated: Number,
    total_estimated: Number
  },

  selected_vouchers: [
    { voucher_id:ObjectId, voucher_code:String, scope:String, sponsor:String }
  ],

  expires_at: Date,
  last_active_at: Date,

  created_at: Date,
  updated_at: Date,
  deleted_at: Date
}
```

---

## 10) NOTIFICATIONS

```js
{
  _id: ObjectId,
  user_id: ObjectId,

  type: String,             // "order_update"|"promotion"|"system"
  title: String,
  body: String,

  data: { action:String, order_id:ObjectId, promotion_id:ObjectId },

  is_read: Boolean,
  read_at: Date,

  created_at: Date
}
```

---

## 11) INDEXES ĐỀ XUẤT (LEAN)

```js
// USERS
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.users.createIndex({ role: 1, status: 1 });

// USER DEVICES
db.user_devices.createIndex({ user_id: 1, device_id: 1 }, { unique: true });
db.user_devices.createIndex({ fcm_token: 1 }, { unique: true, sparse: true });
db.user_devices.createIndex({ user_id: 1, is_active: 1 });

// CUSTOMER PROFILES
db.customer_profiles.createIndex({ user_id: 1 }, { unique: true });
db.customer_profiles.createIndex({ current_location: "2dsphere" });

// DRIVER PROFILES (food-only)
db.driver_profiles.createIndex({ user_id: 1 }, { unique: true });
db.driver_profiles.createIndex({ current_location: "2dsphere" });
db.driver_profiles.createIndex({ is_online: 1, accept_food_orders: 1 });

// MERCHANTS (1 branch)
db.merchants.createIndex({ owner_user_id: 1 }, { unique: true }); // 1 owner = 1 merchant
db.merchants.createIndex({ location: "2dsphere" });
db.merchants.createIndex({ approval_status: 1, is_accepting_orders: 1 });
db.merchants.createIndex({ deleted_at: 1 });

// CATEGORIES / PRODUCTS / OPTIONS / TOPPINGS
db.categories.createIndex({ merchant_id: 1, is_active: 1 });
db.products.createIndex({ merchant_id: 1, is_active: 1 });
db.products.createIndex({ category_id: 1, is_active: 1 });
db.product_options.createIndex({ product_id: 1, deleted_at: 1 });
db.toppings.createIndex({ merchant_id: 1, is_available: 1 });

// TABLES / SESSIONS
db.tables.createIndex({ merchant_id: 1, table_number: 1 }, { unique: true });
db.table_sessions.createIndex({ merchant_id: 1, started_at: -1 });

// ORDERS
db.orders.createIndex({ order_number: 1 }, { unique: true });
db.orders.createIndex({ customer_id: 1, created_at: -1 });
db.orders.createIndex({ merchant_id: 1, status: 1, created_at: -1 });
db.orders.createIndex({ driver_id: 1, status: 1, created_at: -1 });

// ORDER BATCHES (optional)
db.order_batches.createIndex({ driver_id: 1, status: 1, created_at: -1 });

// PAYMENTS
db.payments.createIndex({ order_id: 1, created_at: -1 });
db.payments.createIndex({ idempotency_key: 1 }, { unique: true });

// REVIEWS (tuỳ review_type)
db.reviews.createIndex({ review_type: 1, order_id: 1, user_id: 1 }, { unique: true, sparse: true });
db.reviews.createIndex({ review_type: 1, merchant_id: 1, user_id: 1 }, { unique: true, sparse: true });
db.reviews.createIndex({ review_type: 1, driver_id: 1, user_id: 1 }, { unique: true, sparse: true });

// VOUCHERS / USAGES
db.vouchers.createIndex({ code: 1 }, { unique: true });
db.vouchers.createIndex({ promotion_id: 1 });
db.voucher_usages.createIndex({ user_id: 1, voucher_id: 1, created_at: -1 });

// BANNERS
db.banners.createIndex({ display_position: 1, is_active: 1, sort_order: 1 });
db.banners.createIndex({ start_date: 1, end_date: 1, is_active: 1 });
db.banners.createIndex({ target_audience: 1, is_active: 1 });

// AI LOGS
db.user_interactions.createIndex({ user_id: 1, created_at: -1 });
db.user_interactions.createIndex({ product_id: 1, action: 1 });
db.search_logs.createIndex({ search_query: 1, created_at: -1 });
db.search_logs.createIndex({ geo_cell: 1, created_at: -1 });

// METRICS
db.merchant_metrics_daily.createIndex({ merchant_id: 1, date: -1 }, { unique: true });
db.recommendations.createIndex({ user_id: 1, expires_at: 1 });

// CARTS
db.carts.createIndex({ user_id: 1, merchant_id: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "active" } });
db.carts.createIndex({ user_id: 1, updated_at: -1 });
db.carts.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

// NOTIFICATIONS
db.notifications.createIndex({ user_id: 1, created_at: -1 });
db.notifications.createIndex({ user_id: 1, is_read: 1, created_at: -1 });
```

---

## Ghi chú cuối để tránh "lệch logic" trong code

1. Nếu bạn giữ `commission_rate` và `tier` trong `merchants`:
   - Admin set trong admin portal
   - Khi order settle thì snapshot vào `orders.settlement.merchant_commission_rate`

2. Nếu bạn muốn "đăng ký là bán luôn" theo nghĩa **auto approved**:
   - `approval_status` có thể set mặc định `"approved"`
   - hoặc `"pending_approval"` nhưng dashboard vẫn cho vào (tuỳ UX của bạn)

---

