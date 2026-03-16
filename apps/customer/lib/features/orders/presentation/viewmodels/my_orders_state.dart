import 'package:flutter/foundation.dart';
import 'package:customer/features/orders/data/models/my_order_models.dart';

@immutable
class MyOrdersState {
  final MyOrderTab tab;
  final MyOrdersTabCounts counts;

  final List<MyOrderListItem> activeItems;
  final List<MyOrderListItem> historyItems;
  final List<MyReviewListItem> reviewItems;
  final List<MyDraftCartItem> draftItems;

  final String? activeCursor;
  final String? historyCursor;
  final String? reviewCursor;
  final String? draftCursor;

  final bool activeHasMore;
  final bool historyHasMore;
  final bool reviewHasMore;
  final bool draftHasMore;

  final bool loadingCounts;
  final bool loadingActive;
  final bool loadingHistory;
  final bool loadingReviews;
  final bool loadingDrafts;
  final bool loadingMore;

  final String? error;

  const MyOrdersState({
    required this.tab,
    required this.counts,
    required this.activeItems,
    required this.historyItems,
    required this.reviewItems,
    required this.draftItems,
    required this.activeCursor,
    required this.historyCursor,
    required this.reviewCursor,
    required this.draftCursor,
    required this.activeHasMore,
    required this.historyHasMore,
    required this.reviewHasMore,
    required this.draftHasMore,
    required this.loadingCounts,
    required this.loadingActive,
    required this.loadingHistory,
    required this.loadingReviews,
    required this.loadingDrafts,
    required this.loadingMore,
    required this.error,
  });

  factory MyOrdersState.initial() {
    return const MyOrdersState(
      tab: MyOrderTab.active,
      counts: MyOrdersTabCounts.zero(),
      activeItems: [],
      historyItems: [],
      reviewItems: [],
      draftItems: [],
      activeCursor: null,
      historyCursor: null,
      reviewCursor: null,
      draftCursor: null,
      activeHasMore: true,
      historyHasMore: true,
      reviewHasMore: true,
      draftHasMore: true,
      loadingCounts: false,
      loadingActive: false,
      loadingHistory: false,
      loadingReviews: false,
      loadingDrafts: false,
      loadingMore: false,
      error: null,
    );
  }

  MyOrdersState copyWith({
    MyOrderTab? tab,
    MyOrdersTabCounts? counts,
    List<MyOrderListItem>? activeItems,
    List<MyOrderListItem>? historyItems,
    List<MyReviewListItem>? reviewItems,
    List<MyDraftCartItem>? draftItems,
    Object? activeCursor = _sentinel,
    Object? historyCursor = _sentinel,
    Object? reviewCursor = _sentinel,
    Object? draftCursor = _sentinel,
    bool? activeHasMore,
    bool? historyHasMore,
    bool? reviewHasMore,
    bool? draftHasMore,
    bool? loadingCounts,
    bool? loadingActive,
    bool? loadingHistory,
    bool? loadingReviews,
    bool? loadingDrafts,
    bool? loadingMore,
    Object? error = _sentinel,
  }) {
    return MyOrdersState(
      tab: tab ?? this.tab,
      counts: counts ?? this.counts,
      activeItems: activeItems ?? this.activeItems,
      historyItems: historyItems ?? this.historyItems,
      reviewItems: reviewItems ?? this.reviewItems,
      draftItems: draftItems ?? this.draftItems,
      activeCursor: activeCursor == _sentinel
          ? this.activeCursor
          : activeCursor as String?,
      historyCursor: historyCursor == _sentinel
          ? this.historyCursor
          : historyCursor as String?,
      reviewCursor: reviewCursor == _sentinel
          ? this.reviewCursor
          : reviewCursor as String?,
      draftCursor: draftCursor == _sentinel
          ? this.draftCursor
          : draftCursor as String?,
      activeHasMore: activeHasMore ?? this.activeHasMore,
      historyHasMore: historyHasMore ?? this.historyHasMore,
      reviewHasMore: reviewHasMore ?? this.reviewHasMore,
      draftHasMore: draftHasMore ?? this.draftHasMore,
      loadingCounts: loadingCounts ?? this.loadingCounts,
      loadingActive: loadingActive ?? this.loadingActive,
      loadingHistory: loadingHistory ?? this.loadingHistory,
      loadingReviews: loadingReviews ?? this.loadingReviews,
      loadingDrafts: loadingDrafts ?? this.loadingDrafts,
      loadingMore: loadingMore ?? this.loadingMore,
      error: error == _sentinel ? this.error : error as String?,
    );
  }
}

const _sentinel = Object();
