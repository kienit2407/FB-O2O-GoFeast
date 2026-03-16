import 'package:customer/core/di/providers.dart';
import 'package:customer/features/orders/data/models/customer_my_reviews_models.dart';
import 'package:customer/features/orders/presentation/viewmodels/customer_my_reviews_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final customerMyReviewsControllerProvider = StateNotifierProvider<
    CustomerMyReviewsController, CustomerMyReviewsState>((ref) {
  final repo = ref.read(myOrdersRepositoryProvider);
  return CustomerMyReviewsController(repo);
});

class CustomerMyReviewsController
    extends StateNotifier<CustomerMyReviewsState> {
  CustomerMyReviewsController(this._repo)
      : super(CustomerMyReviewsState.initial());

  final dynamic _repo;

  Future<void> bootstrap() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final summary = await _repo.fetchMyReviewsSummary();
      final list = await _repo.fetchMyReviews(
        type: state.selectedType,
        limit: 10,
      );

      state = state.copyWith(
        loading: false,
        summary: summary,
        items: list.items,
        nextCursor: list.nextCursor,
        hasMore: list.hasMore,
      );
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: 'Không tải được danh sách đánh giá',
      );
    }
  }

  Future<void> refresh() async {
    try {
      final summary = await _repo.fetchMyReviewsSummary();
      final list = await _repo.fetchMyReviews(
        type: state.selectedType,
        limit: 10,
      );

      state = state.copyWith(
        summary: summary,
        items: list.items,
        nextCursor: list.nextCursor,
        hasMore: list.hasMore,
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(
        error: 'Không làm mới được danh sách đánh giá',
      );
    }
  }

  Future<void> setType(CustomerMyReviewType type) async {
    if (state.selectedType == type) return;

    state = state.copyWith(
      selectedType: type,
      loading: true,
      items: [],
      nextCursor: null,
      hasMore: false,
      clearError: true,
    );

    try {
      final list = await _repo.fetchMyReviews(
        type: type,
        limit: 10,
      );

      state = state.copyWith(
        loading: false,
        items: list.items,
        nextCursor: list.nextCursor,
        hasMore: list.hasMore,
      );
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: 'Không tải được danh sách đánh giá',
      );
    }
  }

  Future<void> loadMore() async {
    if (state.loadingMore || !state.hasMore) return;
    final cursor = state.nextCursor;
    if (cursor == null || cursor.isEmpty) return;

    state = state.copyWith(loadingMore: true);
    try {
      final list = await _repo.fetchMyReviews(
        type: state.selectedType,
        cursor: cursor,
        limit: 10,
      );

      state = state.copyWith(
        loadingMore: false,
        items: [...state.items, ...list.items],
        nextCursor: list.nextCursor,
        hasMore: list.hasMore,
      );
    } catch (e) {
      state = state.copyWith(
        loadingMore: false,
        error: 'Không tải thêm được dữ liệu',
      );
    }
  }

  Future<bool> deleteReview(CustomerMyReviewItem item) async {
    final deleting = {...state.deletingIds, item.id};
    state = state.copyWith(deletingIds: deleting);

    try {
      switch (item.type) {
        case CustomerMyReviewType.merchant:
          await _repo.deleteMyMerchantReview(item.id);
          break;
        case CustomerMyReviewType.driver:
          await _repo.deleteMyDriverReview(item.id);
          break;
        case CustomerMyReviewType.product:
          await _repo.deleteMyProductReview(item.id);
          break;
        case CustomerMyReviewType.all:
          break;
      }

      final nextDeleting = {...state.deletingIds}..remove(item.id);

      state = state.copyWith(
        deletingIds: nextDeleting,
        items: state.items.where((e) => e.id != item.id).toList(),
      );

      await refresh();
      return true;
    } catch (e) {
      final nextDeleting = {...state.deletingIds}..remove(item.id);
      state = state.copyWith(
        deletingIds: nextDeleting,
        error: 'Xoá đánh giá thất bại',
      );
      return false;
    }
  }
}