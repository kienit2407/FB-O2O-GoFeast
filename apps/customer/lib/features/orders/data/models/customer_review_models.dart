import 'dart:io';

enum CustomerReviewTarget { merchant, driver, product }

class CustomerReviewMedia {
  final String url;
  final String? publicId;

  const CustomerReviewMedia({required this.url, required this.publicId});

  factory CustomerReviewMedia.fromJson(Map<String, dynamic> j) {
    return CustomerReviewMedia(
      url: (j['url'] ?? '').toString(),
      publicId: j['public_id']?.toString(),
    );
  }
}

class CustomerSingleReviewStatus {
  final bool exists;
  final String? id;
  final int rating;
  final String comment;
  final List<CustomerReviewMedia> images;
  final String? videoUrl;

  const CustomerSingleReviewStatus({
    required this.exists,
    required this.id,
    required this.rating,
    required this.comment,
    required this.images,
    required this.videoUrl,
  });

  factory CustomerSingleReviewStatus.fromJson(Map<String, dynamic>? j) {
    final map = j ?? const <String, dynamic>{};

    return CustomerSingleReviewStatus(
      exists: map['exists'] == true,
      id: map['id']?.toString(),
      rating: (map['rating'] as num?)?.toInt() ?? 0,
      comment: (map['comment'] ?? '').toString(),
      images: ((map['images'] as List?) ?? const [])
          .map(
            (e) => CustomerReviewMedia.fromJson(
              (e as Map).cast<String, dynamic>(),
            ),
          )
          .toList(),
      videoUrl: map['video_url']?.toString(),
    );
  }
}

class CustomerProductReviewStatus extends CustomerSingleReviewStatus {
  final String productId;

  const CustomerProductReviewStatus({
    required this.productId,
    required super.exists,
    required super.id,
    required super.rating,
    required super.comment,
    required super.images,
    required super.videoUrl,
  });

  factory CustomerProductReviewStatus.fromJson(Map<String, dynamic> j) {
    return CustomerProductReviewStatus(
      productId: (j['product_id'] ?? '').toString(),
      exists: j['exists'] == true,
      id: j['id']?.toString(),
      rating: (j['rating'] as num?)?.toInt() ?? 0,
      comment: (j['comment'] ?? '').toString(),
      images: ((j['images'] as List?) ?? const [])
          .map(
            (e) => CustomerReviewMedia.fromJson(
              (e as Map).cast<String, dynamic>(),
            ),
          )
          .toList(),
      videoUrl: j['video_url']?.toString(),
    );
  }
}

class CustomerOrderReviewStatusModel {
  final String orderId;
  final String? merchantId;
  final String? driverUserId;
  final CustomerSingleReviewStatus merchantReview;
  final CustomerSingleReviewStatus driverReview;
  final List<CustomerProductReviewStatus> productReviews;
  final bool canReviewMerchant;
  final bool canReviewDriver;
  final bool canReviewProduct;

  const CustomerOrderReviewStatusModel({
    required this.orderId,
    required this.merchantId,
    required this.driverUserId,
    required this.merchantReview,
    required this.driverReview,
    required this.productReviews,
    required this.canReviewMerchant,
    required this.canReviewDriver,
    required this.canReviewProduct,
  });

  factory CustomerOrderReviewStatusModel.fromJson(Map<String, dynamic> j) {
    return CustomerOrderReviewStatusModel(
      orderId: (j['order_id'] ?? '').toString(),
      merchantId: j['merchant_id']?.toString(),
      driverUserId: j['driver_user_id']?.toString(),
      merchantReview: CustomerSingleReviewStatus.fromJson(
        (j['merchant_review'] as Map?)?.cast<String, dynamic>(),
      ),
      driverReview: CustomerSingleReviewStatus.fromJson(
        (j['driver_review'] as Map?)?.cast<String, dynamic>(),
      ),
      productReviews: ((j['product_reviews'] as List?) ?? const [])
          .map(
            (e) => CustomerProductReviewStatus.fromJson(
              (e as Map).cast<String, dynamic>(),
            ),
          )
          .toList(),
      canReviewMerchant: j['can_review_merchant'] == true,
      canReviewDriver: j['can_review_driver'] == true,
      canReviewProduct: j['can_review_product'] == true,
    );
  }
}

class CustomerReviewSubmitInput {
  final String orderId;
  final String? merchantId;
  final String? driverUserId;
  final String? productId;

  final int rating;
  final String comment;

  final List<File> newImages;
  final File? newVideo;

  final List<String> keptRemoteImageUrls;
  final String? keptRemoteVideoUrl;

  const CustomerReviewSubmitInput({
    required this.orderId,
    required this.merchantId,
    required this.driverUserId,
    required this.productId,
    required this.rating,
    required this.comment,
    required this.newImages,
    required this.newVideo,
    required this.keptRemoteImageUrls,
    required this.keptRemoteVideoUrl,
  });
}
