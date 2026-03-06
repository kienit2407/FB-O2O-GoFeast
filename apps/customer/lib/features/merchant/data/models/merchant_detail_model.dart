// =====================
// Merchant Detail Models (NEW RESPONSE)
// =====================

class MerchantDetailResponse {
  final MerchantDetailMerchant merchant;
  final MerchantBusiness business;
  final MerchantViewer viewer;
  final MerchantBenefits benefits;
  final CartSummary? cartSummary;

  /// popular có thể không trả về => nullable hoặc list rỗng
  final List<MerchantDetailProductItem> popular;

  /// sections luôn có
  final List<MerchantDetailMenuSection> sections;

  const MerchantDetailResponse({
    required this.merchant,
    required this.business,
    required this.viewer,
    required this.benefits,
    required this.popular,
    required this.cartSummary,
    required this.sections,
  });

  factory MerchantDetailResponse.fromJson(Map<String, dynamic> j) {
    final cs = j['cart_summary'];
    return MerchantDetailResponse(
      merchant: MerchantDetailMerchant.fromJson(
        (j['merchant'] as Map? ?? const {}).cast<String, dynamic>(),
      ),
      business: MerchantBusiness.fromJson(
        (j['business'] as Map? ?? const {}).cast<String, dynamic>(),
      ),
      viewer: MerchantViewer.fromJson(
        (j['viewer'] as Map? ?? const {}).cast<String, dynamic>(),
      ),
      benefits: MerchantBenefits.fromJson(
        (j['benefits'] as Map? ?? const {}).cast<String, dynamic>(),
      ),

      popular: ((j['popular'] as List?) ?? const [])
          .whereType<Map>()
          .map(
            (e) =>
                MerchantDetailProductItem.fromJson(e.cast<String, dynamic>()),
          )
          .toList(),
      sections: ((j['sections'] as List?) ?? const [])
          .whereType<Map>()
          .map(
            (e) =>
                MerchantDetailMenuSection.fromJson(e.cast<String, dynamic>()),
          )
          .toList(),
      cartSummary: (cs is Map)
          ? CartSummary.fromJson(cs.cast<String, dynamic>())
          : null,
    );
  }
}

class MerchantDetailMerchant {
  final String id;
  final String name;
  final num rating; // merchant rating
  final num reviews; // merchant reviews count
  final bool isAcceptingOrders;
  final String address;
  final String category;
  final num distanceKm;
  final num deliveryRadiusKm;
  final bool canDeliver;
  final int etaMin;
  final String? logoUrl;
  final List<String> coverUrls;

  const MerchantDetailMerchant({
    required this.id,
    required this.address,
    required this.category,
    required this.name,
    required this.rating,
    required this.reviews,
    required this.isAcceptingOrders,
    required this.distanceKm,
    required this.deliveryRadiusKm,
    required this.canDeliver,
    required this.etaMin,
    required this.logoUrl,
    required this.coverUrls,
  });

  factory MerchantDetailMerchant.fromJson(Map<String, dynamic> j) {
    return MerchantDetailMerchant(
      id: (j['id'] ?? j['_id']).toString(),
      name: (j['name'] ?? '').toString(),
      rating: (j['rating'] as num?) ?? 0,
      reviews: (j['reviews'] as num?) ?? 0,
      isAcceptingOrders: j['is_accepting_orders'] == true,
      distanceKm: (j['distance_km'] as num?) ?? 0,
      deliveryRadiusKm: (j['delivery_radius_km'] as num?) ?? 0,
      canDeliver: j['can_deliver'] == true,
      etaMin: (j['eta_min'] as num?)?.toInt() ?? 0,
      logoUrl: j['logo_url']?.toString(),
      coverUrls: ((j['cover_urls'] as List?) ?? const [])
          .map((e) => e.toString())
          .where((s) => s.isNotEmpty)
          .toList(),
      address: (j['address'] ?? '').toString(),
      category: (j['category'] ?? '').toString(),
    );
  }
}

// =====================
// BUSINESS HOURS
// =====================

class MerchantBusiness {
  final String timezone;
  final MerchantBusinessNow now;
  final List<MerchantWeeklyHour> weeklyHours;

  const MerchantBusiness({
    required this.timezone,
    required this.now,
    required this.weeklyHours,
  });

  factory MerchantBusiness.fromJson(Map<String, dynamic> j) {
    return MerchantBusiness(
      timezone: (j['timezone'] ?? 'Asia/Ho_Chi_Minh').toString(),
      now: MerchantBusinessNow.fromJson(
        (j['now'] as Map? ?? const {}).cast<String, dynamic>(),
      ),
      weeklyHours: ((j['weekly_hours'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => MerchantWeeklyHour.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class MerchantBusinessNow {
  final bool isOpen;

  /// open | closing_soon | closed
  final String status;
  final int? closeInMin;
  final String? openTime;
  final String? closeTime;
  final int? day;

  const MerchantBusinessNow({
    required this.isOpen,
    required this.status,
    required this.closeInMin,
    required this.openTime,
    required this.closeTime,
    required this.day,
  });

  factory MerchantBusinessNow.fromJson(Map<String, dynamic> j) {
    return MerchantBusinessNow(
      isOpen: j['is_open'] == true,
      status: (j['status'] ?? 'closed').toString(),
      closeInMin: (j['close_in_min'] as num?)?.toInt(),
      openTime: j['open_time']?.toString(),
      closeTime: j['close_time']?.toString(),
      day: (j['day'] as num?)?.toInt(),
    );
  }
}

class MerchantWeeklyHour {
  final int day; // 1..7
  final String label; // "Thứ 2" ...
  final bool isClosed;
  final String? openTime;
  final String? closeTime;

  const MerchantWeeklyHour({
    required this.day,
    required this.label,
    required this.isClosed,
    required this.openTime,
    required this.closeTime,
  });

  factory MerchantWeeklyHour.fromJson(Map<String, dynamic> j) {
    return MerchantWeeklyHour(
      day: (j['day'] as num?)?.toInt() ?? 0,
      label: (j['label'] ?? '').toString(),
      isClosed: j['is_closed'] == true,
      openTime: j['open_time']?.toString(),
      closeTime: j['close_time']?.toString(),
    );
  }
}

// =====================
// VIEWER
// =====================

class MerchantViewer {
  final bool isFavorited;

  const MerchantViewer({required this.isFavorited});

  factory MerchantViewer.fromJson(Map<String, dynamic> j) {
    return MerchantViewer(isFavorited: j['is_favorited'] == true);
  }
}

// =====================
// BENEFITS
// =====================

class MerchantBenefits {
  final List<AutoPromotion> autoPromotions;
  final List<VoucherItem> vouchers;

  const MerchantBenefits({
    required this.autoPromotions,
    required this.vouchers,
  });

  factory MerchantBenefits.fromJson(Map<String, dynamic> j) {
    return MerchantBenefits(
      autoPromotions: ((j['auto_promotions'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => AutoPromotion.fromJson(e.cast<String, dynamic>()))
          .toList(),
      vouchers: ((j['vouchers'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => VoucherItem.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class AutoPromotion {
  final String id;
  final String createdByType; // platform | merchant
  final String? merchantId;
  final String applyLevel; // order/shipping/product/category...
  final String type; // percentage/fixed...
  final num discountValue;
  final num maxDiscount;
  final num minOrderAmount;
  final int perUserLimit;
  final DateTime? validFrom;
  final DateTime? validTo;

  const AutoPromotion({
    required this.id,
    required this.createdByType,
    required this.merchantId,
    required this.applyLevel,
    required this.type,
    required this.discountValue,
    required this.maxDiscount,
    required this.minOrderAmount,
    required this.perUserLimit,
    required this.validFrom,
    required this.validTo,
  });

  factory AutoPromotion.fromJson(Map<String, dynamic> j) {
    DateTime? parseDt(dynamic v) {
      if (v == null) return null;
      return DateTime.tryParse(v.toString());
    }

    return AutoPromotion(
      id: (j['id'] ?? j['_id']).toString(),
      createdByType: (j['created_by_type'] ?? '').toString(),
      merchantId: j['merchant_id']?.toString(),
      applyLevel: (j['apply_level'] ?? '').toString(),
      type: (j['type'] ?? '').toString(),
      discountValue: (j['discount_value'] as num?) ?? 0,
      maxDiscount: (j['max_discount'] as num?) ?? 0,
      minOrderAmount: (j['min_order_amount'] as num?) ?? 0,
      perUserLimit: (j['per_user_limit'] as num?)?.toInt() ?? 0,
      validFrom: parseDt(j['valid_from']),
      validTo: parseDt(j['valid_to']),
    );
  }
}

class VoucherItem {
  // Bạn chưa gửi sample voucher object, nên mình để fields an toàn.
  // Khi bạn chốt schema voucher response, mình sẽ tighten type lại.
  final String id;
  final String? code;
  final num? discountValue;
  final num? maxDiscount;
  final num? minOrderAmount;
  final DateTime? validFrom;
  final DateTime? validTo;

  const VoucherItem({
    required this.id,
    required this.code,
    required this.discountValue,
    required this.maxDiscount,
    required this.minOrderAmount,
    required this.validFrom,
    required this.validTo,
  });

  factory VoucherItem.fromJson(Map<String, dynamic> j) {
    DateTime? parseDt(dynamic v) {
      if (v == null) return null;
      return DateTime.tryParse(v.toString());
    }

    return VoucherItem(
      id: (j['id'] ?? j['_id']).toString(),
      code: j['code']?.toString(),
      discountValue: j['discount_value'] as num?,
      maxDiscount: j['max_discount'] as num?,
      minOrderAmount: j['min_order_amount'] as num?,
      validFrom: parseDt(j['valid_from']),
      validTo: parseDt(j['valid_to']),
    );
  }
}

// =====================
// SECTIONS (product items + topping items)
// =====================

class MerchantDetailMenuSection {
  final String key;
  final String title;

  /// items có thể là ProductItem hoặc ToppingItem
  final List<MerchantDetailSectionItem> items;

  const MerchantDetailMenuSection({
    required this.key,
    required this.title,
    required this.items,
  });

  factory MerchantDetailMenuSection.fromJson(Map<String, dynamic> j) {
    return MerchantDetailMenuSection(
      key: (j['key'] ?? '').toString(),
      title: (j['title'] ?? '').toString(),
      items: ((j['items'] as List?) ?? const [])
          .whereType<Map>()
          .map(
            (e) =>
                MerchantDetailSectionItem.fromJson(e.cast<String, dynamic>()),
          )
          .toList(),
    );
  }

  bool get isToppingSection => key == 'toppings';
}

/// Union base
abstract class MerchantDetailSectionItem {
  const MerchantDetailSectionItem();

  factory MerchantDetailSectionItem.fromJson(Map<String, dynamic> j) {
    // Heuristic: product có image_urls/price/base_price/sold...
    if (j.containsKey('image_urls') ||
        j.containsKey('base_price') ||
        j.containsKey('sold')) {
      return MerchantDetailProductItem.fromJson(j);
    }
    // topping có max_quantity + is_available + price
    return MerchantDetailToppingItem.fromJson(j);
  }
}

class MerchantDetailProductItem extends MerchantDetailSectionItem {
  final String id;
  final String name;
  final String description;
  final List<String> imageUrls;
  final num price;
  final num? basePrice;
  final int sold;

  final bool isAvailable;

  /// rating/reviews của PRODUCT (đã cache từ bảng reviews)
  final num rating;
  final int reviews;

  final bool hasOptions;

  const MerchantDetailProductItem({
    required this.id,
    required this.name,
    required this.description,
    required this.imageUrls,
    required this.price,
    required this.basePrice,
    required this.sold,
    required this.isAvailable,
    required this.rating,
    required this.reviews,
    required this.hasOptions,
  });

  factory MerchantDetailProductItem.fromJson(Map<String, dynamic> j) {
    final imgs = ((j['image_urls'] as List?) ?? const [])
        .map((e) => e.toString())
        .where((s) => s.isNotEmpty)
        .toList();

    return MerchantDetailProductItem(
      id: (j['id'] ?? j['_id']).toString(),
      name: (j['name'] ?? '').toString(),
      description: (j['description'] ?? '').toString(),
      imageUrls: imgs,
      price: (j['price'] as num?) ?? 0,
      basePrice: j['base_price'] as num?,
      sold: (j['sold'] as num?)?.toInt() ?? 0,
      isAvailable: j['is_available'] == true,
      rating: (j['rating'] as num?) ?? 0,
      reviews: (j['reviews'] as num?)?.toInt() ?? 0,
      hasOptions: j['has_options'] == true,
    );
  }

  String? get cover => imageUrls.isNotEmpty ? imageUrls.first : null;

  int get discountPercent {
    final b = (basePrice ?? 0).toDouble();
    final p = price.toDouble();
    if (b <= 0 || p >= b) return 0;
    return (((b - p) / b) * 100).floor();
  }
}

class CartSummary {
  final int itemCount;
  final num subtotalEstimated;
  final num totalEstimated;

  const CartSummary({
    required this.itemCount,
    required this.subtotalEstimated,
    required this.totalEstimated,
  });

  factory CartSummary.fromJson(Map<String, dynamic> j) {
    return CartSummary(
      itemCount: (j['item_count'] as num?)?.toInt() ?? 0,
      subtotalEstimated: (j['subtotal_estimated'] as num?) ?? 0,
      totalEstimated: (j['total_estimated'] as num?) ?? 0,
    );
  }
}

class MerchantDetailToppingItem extends MerchantDetailSectionItem {
  final String id;
  final String name;
  final String? description;
  final num price;
  final String? image_url;
  final bool isAvailable;
  final int maxQuantity;

  const MerchantDetailToppingItem({
    required this.id,
    required this.image_url,
    required this.name,
    required this.description,
    required this.price,
    required this.isAvailable,
    required this.maxQuantity,
  });

  factory MerchantDetailToppingItem.fromJson(Map<String, dynamic> j) {
    return MerchantDetailToppingItem(
      id: (j['id'] ?? j['_id']).toString(),
      name: (j['name'] ?? '').toString(),
      description: j['description']?.toString(),
      price: (j['price'] as num?) ?? 0,
      isAvailable: j['is_available'] == true,
      maxQuantity: (j['max_quantity'] as num?)?.toInt() ?? 1,
      // Sửa lại dòng này để lấy từ JSON:
      image_url: j['image_url']?.toString(),
    );
  }
}
