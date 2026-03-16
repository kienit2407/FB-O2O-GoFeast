import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:customer/features/merchant/data/models/merchant_reviews_model.dart';
import 'package:customer/features/merchant/data/models/product_reviews_model.dart';
import 'package:customer/features/merchant/data/repository/merchant_detail_repository.dart';
import 'package:customer/features/merchant/presentation/viewmodels/merchant_reviews_state.dart';

class MerchantReviewsController extends StateNotifier<MerchantReviewsState> {
  MerchantReviewsController({
    required MerchantDetailRepository repo,
    required String merchantId,
    required bool viewerEnabled,
    this.limit = 10,
  })  : _repo = repo,
        _merchantId = merchantId,
        _viewerEnabled = viewerEnabled,
        super(const MerchantReviewsState.initial()) {
    unawaited(load());
  }

  final MerchantDetailRepository _repo;
  final String _merchantId;
  final bool _viewerEnabled;
  final int limit;

  Future<MerchantReviewViewerState?> _safeViewerState() async {
    if (!_viewerEnabled) return null;
    try {
      return await _repo.getMerchantReviewViewerState(merchantId: _merchantId);
    } catch (_) {
      return null;
    }
  }

  Future<void> load() async {
    if (state.didLoad) return;

    state = state.copyWith(isLoading: true, error: null);

    try {
      final listFuture = _repo.listMerchantReviews(
        merchantId: _merchantId,
        limit: limit,
      );
      final viewerFuture = _safeViewerState();

      final listRes = await listFuture;
      final viewerRes = await viewerFuture;

      state = state.copyWith(
        isLoading: false,
        didLoad: true,
        reviews: listRes.items,
        nextCursor: listRes.nextCursor,
        hasMore: listRes.hasMore,
        avgRating: listRes.avgRating,
        totalReviews: listRes.total,
        myReview: viewerRes?.myReview,
        canCreateReview: viewerRes?.canCreateReview ?? false,
        createOrderId: viewerRes?.createOrderId,
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
      final listFuture = _repo.listMerchantReviews(
        merchantId: _merchantId,
        limit: limit,
      );
      final viewerFuture = _safeViewerState();

      final listRes = await listFuture;
      final viewerRes = await viewerFuture;

      state = state.copyWith(
        isRefreshing: false,
        reviews: listRes.items,
        nextCursor: listRes.nextCursor,
        hasMore: listRes.hasMore,
        avgRating: listRes.avgRating,
        totalReviews: listRes.total,
        myReview: viewerRes?.myReview,
        canCreateReview: viewerRes?.canCreateReview ?? false,
        createOrderId: viewerRes?.createOrderId,
      );
    } catch (e) {
      state = state.copyWith(isRefreshing: false, error: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (!state.hasMore || state.isLoadingMore) return;

    final cursor = state.nextCursor;
    if (cursor == null || cursor.isEmpty) return;

    state = state.copyWith(isLoadingMore: true, error: null);

    try {
      final res = await _repo.listMerchantReviews(
        merchantId: _merchantId,
        limit: limit,
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
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }
}
