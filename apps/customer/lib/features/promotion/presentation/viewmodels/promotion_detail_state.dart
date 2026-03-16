
import 'package:customer/features/promotion/data/models/promotion_models.dart';

class PromotionDetailState {
  final bool isLoading;
  final bool isSaving;
  final String? error;
  final PromotionDetailResponse? detail;

  const PromotionDetailState({
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.detail,
  });

  PromotionDetailState copyWith({
    bool? isLoading,
    bool? isSaving,
    String? error,
    PromotionDetailResponse? detail,
    bool clearError = false,
  }) {
    return PromotionDetailState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: clearError ? null : (error ?? this.error),
      detail: detail ?? this.detail,
    );
  }
}

class MyVouchersState {
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;
  final List<SavedVoucherItem> items;
  final String? nextCursor;

  const MyVouchersState({
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.items = const [],
    this.nextCursor,
  });

  MyVouchersState copyWith({
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
    List<SavedVoucherItem>? items,
    String? nextCursor,
    bool clearError = false,
  }) {
    return MyVouchersState(
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: clearError ? null : (error ?? this.error),
      items: items ?? this.items,
      nextCursor: nextCursor ?? this.nextCursor,
    );
  }

  bool get hasMore => nextCursor != null && nextCursor!.isNotEmpty;
}