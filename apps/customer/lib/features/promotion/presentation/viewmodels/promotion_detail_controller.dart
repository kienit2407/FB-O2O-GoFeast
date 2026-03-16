import 'package:customer/features/promotion/data/repository/promotion_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'promotion_detail_state.dart';

class PromotionDetailController extends StateNotifier<PromotionDetailState> {
  PromotionDetailController(this._repo, this.promotionId)
    : super(const PromotionDetailState());

  final PromotionRepository _repo;
  final String promotionId;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final res = await _repo.getPromotionDetail(promotionId);
      state = state.copyWith(isLoading: false, detail: res);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> saveVoucher(String voucherId) async {
    state = state.copyWith(isSaving: true, clearError: true);

    try {
      await _repo.saveVoucher(voucherId);
      final refreshed = await _repo.getPromotionDetail(promotionId);
      state = state.copyWith(isSaving: false, detail: refreshed);
      return true;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      return false;
    }
  }

  Future<bool> unsaveVoucher(String voucherId) async {
    state = state.copyWith(isSaving: true, clearError: true);

    try {
      await _repo.unsaveVoucher(voucherId);
      final refreshed = await _repo.getPromotionDetail(promotionId);
      state = state.copyWith(isSaving: false, detail: refreshed);
      return true;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      return false;
    }
  }
}

class MyVouchersController extends StateNotifier<MyVouchersState> {
  MyVouchersController(this._repo) : super(const MyVouchersState());

  final PromotionRepository _repo;

  Future<void> loadInitial() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final (items, nextCursor) = await _repo.listSavedVouchers();
      state = state.copyWith(
        isLoading: false,
        items: items,
        nextCursor: nextCursor ?? '',
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> refresh() async {
    try {
      final (items, nextCursor) = await _repo.listSavedVouchers();
      state = state.copyWith(
        items: items,
        nextCursor: nextCursor ?? '',
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore) return;

    state = state.copyWith(isLoadingMore: true);

    try {
      final (items, nextCursor) = await _repo.listSavedVouchers(
        cursor: state.nextCursor,
      );

      state = state.copyWith(
        isLoadingMore: false,
        items: [...state.items, ...items],
        nextCursor: nextCursor ?? '',
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }
}
