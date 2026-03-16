import 'package:customer/features/orders/data/models/customer_my_reviews_models.dart';


class CustomerMyReviewsState {
  final bool loading;
  final bool loadingMore;
  final String? error;
  final CustomerMyReviewType selectedType;
  final CustomerMyReviewsSummary? summary;
  final List<CustomerMyReviewItem> items;
  final String? nextCursor;
  final bool hasMore;
  final Set<String> deletingIds;

  const CustomerMyReviewsState({
    required this.loading,
    required this.loadingMore,
    required this.error,
    required this.selectedType,
    required this.summary,
    required this.items,
    required this.nextCursor,
    required this.hasMore,
    required this.deletingIds,
  });

  factory CustomerMyReviewsState.initial() {
    return const CustomerMyReviewsState(
      loading: false,
      loadingMore: false,
      error: null,
      selectedType: CustomerMyReviewType.all,
      summary: null,
      items: [],
      nextCursor: null,
      hasMore: false,
      deletingIds: {},
    );
  }

  CustomerMyReviewsState copyWith({
    bool? loading,
    bool? loadingMore,
    String? error,
    bool clearError = false,
    CustomerMyReviewType? selectedType,
    CustomerMyReviewsSummary? summary,
    List<CustomerMyReviewItem>? items,
    String? nextCursor,
    bool? hasMore,
    Set<String>? deletingIds,
  }) {
    return CustomerMyReviewsState(
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      error: clearError ? null : (error ?? this.error),
      selectedType: selectedType ?? this.selectedType,
      summary: summary ?? this.summary,
      items: items ?? this.items,
      nextCursor: nextCursor ?? this.nextCursor,
      hasMore: hasMore ?? this.hasMore,
      deletingIds: deletingIds ?? this.deletingIds,
    );
  }
}