class ProductReviewsResponse {
  final List<ProductReviewItem> items;
  final String? nextCursor;
  final bool hasMore;

  final double avgRating;
  final int total;

  final ProductReviewItem? myReview;
  final bool canCreateReview;
  final String? createOrderId;

  const ProductReviewsResponse({
    required this.items,
    required this.nextCursor,
    required this.hasMore,
    required this.avgRating,
    required this.total,
    required this.myReview,
    required this.canCreateReview,
    required this.createOrderId,
  });

  factory ProductReviewsResponse.fromJson(Map<String, dynamic> json) {
    final itemsRaw = (json['items'] is List)
        ? (json['items'] as List)
        : const [];
    final summary = (json['summary'] is Map)
        ? Map<String, dynamic>.from(json['summary'] as Map)
        : <String, dynamic>{};

    return ProductReviewsResponse(
      items: itemsRaw
          .whereType<Map>()
          .map((e) => ProductReviewItem.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      nextCursor: json['nextCursor']?.toString(),
      hasMore: json['hasMore'] == true,
      avgRating: (summary['avg_rating'] as num?)?.toDouble() ?? 0,
      total: (summary['total'] as num?)?.toInt() ?? 0,
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

class ProductReviewItem {
  final String id;
  final int rating;
  final String comment;

  final ReviewUser? user;
  final List<ReviewImage> images;
  final String? videoUrl;

  final ReviewMerchantReply? merchantReply;
  final bool isEdited;
  final DateTime? createdAt;

  const ProductReviewItem({
    required this.id,
    required this.rating,
    required this.comment,
    required this.user,
    required this.images,
    required this.videoUrl,
    required this.merchantReply,
    required this.isEdited,
    required this.createdAt,
  });

  factory ProductReviewItem.fromJson(Map<String, dynamic> json) {
    final imagesRaw = (json['images'] is List)
        ? (json['images'] as List)
        : const [];

    return ProductReviewItem(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      rating: _toInt(json['rating'], fallback: 5),
      comment: (json['comment'] ?? '').toString(),
      user: (json['user'] is Map)
          ? ReviewUser.fromJson(Map<String, dynamic>.from(json['user'] as Map))
          : null,
      images: imagesRaw
          .whereType<Map>()
          .map((e) => ReviewImage.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      videoUrl: json['video_url']?.toString(),
      merchantReply: (json['merchant_reply'] is Map)
          ? ReviewMerchantReply.fromJson(
              Map<String, dynamic>.from(json['merchant_reply'] as Map),
            )
          : null,
      isEdited: json['is_edited'] == true,
      createdAt: _toDate(json['created_at']),
    );
  }
}

class ReviewUser {
  final String? id;
  final String name;
  final String? avatarUrl;

  const ReviewUser({
    required this.id,
    required this.name,
    required this.avatarUrl,
  });

  factory ReviewUser.fromJson(Map<String, dynamic> json) {
    return ReviewUser(
      id: json['id']?.toString(),
      name: (json['full_name'] ?? json['name'] ?? json['username'] ?? 'Ẩn danh')
          .toString(),
      avatarUrl: (json['avatar_url'] ?? json['avatarUrl'] ?? json['photo_url'])
          ?.toString(),
    );
  }
}

class ReviewImage {
  final String url;
  final String? publicId;

  const ReviewImage({required this.url, required this.publicId});

  factory ReviewImage.fromJson(Map<String, dynamic> json) {
    return ReviewImage(
      url: (json['url'] ?? '').toString(),
      publicId: json['public_id']?.toString(),
    );
  }
}

class ReviewMerchantReply {
  final String content;
  final String? merchantUserId;
  final bool isEdited;
  final DateTime? repliedAt;
  final DateTime? updatedAt;

  const ReviewMerchantReply({
    required this.content,
    required this.merchantUserId,
    required this.isEdited,
    required this.repliedAt,
    required this.updatedAt,
  });

  factory ReviewMerchantReply.fromJson(Map<String, dynamic> json) {
    return ReviewMerchantReply(
      content: (json['content'] ?? '').toString(),
      merchantUserId: json['merchant_user_id']?.toString(),
      isEdited: json['is_edited'] == true,
      repliedAt: _toDate(json['replied_at']),
      updatedAt: _toDate(json['updated_at']),
    );
  }
}

int _toInt(dynamic v, {int fallback = 0}) {
  if (v is int) return v;
  if (v is num) return v.round();
  if (v is String) return int.tryParse(v) ?? fallback;
  return fallback;
}

DateTime? _toDate(dynamic v) {
  if (v == null) return null;
  return DateTime.tryParse(v.toString());
}
