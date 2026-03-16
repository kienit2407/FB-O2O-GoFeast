import 'package:flutter/foundation.dart';

enum SearchTabType { all, nearMe }

double _toDouble(dynamic value, [double fallback = 0]) {
  if (value == null) return fallback;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? fallback;
}

int _toInt(dynamic value, [int fallback = 0]) {
  if (value == null) return fallback;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString()) ?? fallback;
}

class SearchMerchantItem {
  final String id;
  final String name;
  final String? description;
  final String? logoUrl;
  final String? coverImageUrl;
  final String? category;
  final String? address;
  final double averageRating;
  final int totalReviews;
  final bool isAcceptingOrders;
  final int averagePrepTimeMin;
  final double deliveryRadiusKm;
  final double? distanceKm;
  final int? etaMin;
  final String? etaAt;
  final bool canDeliver;

  const SearchMerchantItem({
    required this.id,
    required this.name,
    this.description,
    this.logoUrl,
    this.coverImageUrl,
    this.category,
    this.address,
    required this.averageRating,
    required this.totalReviews,
    required this.isAcceptingOrders,
    required this.averagePrepTimeMin,
    required this.deliveryRadiusKm,
    this.distanceKm,
    this.etaMin,
    this.etaAt,
    required this.canDeliver,
  });

  factory SearchMerchantItem.fromJson(Map<String, dynamic> json) {
    return SearchMerchantItem(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: json['description']?.toString(),
      logoUrl: json['logo_url']?.toString(),
      coverImageUrl: json['cover_image_url']?.toString(),
      category: json['category']?.toString(),
      address: json['address']?.toString(),
      averageRating: _toDouble(json['average_rating']),
      totalReviews: _toInt(json['total_reviews']),
      isAcceptingOrders: json['is_accepting_orders'] == true,
      averagePrepTimeMin: _toInt(json['average_prep_time_min'], 15),
      deliveryRadiusKm: _toDouble(json['delivery_radius_km']),
      distanceKm: json['distance_km'] == null
          ? null
          : _toDouble(json['distance_km']),
      etaMin: json['eta_min'] == null ? null : _toInt(json['eta_min']),
      etaAt: json['eta_at']?.toString(),
      canDeliver: json['can_deliver'] == true,
    );
  }
}

class SearchProductMerchantMini {
  final String id;
  final String name;
  final String? logoUrl;
  final String? address;

  const SearchProductMerchantMini({
    required this.id,
    required this.name,
    this.logoUrl,
    this.address,
  });

  factory SearchProductMerchantMini.fromJson(Map<String, dynamic> json) {
    return SearchProductMerchantMini(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      logoUrl: json['logo_url']?.toString(),
      address: json['address']?.toString(),
    );
  }
}

class SearchProductItem {
  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final int basePrice;
  final int salePrice;
  final int finalPrice;
  final int discountAmount;
  final int discountPercent;
  final bool isAvailable;
  final double averageRating;
  final int totalReviews;
  final int totalSold;
  final bool hasOptions;
  final SearchProductMerchantMini merchant;
  final double? distanceKm;
  final int? etaMin;
  final bool canDeliver;

  const SearchProductItem({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
    required this.basePrice,
    required this.salePrice,
    required this.finalPrice,
    required this.discountAmount,
    required this.discountPercent,
    required this.isAvailable,
    required this.averageRating,
    required this.totalReviews,
    required this.totalSold,
    required this.hasOptions,
    required this.merchant,
    this.distanceKm,
    this.etaMin,
    required this.canDeliver,
  });

  factory SearchProductItem.fromJson(Map<String, dynamic> json) {
    return SearchProductItem(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: json['description']?.toString(),
      imageUrl: json['image_url']?.toString(),
      basePrice: _toInt(json['base_price']),
      salePrice: _toInt(json['sale_price']),
      finalPrice: _toInt(json['final_price']),
      discountAmount: _toInt(json['discount_amount']),
      discountPercent: _toInt(json['discount_percent']),
      isAvailable: json['is_available'] == true,
      averageRating: _toDouble(json['average_rating']),
      totalReviews: _toInt(json['total_reviews']),
      totalSold: _toInt(json['total_sold']),
      hasOptions: json['has_options'] == true,
      merchant: SearchProductMerchantMini.fromJson(
        Map<String, dynamic>.from(json['merchant'] ?? const {}),
      ),
      distanceKm: json['distance_km'] == null
          ? null
          : _toDouble(json['distance_km']),
      etaMin: json['eta_min'] == null ? null : _toInt(json['eta_min']),
      canDeliver: json['can_deliver'] == true,
    );
  }
}

class SearchPagedMerchants {
  final List<SearchMerchantItem> items;
  final int page;
  final int limit;
  final bool hasMore;

  const SearchPagedMerchants({
    required this.items,
    required this.page,
    required this.limit,
    required this.hasMore,
  });

  factory SearchPagedMerchants.fromJson(Map<String, dynamic> json) {
    final raw = (json['items'] as List?) ?? const [];
    return SearchPagedMerchants(
      items: raw
          .map((e) => SearchMerchantItem.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      page: _toInt(json['page'], 1),
      limit: _toInt(json['limit'], 10),
      hasMore: json['has_more'] == true,
    );
  }
}

class SearchPagedProducts {
  final List<SearchProductItem> items;
  final int page;
  final int limit;
  final bool hasMore;

  const SearchPagedProducts({
    required this.items,
    required this.page,
    required this.limit,
    required this.hasMore,
  });

  factory SearchPagedProducts.fromJson(Map<String, dynamic> json) {
    final raw = (json['items'] as List?) ?? const [];
    return SearchPagedProducts(
      items: raw
          .map((e) => SearchProductItem.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      page: _toInt(json['page'], 1),
      limit: _toInt(json['limit'], 10),
      hasMore: json['has_more'] == true,
    );
  }
}

class SearchOverviewResponse {
  final SearchPagedMerchants merchants;
  final SearchPagedProducts products;

  const SearchOverviewResponse({
    required this.merchants,
    required this.products,
  });

  factory SearchOverviewResponse.fromJson(Map<String, dynamic> json) {
    return SearchOverviewResponse(
      merchants: SearchPagedMerchants.fromJson(
        Map<String, dynamic>.from(json['merchants'] ?? const {}),
      ),
      products: SearchPagedProducts.fromJson(
        Map<String, dynamic>.from(json['products'] ?? const {}),
      ),
    );
  }
}

@immutable
class SearchPageResultMeta {
  final bool needLocation;
  final bool isEmptyKeyword;

  const SearchPageResultMeta({
    this.needLocation = false,
    this.isEmptyKeyword = false,
  });
}
