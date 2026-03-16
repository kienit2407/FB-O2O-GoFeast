import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:customer/features/orders/data/models/my_order_models.dart';
import 'package:customer/features/orders/data/repository/my_orders_repository.dart';
import 'package:customer/features/orders/presentation/viewmodels/my_orders_state.dart';

class MyOrdersController extends StateNotifier<MyOrdersState> {
  final MyOrdersRepository _repo;

  MyOrdersController(this._repo) : super(MyOrdersState.initial());

  Future<void> bootstrap() async {
    await Future.wait([loadCounts(), loadActive(refresh: true)]);
  }

  Future<void> loadCounts() async {
    state = state.copyWith(loadingCounts: true, error: null);
    try {
      final counts = await _repo.fetchTabCounts();
      state = state.copyWith(counts: counts, loadingCounts: false);
    } catch (e) {
      state = state.copyWith(
        loadingCounts: false,
        error: 'Không tải được số lượng đơn hàng',
      );
    }
  }

  Future<void> changeTab(MyOrderTab tab) async {
    if (state.tab == tab) return;
    state = state.copyWith(tab: tab, error: null);

    switch (tab) {
      case MyOrderTab.active:
        if (state.activeItems.isEmpty) {
          await loadActive(refresh: true);
        }
        break;
      case MyOrderTab.reviews:
        if (state.reviewItems.isEmpty) {
          await loadReviews(refresh: true);
        }
        break;
      case MyOrderTab.history:
        if (state.historyItems.isEmpty) {
          await loadHistory(refresh: true);
        }
        break;
      case MyOrderTab.drafts:
        if (state.draftItems.isEmpty) {
          await loadDrafts(refresh: true);
        }
        break;
    }
  }

  Future<void> refreshCurrent() async {
    await loadCounts();
    switch (state.tab) {
      case MyOrderTab.active:
        await loadActive(refresh: true);
        break;
      case MyOrderTab.reviews:
        await loadReviews(refresh: true);
        break;
      case MyOrderTab.history:
        await loadHistory(refresh: true);
        break;
      case MyOrderTab.drafts:
        await loadDrafts(refresh: true);
        break;
    }
  }

  Future<void> loadMoreCurrent() async {
    if (state.loadingMore) return;

    switch (state.tab) {
      case MyOrderTab.active:
        if (!state.activeHasMore) return;
        await loadActive();
        break;
      case MyOrderTab.reviews:
        if (!state.reviewHasMore) return;
        await loadReviews();
        break;
      case MyOrderTab.history:
        if (!state.historyHasMore) return;
        await loadHistory();
        break;
      case MyOrderTab.drafts:
        if (!state.draftHasMore) return;
        await loadDrafts();
        break;
    }
  }

  Future<void> loadActive({bool refresh = false}) async {
    if (refresh) {
      state = state.copyWith(
        loadingActive: true,
        activeCursor: null,
        activeHasMore: true,
        error: null,
      );
    } else {
      state = state.copyWith(loadingMore: true, error: null);
    }

    try {
      final res = await _repo.fetchActiveOrders(
        cursor: refresh ? null : state.activeCursor,
      );

      state = state.copyWith(
        loadingActive: false,
        loadingMore: false,
        activeItems: refresh ? res.items : [...state.activeItems, ...res.items],
        activeCursor: res.nextCursor,
        activeHasMore: res.hasMore,
      );
    } catch (e) {
      state = state.copyWith(
        loadingActive: false,
        loadingMore: false,
        error: 'Không tải được danh sách đơn đang đến',
      );
    }
  }

  Future<void> loadHistory({bool refresh = false}) async {
    if (refresh) {
      state = state.copyWith(
        loadingHistory: true,
        historyCursor: null,
        historyHasMore: true,
        error: null,
      );
    } else {
      state = state.copyWith(loadingMore: true, error: null);
    }

    try {
      final res = await _repo.fetchHistoryOrders(
        cursor: refresh ? null : state.historyCursor,
      );

      state = state.copyWith(
        loadingHistory: false,
        loadingMore: false,
        historyItems: refresh
            ? res.items
            : [...state.historyItems, ...res.items],
        historyCursor: res.nextCursor,
        historyHasMore: res.hasMore,
      );
    } catch (e) {
      state = state.copyWith(
        loadingHistory: false,
        loadingMore: false,
        error: 'Không tải được lịch sử đơn hàng',
      );
    }
  }

  Future<void> loadReviews({bool refresh = false}) async {
    if (refresh) {
      state = state.copyWith(
        loadingReviews: true,
        reviewCursor: null,
        reviewHasMore: true,
        error: null,
      );
    } else {
      state = state.copyWith(loadingMore: true, error: null);
    }

    try {
      final res = await _repo.fetchMyReviews(
        cursor: refresh ? null : state.reviewCursor,
      );

      state = state.copyWith(
        loadingReviews: false,
        loadingMore: false,
        reviewItems: refresh ? res.items : [...state.reviewItems, ...res.items],
        reviewCursor: res.nextCursor,
        reviewHasMore: res.hasMore,
      );
    } catch (e) {
      state = state.copyWith(
        loadingReviews: false,
        loadingMore: false,
        error: 'Không tải được danh sách đánh giá',
      );
    }
  }

  Future<void> loadDrafts({bool refresh = false}) async {
    if (refresh) {
      state = state.copyWith(
        loadingDrafts: true,
        draftCursor: null,
        draftHasMore: true,
        error: null,
      );
    } else {
      state = state.copyWith(loadingMore: true, error: null);
    }

    try {
      final res = await _repo.fetchDraftCarts(
        cursor: refresh ? null : state.draftCursor,
      );

      state = state.copyWith(
        loadingDrafts: false,
        loadingMore: false,
        draftItems: refresh ? res.items : [...state.draftItems, ...res.items],
        draftCursor: res.nextCursor,
        draftHasMore: res.hasMore,
      );
    } catch (e) {
      state = state.copyWith(
        loadingDrafts: false,
        loadingMore: false,
        error: 'Không tải được đơn nháp',
      );
    }
  }

  Future<void> clearAllDrafts() async {
    try {
      await _repo.clearAllDraftCarts();
      state = state.copyWith(
        draftItems: [],
        draftCursor: null,
        draftHasMore: false,
      );
      await loadCounts();
    } catch (e) {
      state = state.copyWith(error: 'Không xoá được đơn nháp');
    }
  }

  Future<void> refreshCountsOnly() async {
    await loadCounts();
  }

  Future<void> refreshActiveOnly() async {
    await loadActive(refresh: true);
  }

  Future<void> refreshOrderRealtime({
    String? orderId,
    bool refreshActive = true,
  }) async {
    await loadCounts();

    if (refreshActive &&
        (state.tab == MyOrderTab.active || state.activeItems.isNotEmpty)) {
      await loadActive(refresh: true);
    }
  }
}
