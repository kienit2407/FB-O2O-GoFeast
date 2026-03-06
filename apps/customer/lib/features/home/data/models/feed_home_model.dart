class FeedHomeResponse {
  final String? requestId;
  final String? geoCell;
  final DateTime? generatedAt;
  final List<FeedSection> sections;

  const FeedHomeResponse({
    required this.requestId,
    required this.geoCell,
    required this.generatedAt,
    required this.sections,
  });

  factory FeedHomeResponse.fromJson(Map<String, dynamic> j) {
    final secs = (j['sections'] as List?) ?? const [];
    return FeedHomeResponse(
      requestId: j['request_id']?.toString(),
      geoCell: j['geo_cell']?.toString(),
      generatedAt: DateTime.tryParse(j['generated_at']?.toString() ?? ''),
      sections: secs
          .whereType<Map>()
          .map((e) => FeedSection.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class FeedSection {
  final String key;
  final String title;
  final List<FeedItem> items;

  const FeedSection({
    required this.key,
    required this.title,
    required this.items,
  });

  factory FeedSection.fromJson(Map<String, dynamic> j) {
    final items = (j['items'] as List?) ?? const [];
    return FeedSection(
      key: (j['key'] ?? '').toString(),
      title: (j['title'] ?? '').toString(),
      items: items
          .whereType<Map>()
          .map((e) => FeedItem.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

enum FeedItemType { product, merchant }

class FeedItem {
  final FeedItemType type;

  // product
  final String? productId;
  final String? productName;

  //  NEW: list ảnh
  final List<String> imageUrls;

  // optional: giữ lại để tương thích code cũ
  final String? imageUrl;

  final num? basePrice;
  final num? salePrice;
  final num? rating;

  // merchant (hoặc merchant của product)
  final FeedMerchant? merchant;

  // merchant item fields (top-level)
  final String? merchantId;
  final String? merchantName;
  final String? merchantCategory;
  final String? merchantLogoUrl;
  final String? merchantCoverUrl;
  final num? merchantRating;
  final num? distanceKm;
  final num? orders7d;

  const FeedItem({
    required this.type,

    // product
    this.productId,
    this.productName,
    this.imageUrls = const [],
    this.imageUrl,
    this.basePrice,
    this.salePrice,
    this.rating,
    this.merchant,

    // merchant
    this.merchantId,
    this.merchantName,
    this.merchantCategory,
    this.merchantLogoUrl,
    this.merchantCoverUrl,
    this.merchantRating,
    this.distanceKm,
    this.orders7d,
  });

  factory FeedItem.fromJson(Map<String, dynamic> j) {
    final t = (j['type'] ?? j['item_type'] ?? '').toString();
    final type = t == 'product' ? FeedItemType.product : FeedItemType.merchant;

    if (type == FeedItemType.product) {
      // ✅ parse image_urls
      final rawList = j['image_urls'];
      final urls = (rawList is List)
          ? rawList.map((e) => e.toString()).where((s) => s.isNotEmpty).toList()
          : <String>[];

      // fallback: nếu BE chưa trả image_urls thì lấy image_url
      final one = (j['image_url'] ?? '').toString();
      final merged = urls.isNotEmpty
          ? urls
          : (one.isNotEmpty ? <String>[one] : <String>[]);

      return FeedItem(
        type: type,
        productId: j['product_id']?.toString(),
        productName: j['product_name']?.toString(),
        imageUrls: merged,
        imageUrl: one.isNotEmpty
            ? one
            : (merged.isNotEmpty ? merged.first : null),
        basePrice: j['base_price'] as num?,
        salePrice: j['sale_price'] as num?,
        rating: j['rating'] as num?,
        merchant: j['merchant'] is Map
            ? FeedMerchant.fromJson(
                (j['merchant'] as Map).cast<String, dynamic>(),
              )
            : null,
      );
    }

    return FeedItem(
      type: type,
      merchantId: j['merchant_id']?.toString(),
      merchantName: j['name']?.toString(),
      merchantCategory: j['category']?.toString(),
      merchantLogoUrl: j['logo_url']?.toString(),
      merchantCoverUrl: j['cover_image_url']?.toString(),
      merchantRating: j['rating'] as num?,
      distanceKm: j['distance_km'] as num?,
      orders7d: j['orders_7d'] as num?,
    );
  }

  /// ✅ ảnh ưu tiên dùng cho card
  String? get primaryImageUrl {
    if (imageUrls.isNotEmpty) return imageUrls.first;
    if (imageUrl != null && imageUrl!.isNotEmpty) return imageUrl;
    return null;
  }

  int get discountPercent {
    final b = (basePrice ?? 0).toDouble();
    final s = (salePrice ?? 0).toDouble();
    if (b <= 0 || s <= 0 || s >= b) return 0;
    return (((b - s) / b) * 100).floor();
  }

  num get displayPrice => (salePrice != null && (salePrice ?? 0) > 0)
      ? salePrice!
      : (basePrice ?? 0);
}

class FeedMerchant {
  final String? id;
  final String? name;
  final String? category;
  final num? distanceKm;
  final String? logoUrl;

  const FeedMerchant({
    this.id,
    this.name,
    this.category,
    this.distanceKm,
    this.logoUrl,
  });

  factory FeedMerchant.fromJson(Map<String, dynamic> j) {
    return FeedMerchant(
      id: j['merchant_id']?.toString(),
      name: j['name']?.toString(),
      category: j['category']?.toString(),
      distanceKm: j['distance_km'] as num?,
      logoUrl: j['logo_url']?.toString(),
    );
  }
}
