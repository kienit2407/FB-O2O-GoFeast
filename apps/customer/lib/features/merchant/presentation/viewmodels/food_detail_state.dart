import 'package:flutter/foundation.dart';
import 'package:customer/features/merchant/data/models/food_detail_model.dart';
import 'package:customer/features/merchant/data/models/product_reviews_model.dart';

const _fdUnset = Object();

@immutable
class FoodDetailState {
  final bool isLoading;
  final bool isRefreshing;
  final bool isLoadingMore;

  final bool didLoad;
  final String? error;

  final FoodDetailResponse? detail;

  final List<ProductReviewItem> reviews;
  final String? nextCursor;
  final bool hasMore;

  final double avgRating;
  final int totalReviews;
  final ProductReviewItem? myReview;
  final bool canCreateReview;
  final String? createOrderId;

  const FoodDetailState({
    this.isLoading = false,
    this.isRefreshing = false,
    this.isLoadingMore = false,
    this.didLoad = false,
    this.error,
    this.detail,
    this.reviews = const [],
    this.nextCursor,
    this.hasMore = false,
    this.avgRating = 0,
    this.totalReviews = 0,
    this.myReview,
    this.canCreateReview = false,
    this.createOrderId,
  });

  const FoodDetailState.initial() : this();

  FoodDetailState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    bool? isLoadingMore,
    bool? didLoad,
    Object? error = _fdUnset,
    Object? detail = _fdUnset,
    List<ProductReviewItem>? reviews,
    Object? nextCursor = _fdUnset,
    bool? hasMore,
    double? avgRating,
    int? totalReviews,
    Object? myReview = _fdUnset,
    bool? canCreateReview,
    Object? createOrderId = _fdUnset,
  }) {
    return FoodDetailState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      didLoad: didLoad ?? this.didLoad,
      error: identical(error, _fdUnset) ? this.error : error as String?,
      detail: identical(detail, _fdUnset)
          ? this.detail
          : detail as FoodDetailResponse?,
      reviews: reviews ?? this.reviews,
      nextCursor: identical(nextCursor, _fdUnset)
          ? this.nextCursor
          : nextCursor as String?,
      hasMore: hasMore ?? this.hasMore,
      avgRating: avgRating ?? this.avgRating,
      totalReviews: totalReviews ?? this.totalReviews,
      myReview: identical(myReview, _fdUnset)
          ? this.myReview
          : myReview as ProductReviewItem?,
      canCreateReview: canCreateReview ?? this.canCreateReview,
      createOrderId: identical(createOrderId, _fdUnset)
          ? this.createOrderId
          : createOrderId as String?,
    );
  }
}
