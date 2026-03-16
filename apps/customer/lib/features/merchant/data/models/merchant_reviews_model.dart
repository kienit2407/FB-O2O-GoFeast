import 'package:customer/features/merchant/data/models/product_reviews_model.dart';

class MerchantReviewsResponse {
  final List<ProductReviewItem> items;
  final String? nextCursor;
  final bool hasMore;
  final double avgRating;
  final int total;

  const MerchantReviewsResponse({
    required this.items,
    required this.nextCursor,
    required this.hasMore,
    required this.avgRating,
    required this.total,
  });

  factory MerchantReviewsResponse.fromJson(Map<String, dynamic> json) {
    final itemsRaw = (json['items'] is List) ? (json['items'] as List) : const [];
    final summary = (json['summary'] is Map)
        ? Map<String, dynamic>.from(json['summary'] as Map)
        : <String, dynamic>{};

    return MerchantReviewsResponse(
      items: itemsRaw
          .whereType<Map>()
          .map((e) => ProductReviewItem.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      nextCursor: json['nextCursor']?.toString(),
      hasMore: json['hasMore'] == true,
      avgRating: (summary['avg_rating'] as num?)?.toDouble() ?? 0,
      total: (summary['total'] as num?)?.toInt() ?? 0,
    );
  }
}

class MerchantReviewViewerState {
  final ProductReviewItem? myReview;
  final bool canCreateReview;
  final String? createOrderId;

  const MerchantReviewViewerState({
    required this.myReview,
    required this.canCreateReview,
    required this.createOrderId,
  });

  factory MerchantReviewViewerState.fromJson(Map<String, dynamic> json) {
    return MerchantReviewViewerState(
      myReview: json['my_review'] is Map
          ? ProductReviewItem.fromJson(
              Map<String, dynamic>.from(json['my_review'] as Map),
            )
          : null,
      canCreateReview: json['can_create_review'] == true,
      createOrderId: json['create_order_id']?.toString(),
    );
  }
}
