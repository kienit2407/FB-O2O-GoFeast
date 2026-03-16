import 'package:flutter/foundation.dart';
import 'package:customer/features/merchant/data/models/product_reviews_model.dart';

const _unsetMr = Object();

@immutable
class MerchantReviewsState {
  final bool isLoading;
  final bool isRefreshing;
  final bool isLoadingMore;
  final bool didLoad;
  final String? error;

  final List<ProductReviewItem> reviews;
  final String? nextCursor;
  final bool hasMore;

  final double avgRating;
  final int totalReviews;

  final ProductReviewItem? myReview;
  final bool canCreateReview;
  final String? createOrderId;

  const MerchantReviewsState({
    this.isLoading = false,
    this.isRefreshing = false,
    this.isLoadingMore = false,
    this.didLoad = false,
    this.error,
    this.reviews = const [],
    this.nextCursor,
    this.hasMore = true,
    this.avgRating = 0,
    this.totalReviews = 0,
    this.myReview,
    this.canCreateReview = false,
    this.createOrderId,
  });

  const MerchantReviewsState.initial() : this();

  MerchantReviewsState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    bool? isLoadingMore,
    bool? didLoad,
    Object? error = _unsetMr,
    List<ProductReviewItem>? reviews,
    Object? nextCursor = _unsetMr,
    bool? hasMore,
    double? avgRating,
    int? totalReviews,
    Object? myReview = _unsetMr,
    bool? canCreateReview,
    Object? createOrderId = _unsetMr,
  }) {
    return MerchantReviewsState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      didLoad: didLoad ?? this.didLoad,
      error: identical(error, _unsetMr) ? this.error : error as String?,
      reviews: reviews ?? this.reviews,
      nextCursor: identical(nextCursor, _unsetMr)
          ? this.nextCursor
          : nextCursor as String?,
      hasMore: hasMore ?? this.hasMore,
      avgRating: avgRating ?? this.avgRating,
      totalReviews: totalReviews ?? this.totalReviews,
      myReview: identical(myReview, _unsetMr)
          ? this.myReview
          : myReview as ProductReviewItem?,
      canCreateReview: canCreateReview ?? this.canCreateReview,
      createOrderId: identical(createOrderId, _unsetMr)
          ? this.createOrderId
          : createOrderId as String?,
    );
  }
}
