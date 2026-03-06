import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repository/favorite_merchant_repository.dart';
import 'favorite_merchant_state.dart';

class FavoriteMerchantToggleController
    extends StateNotifier<FavoriteMerchantToggleState> {
  FavoriteMerchantToggleController(this._repo, this.merchantId)
    : super(const FavoriteMerchantToggleState());

  final FavoriteMerchantRepository _repo;
  final String merchantId;

  bool _inited = false;

  // sync từ merchant detail viewer.isFavorited (chỉ 1 lần)
  void setInitial(bool v) {
    if (_inited) return;
    _inited = true;
    state = state.copyWith(isFavorited: v);
  }

  Future<void> toggle() async {
    if (state.isToggling) return;

    final prev = state.isFavorited;
    final next = !prev;

    // optimistic
    state = state.copyWith(
      isFavorited: next,
      isToggling: true,
      clearError: true,
    );

    try {
      final res = next
          ? await _repo.favorite(merchantId: merchantId)
          : await _repo.unfavorite(merchantId: merchantId);

      state = state.copyWith(isFavorited: res.isFavorited, isToggling: false);
    } catch (e) {
      // revert
      state = state.copyWith(
        isFavorited: prev,
        isToggling: false,
        error: e.toString(),
      );
    }
  }
}

class FavoriteMerchantsController
    extends StateNotifier<FavoriteMerchantsState> {
  FavoriteMerchantsController(this._repo)
    : super(const FavoriteMerchantsState()) {
    unawaited(load());
  }

  final FavoriteMerchantRepository _repo;

  Future<void> load({int limit = 10}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res = await _repo.listMyFavorites(limit: limit);
      state = state.copyWith(
        isLoading: false,
        items: res.items,
        nextCursor: res.nextCursor,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> unfavoriteAndRefresh(String merchantId) async {
    try {
      await _repo.unfavorite(merchantId: merchantId);
      await load(); // reload list
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> loadMore({int limit = 10}) async {
    final cursor = state.nextCursor;
    if (state.isLoadingMore || cursor == null || cursor.isEmpty) return;

    state = state.copyWith(isLoadingMore: true, clearError: true);
    try {
      final res = await _repo.listMyFavorites(limit: limit, cursor: cursor);
      state = state.copyWith(
        isLoadingMore: false,
        items: [...state.items, ...res.items],
        nextCursor: res.nextCursor,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }
}
