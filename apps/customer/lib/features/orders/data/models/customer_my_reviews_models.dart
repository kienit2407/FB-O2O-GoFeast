enum CustomerMyReviewType { all, merchant, driver, product }

CustomerMyReviewType customerMyReviewTypeFromString(String value) {
  switch (value) {
    case 'merchant':
      return CustomerMyReviewType.merchant;
    case 'driver':
      return CustomerMyReviewType.driver;
    case 'product':
      return CustomerMyReviewType.product;
    case 'all':
    default:
      return CustomerMyReviewType.all;
  }
}

String customerMyReviewTypeToApi(CustomerMyReviewType type) {
  switch (type) {
    case CustomerMyReviewType.merchant:
      return 'merchant';
    case CustomerMyReviewType.driver:
      return 'driver';
    case CustomerMyReviewType.product:
      return 'product';
    case CustomerMyReviewType.all:
      return 'all';
  }
}

class CustomerMyReviewImage {
  final String url;
  final String? publicId;

  const CustomerMyReviewImage({required this.url, required this.publicId});

  factory CustomerMyReviewImage.fromJson(Map<String, dynamic> j) {
    return CustomerMyReviewImage(
      url: (j['url'] ?? '').toString(),
      publicId: j['public_id']?.toString(),
    );
  }
}

class CustomerMyReviewReply {
  final String content;
  final DateTime? repliedAt;
  final bool isEdited;

  const CustomerMyReviewReply({
    required this.content,
    required this.repliedAt,
    required this.isEdited,
  });

  factory CustomerMyReviewReply.fromJson(Map<String, dynamic> j) {
    return CustomerMyReviewReply(
      content: (j['content'] ?? '').toString(),
      repliedAt: DateTime.tryParse((j['replied_at'] ?? '').toString()),
      isEdited: j['is_edited'] == true,
    );
  }
}

class CustomerMyReviewOrderSummary {
  final String id;
  final String orderNumber;

  const CustomerMyReviewOrderSummary({
    required this.id,
    required this.orderNumber,
  });

  factory CustomerMyReviewOrderSummary.fromJson(Map<String, dynamic>? j) {
    final map = j ?? const <String, dynamic>{};
    return CustomerMyReviewOrderSummary(
      id: (map['id'] ?? '').toString(),
      orderNumber: (map['order_number'] ?? '').toString(),
    );
  }
}

class CustomerMyReviewMerchantSummary {
  final String id;
  final String name;
  final String? logoUrl;

  const CustomerMyReviewMerchantSummary({
    required this.id,
    required this.name,
    required this.logoUrl,
  });

  factory CustomerMyReviewMerchantSummary.fromJson(Map<String, dynamic>? j) {
    final map = j ?? const <String, dynamic>{};
    return CustomerMyReviewMerchantSummary(
      id: (map['id'] ?? '').toString(),
      name: (map['name'] ?? '').toString(),
      logoUrl: map['logo_url']?.toString(),
    );
  }
}

class CustomerMyReviewProductSummary {
  final String id;
  final String name;
  final String? imageUrl;
  final String? merchantId;

  const CustomerMyReviewProductSummary({
    required this.id,
    required this.name,
    required this.imageUrl,
    required this.merchantId,
  });

  factory CustomerMyReviewProductSummary.fromJson(Map<String, dynamic>? j) {
    final map = j ?? const <String, dynamic>{};
    return CustomerMyReviewProductSummary(
      id: (map['id'] ?? '').toString(),
      name: (map['name'] ?? '').toString(),
      imageUrl: map['image_url']?.toString(),
      merchantId: map['merchant_id']?.toString(),
    );
  }
}

class CustomerMyReviewDriverSummary {
  final String id;
  final String name;
  final String? avatarUrl;

  const CustomerMyReviewDriverSummary({
    required this.id,
    required this.name,
    required this.avatarUrl,
  });

  factory CustomerMyReviewDriverSummary.fromJson(Map<String, dynamic>? j) {
    final map = j ?? const <String, dynamic>{};
    return CustomerMyReviewDriverSummary(
      id: (map['id'] ?? '').toString(),
      name: (map['name'] ?? '').toString(),
      avatarUrl: map['avatar_url']?.toString(),
    );
  }
}

class CustomerMyReviewItem {
  final String id;
  final CustomerMyReviewType type;
  final CustomerMyReviewOrderSummary order;
  final CustomerMyReviewMerchantSummary? merchant;
  final CustomerMyReviewProductSummary? product;
  final CustomerMyReviewDriverSummary? driver;
  final int rating;
  final String comment;
  final List<CustomerMyReviewImage> images;
  final String? videoUrl;
  final CustomerMyReviewReply? merchantReply;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const CustomerMyReviewItem({
    required this.id,
    required this.type,
    required this.order,
    required this.merchant,
    required this.product,
    required this.driver,
    required this.rating,
    required this.comment,
    required this.images,
    required this.videoUrl,
    required this.merchantReply,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CustomerMyReviewItem.fromJson(Map<String, dynamic> j) {
    return CustomerMyReviewItem(
      id: (j['id'] ?? '').toString(),
      type: customerMyReviewTypeFromString((j['type'] ?? 'all').toString()),
      order: CustomerMyReviewOrderSummary.fromJson(
        (j['order'] as Map?)?.cast<String, dynamic>(),
      ),
      merchant: j['merchant'] == null
          ? null
          : CustomerMyReviewMerchantSummary.fromJson(
              (j['merchant'] as Map).cast<String, dynamic>(),
            ),
      product: j['product'] == null
          ? null
          : CustomerMyReviewProductSummary.fromJson(
              (j['product'] as Map).cast<String, dynamic>(),
            ),
      driver: j['driver'] == null
          ? null
          : CustomerMyReviewDriverSummary.fromJson(
              (j['driver'] as Map).cast<String, dynamic>(),
            ),
      rating: (j['rating'] as num?)?.toInt() ?? 0,
      comment: (j['comment'] ?? '').toString(),
      images: ((j['images'] as List?) ?? const [])
          .map(
            (e) => CustomerMyReviewImage.fromJson(
              (e as Map).cast<String, dynamic>(),
            ),
          )
          .toList(),
      videoUrl: j['video_url']?.toString(),
      merchantReply: j['merchant_reply'] == null
          ? null
          : CustomerMyReviewReply.fromJson(
              (j['merchant_reply'] as Map).cast<String, dynamic>(),
            ),
      createdAt: DateTime.tryParse((j['created_at'] ?? '').toString()),
      updatedAt: DateTime.tryParse((j['updated_at'] ?? '').toString()),
    );
  }
}

class CustomerMyReviewsSummary {
  final int all;
  final int merchant;
  final int driver;
  final int product;

  const CustomerMyReviewsSummary({
    required this.all,
    required this.merchant,
    required this.driver,
    required this.product,
  });

  factory CustomerMyReviewsSummary.fromJson(Map<String, dynamic> j) {
    return CustomerMyReviewsSummary(
      all: (j['all'] as num?)?.toInt() ?? 0,
      merchant: (j['merchant'] as num?)?.toInt() ?? 0,
      driver: (j['driver'] as num?)?.toInt() ?? 0,
      product: (j['product'] as num?)?.toInt() ?? 0,
    );
  }
}

class CustomerMyReviewsListResponse {
  final List<CustomerMyReviewItem> items;
  final String? nextCursor;
  final bool hasMore;

  const CustomerMyReviewsListResponse({
    required this.items,
    required this.nextCursor,
    required this.hasMore,
  });

  factory CustomerMyReviewsListResponse.fromJson(Map<String, dynamic> j) {
    return CustomerMyReviewsListResponse(
      items: ((j['items'] as List?) ?? const [])
          .map(
            (e) => CustomerMyReviewItem.fromJson(
              (e as Map).cast<String, dynamic>(),
            ),
          )
          .toList(),
      nextCursor: j['next_cursor']?.toString(),
      hasMore: j['has_more'] == true,
    );
  }
}
