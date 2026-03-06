class FavoriteMerchantResponse {
  final bool ok;
  final bool isFavorited;

  const FavoriteMerchantResponse({required this.ok, required this.isFavorited});

  factory FavoriteMerchantResponse.fromJson(Map<String, dynamic> j) {
    return FavoriteMerchantResponse(
      ok: (j['ok'] as bool?) ?? true,
      isFavorited: (j['is_favorited'] as bool?) ?? false,
    );
  }
}

class FavoriteMerchantItem {
  final FavoriteMerchant merchant;
  final DateTime? favoritedAt;

  const FavoriteMerchantItem({
    required this.merchant,
    required this.favoritedAt,
  });

  factory FavoriteMerchantItem.fromJson(Map<String, dynamic> j) {
    return FavoriteMerchantItem(
      merchant: FavoriteMerchant.fromJson(
        (j['merchant'] as Map).cast<String, dynamic>(),
      ),
      favoritedAt: j['favorited_at'] == null
          ? null
          : DateTime.tryParse(j['favorited_at'].toString()),
    );
  }
}

class FavoriteMerchant {
  final String id;
  final String name;
  final String? logoUrl;
  final String? coverImageUrl;
  final double rating;
  final int reviews;
  final bool isAcceptingOrders;
  final String? address;
  final String? category;

  // ✅ NEW
  final double? distanceKm;
  final int? etaMin;
  final List<FavoriteMerchantBadge> badges;

  const FavoriteMerchant({
    required this.id,
    required this.name,
    required this.logoUrl,
    required this.coverImageUrl,
    required this.rating,
    required this.reviews,
    required this.isAcceptingOrders,
    required this.address,
    required this.category,
    required this.distanceKm,
    required this.etaMin,
    required this.badges,
  });

  factory FavoriteMerchant.fromJson(Map<String, dynamic> j) {
    final rawBadges = (j['badges'] as List?) ?? const [];
    return FavoriteMerchant(
      id: (j['id'] ?? '').toString(),
      name: (j['name'] ?? '').toString(),
      logoUrl: j['logo_url']?.toString(),
      coverImageUrl: j['cover_image_url']?.toString(),
      rating: (j['rating'] as num?)?.toDouble() ?? 0,
      reviews: (j['reviews'] as num?)?.toInt() ?? 0,
      isAcceptingOrders: (j['is_accepting_orders'] as bool?) ?? false,
      address: j['address']?.toString(),
      category: j['category']?.toString(),

      // ✅ NEW
      distanceKm: (j['distance_km'] as num?)?.toDouble(),
      etaMin: (j['eta_min'] as num?)?.toInt(),
      badges: rawBadges
          .whereType<Map>()
          .map((e) => FavoriteMerchantBadge.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class FavoriteMerchantsResponse {
  final List<FavoriteMerchantItem> items;
  final String? nextCursor;

  const FavoriteMerchantsResponse({
    required this.items,
    required this.nextCursor,
  });

  factory FavoriteMerchantsResponse.fromJson(Map<String, dynamic> j) {
    final raw = (j['items'] as List?) ?? const [];
    return FavoriteMerchantsResponse(
      items: raw
          .whereType<Map>()
          .map((e) => FavoriteMerchantItem.fromJson(e.cast<String, dynamic>()))
          .toList(),
      nextCursor: j['nextCursor']?.toString(),
    );
  }
}

class FavoriteMerchantBadge {
  final String kind; // promo | voucher | shipping ...
  final String text;

  const FavoriteMerchantBadge({required this.kind, required this.text});

  factory FavoriteMerchantBadge.fromJson(Map<String, dynamic> j) {
    return FavoriteMerchantBadge(
      kind: (j['kind'] ?? '').toString(),
      text: (j['text'] ?? '').toString(),
    );
  }
}
