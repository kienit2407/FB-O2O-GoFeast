// features/merchant/data/models/food_detail_model.dart

class FoodDetailResponse {
  final FoodDetailProduct product;
  final FoodDetailMerchant merchant;
  final List<FoodDetailTopping> toppings;

  const FoodDetailResponse({
    required this.product,
    required this.merchant,
    required this.toppings,
  });

  factory FoodDetailResponse.fromJson(Map<String, dynamic> json) {
    final toppingsRaw = (json['toppings'] is List)
        ? (json['toppings'] as List)
        : const [];
    return FoodDetailResponse(
      product: FoodDetailProduct.fromJson(
        Map<String, dynamic>.from((json['product'] as Map?) ?? {}),
      ),
      merchant: FoodDetailMerchant.fromJson(
        Map<String, dynamic>.from((json['merchant'] as Map?) ?? {}),
      ),
      toppings: toppingsRaw
          .whereType<Map>()
          .map((e) => FoodDetailTopping.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }
}

class FoodDetailProduct {
  final String id;
  final String merchantId;
  final String categoryId;

  final String name;
  final String description;

  /// API trả images là list object {url, public_id, position}
  final List<ProductImageItem> images;

  final int basePrice;
  final int salePrice;
  final int finalPrice;
  final int discountAmount;

  final bool isAvailable;

  final int totalSold;
  final double averageRating;
  final int totalReviews;

  final bool hasOptions;

  const FoodDetailProduct({
    required this.id,
    required this.merchantId,
    required this.categoryId,
    required this.name,
    required this.description,
    required this.images,
    required this.basePrice,
    required this.salePrice,
    required this.finalPrice,
    required this.discountAmount,
    required this.isAvailable,
    required this.totalSold,
    required this.averageRating,
    required this.totalReviews,
    required this.hasOptions,
  });

  factory FoodDetailProduct.fromJson(Map<String, dynamic> json) {
    final imagesRaw = (json['images'] is List)
        ? (json['images'] as List)
        : const [];

    return FoodDetailProduct(
      id: (json['id'] ?? '').toString(),
      merchantId: (json['merchant_id'] ?? '').toString(),
      categoryId: (json['category_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      images: imagesRaw
          .whereType<Map>()
          .map((e) => ProductImageItem.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      basePrice: _toInt(json['base_price']),
      salePrice: _toInt(json['sale_price']),
      finalPrice: _toInt(json['final_price']),
      discountAmount: _toInt(json['discount_amount']),
      isAvailable: json['is_available'] != false,
      totalSold: _toInt(json['total_sold']),
      averageRating: _toDouble(json['average_rating']),
      totalReviews: _toInt(json['total_reviews']),
      hasOptions: json['has_options'] == true,
    );
  }
}

class ProductImageItem {
  final String url;
  final String? publicId;
  final int position;

  const ProductImageItem({
    required this.url,
    this.publicId,
    required this.position,
  });

  factory ProductImageItem.fromJson(Map<String, dynamic> json) {
    return ProductImageItem(
      url: (json['url'] ?? '').toString(),
      publicId: json['public_id'] as String?,
      position: _toInt(json['position']),
    );
  }
}

class FoodDetailMerchant {
  final String id;
  final String? name;
  final String? logoUrl;
  final String? address;
  final String? category;

  final double averageRating;
  final int totalReviews;

  final bool isAcceptingOrders;
  final double deliveryRadiusKm;

  final double distanceKm;
  final bool canDeliver;

  final int etaMin;
  final String? etaAt; // ISO string

  const FoodDetailMerchant({
    required this.id,
    required this.name,
    required this.logoUrl,
    required this.address,
    required this.category,
    required this.averageRating,
    required this.totalReviews,
    required this.isAcceptingOrders,
    required this.deliveryRadiusKm,
    required this.distanceKm,
    required this.canDeliver,
    required this.etaMin,
    required this.etaAt,
  });

  factory FoodDetailMerchant.fromJson(Map<String, dynamic> json) {
    return FoodDetailMerchant(
      id: (json['id'] ?? '').toString(),
      name: json['name']?.toString(),
      logoUrl: json['logo_url']?.toString(),
      address: json['address']?.toString(),
      category: json['category']?.toString(),
      averageRating: _toDouble(json['average_rating']),
      totalReviews: _toInt(json['total_reviews']),
      isAcceptingOrders: json['is_accepting_orders'] == true,
      deliveryRadiusKm: _toDouble(json['delivery_radius_km']),
      distanceKm: _toDouble(json['distance_km']),
      canDeliver: json['can_deliver'] == true,
      etaMin: _toInt(json['eta_min']),
      etaAt: json['eta_at']?.toString(),
    );
  }
}

class FoodDetailTopping {
  final String id;
  final String name;
  final String? description;
  final int price;
  final bool isAvailable;
  final int maxQuantity;
  final String? imageUrl;

  const FoodDetailTopping({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.isAvailable,
    required this.maxQuantity,
    required this.imageUrl,
  });

  factory FoodDetailTopping.fromJson(Map<String, dynamic> json) {
    return FoodDetailTopping(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: json['description']?.toString(),
      price: _toInt(json['price']),
      isAvailable: json['is_available'] != false,
      maxQuantity: _toInt(json['max_quantity'], fallback: 1),
      imageUrl: json['image_url']?.toString(),
    );
  }
}

int _toInt(dynamic v, {int fallback = 0}) {
  if (v is int) return v;
  if (v is num) return v.round();
  if (v is String) return int.tryParse(v) ?? fallback;
  return fallback;
}

double _toDouble(dynamic v, {double fallback = 0}) {
  if (v is double) return v;
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? fallback;
  return fallback;
}
