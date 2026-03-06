import '../../data/model/favorite_merchant_models.dart';

class FavoriteMerchantToggleState {
  final bool isFavorited;
  final bool isToggling;
  final String? error;

  const FavoriteMerchantToggleState({
    this.isFavorited = false,
    this.isToggling = false,
    this.error,
  });

  FavoriteMerchantToggleState copyWith({
    bool? isFavorited,
    bool? isToggling,
    String? error,
    bool clearError = false,
  }) {
    return FavoriteMerchantToggleState(
      isFavorited: isFavorited ?? this.isFavorited,
      isToggling: isToggling ?? this.isToggling,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class FavoriteMerchantsState {
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;

  final List<FavoriteMerchantItem> items;
  final String? nextCursor;

  const FavoriteMerchantsState({
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.items = const [],
    this.nextCursor,
  });

  FavoriteMerchantsState copyWith({
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
    bool clearError = false,
    List<FavoriteMerchantItem>? items,
    String? nextCursor,
  }) {
    return FavoriteMerchantsState(
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: clearError ? null : (error ?? this.error),
      items: items ?? this.items,
      nextCursor: nextCursor ?? this.nextCursor,
    );
  }
}
