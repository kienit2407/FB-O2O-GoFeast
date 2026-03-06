// cart_state.dart
import '../../data/models/cart_models.dart';

class CartState {
  final bool isLoadingSummary;
  final bool isLoadingCart;
  final bool isUpdating;
  final String? error;

  /// Summary luôn có (để vẽ bottom bar)
  final CartTotals summary;
  final String? cartIdFromSummary;

  /// Current cart (items) chỉ load khi cần (ví dụ mở bottomsheet)
  final CartResponse? current;

  const CartState({
    this.isLoadingSummary = false,
    this.isLoadingCart = false,
    this.isUpdating = false,
    this.error,
    this.summary = const CartTotals.zero(),
    this.cartIdFromSummary,
    this.current,
  });

  CartState copyWith({
    bool? isLoadingSummary,
    bool? isLoadingCart,
    bool? isUpdating,
    String? error,
    CartTotals? summary,
    String? cartIdFromSummary,
    CartResponse? current,
    bool clearError = false,
  }) {
    return CartState(
      isLoadingSummary: isLoadingSummary ?? this.isLoadingSummary,
      isLoadingCart: isLoadingCart ?? this.isLoadingCart,
      isUpdating: isUpdating ?? this.isUpdating,
      error: clearError ? null : (error ?? this.error),
      summary: summary ?? this.summary,
      cartIdFromSummary: cartIdFromSummary ?? this.cartIdFromSummary,
      current: current ?? this.current,
    );
  }
}
