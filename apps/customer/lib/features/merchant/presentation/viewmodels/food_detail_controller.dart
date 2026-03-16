import 'dart:async';

import 'package:customer/features/merchant/data/models/product_reviews_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:customer/features/merchant/data/repository/merchant_detail_repository.dart';
import 'package:customer/features/merchant/presentation/viewmodels/food_detail_state.dart';

class FoodDetailParams {
  final String productId;
  final double? lat;
  final double? lng;
  final int reviewLimit;

  const FoodDetailParams({
    required this.productId,
    this.lat,
    this.lng,
    this.reviewLimit = 10,
  });

  @override
  bool operator ==(Object other) =>
      other is FoodDetailParams &&
      other.productId == productId &&
      other.lat == lat &&
      other.lng == lng &&
      other.reviewLimit == reviewLimit;

  @override
  int get hashCode => Object.hash(productId, lat, lng, reviewLimit);
}

class FoodDetailController extends StateNotifier<FoodDetailState> {
  FoodDetailController({
    required MerchantDetailRepository repo,
    required FoodDetailParams params,
  }) : _repo = repo,
       _params = params,
       super(const FoodDetailState.initial()) {
    unawaited(load());
  }

  final MerchantDetailRepository _repo;
  final FoodDetailParams _params;

  Future<void> load() async {
    if (state.didLoad && state.detail != null) return;

    state = state.copyWith(isLoading: true, error: null);

    try {
      final detailFuture = _repo.getFoodDetail(
        productId: _params.productId,
        lat: _params.lat,
        lng: _params.lng,
      );

      final reviewsFuture = _repo.listProductReviews(
        productId: _params.productId,
        limit: _params.reviewLimit,
      );

      final detail = await detailFuture;
      final reviewsRes = await reviewsFuture;

      state = state.copyWith(
        isLoading: false,
        didLoad: true,
        detail: detail,
        reviews: reviewsRes.items,
        nextCursor: reviewsRes.nextCursor,
        hasMore: reviewsRes.hasMore,
        avgRating: reviewsRes.avgRating,
        totalReviews: reviewsRes.total,
        myReview: reviewsRes.myReview,
        canCreateReview: reviewsRes.canCreateReview,
        createOrderId: reviewsRes.createOrderId,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        didLoad: true,
        error: e.toString(),
      );
    }
  }

  Future<void> refresh() async {
    if (state.isRefreshing) return;

    state = state.copyWith(isRefreshing: true, error: null);

    try {
      final detail = await _repo.getFoodDetail(
        productId: _params.productId,
        lat: _params.lat,
        lng: _params.lng,
      );

      final reviewsRes = await _repo.listProductReviews(
        productId: _params.productId,
        limit: _params.reviewLimit,
      );

      state = state.copyWith(
        isRefreshing: false,
        detail: detail,
        reviews: reviewsRes.items,
        nextCursor: reviewsRes.nextCursor,
        hasMore: reviewsRes.hasMore,
        avgRating: reviewsRes.avgRating,
        totalReviews: reviewsRes.total,
        myReview: reviewsRes.myReview,
        canCreateReview: reviewsRes.canCreateReview,
        createOrderId: reviewsRes.createOrderId,
      );
    } catch (e) {
      state = state.copyWith(isRefreshing: false, error: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (!state.hasMore) return;
    if (state.isLoadingMore) return;

    final cursor = state.nextCursor;
    if (cursor == null || cursor.isEmpty) return;

    state = state.copyWith(isLoadingMore: true, error: null);

    try {
      final res = await _repo.listProductReviews(
        productId: _params.productId,
        limit: _params.reviewLimit,
        cursor: cursor,
      );

      final seen = <String>{for (final x in state.reviews) x.id};

      final merged = <ProductReviewItem>[
        ...state.reviews,
        ...res.items.where((x) => !seen.contains(x.id)),
      ];

      state = state.copyWith(
        isLoadingMore: false,
        reviews: merged,
        nextCursor: res.nextCursor,
        hasMore: res.hasMore,
        avgRating: res.avgRating,
        totalReviews: res.total,
        myReview: res.myReview ?? state.myReview,
        canCreateReview: res.canCreateReview,
        createOrderId: res.createOrderId ?? state.createOrderId,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }
}
