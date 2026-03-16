// cart_controller.dart
import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/cart_repository.dart';
import '../../data/models/cart_models.dart';
import 'cart_state.dart';

class CartController extends StateNotifier<CartState> {
  CartController(this._repo, this.params) : super(const CartState()) {
    // vào merchant chỉ load summary (nhẹ, không tạo cart rỗng)
    unawaited(loadSummary());
  }

  final CartRepository _repo;
  final CartParams params;

  // ===== LOADERS =====

  Future<void> loadSummary({bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoadingSummary: true, clearError: true);
    }
    try {
      final res = await _repo.getSummary(params: params);
      state = state.copyWith(
        isLoadingSummary: false,
        summary: res.summary,
        cartIdFromSummary: res.cartId,
      );
    } catch (e) {
      state = state.copyWith(isLoadingSummary: false, error: e.toString());
    }
  }

  Future<void> loadCurrent({bool force = false}) async {
    if (!force && state.current != null) return;
    state = state.copyWith(isLoadingCart: true, clearError: true);
    try {
      final res = await _repo.getCurrent(params: params);
      state = state.copyWith(
        isLoadingCart: false,
        current: res,
        summary: res.summary,
        cartIdFromSummary: res.cart.id,
      );
    } catch (e) {
      state = state.copyWith(isLoadingCart: false, error: e.toString());
    }
  }

  Future<void> ensureCurrentLoaded() => loadCurrent(force: false);

  void dropCurrent() {
    // gọi khi đóng bottomsheet nếu muốn nhẹ memory
    state = state.copyWith(current: null);
  }

  // ===== MUTATIONS =====

  Future<void> addProduct({
    required String productId,
    int quantity = 1,
    List<Map<String, String>> selectedOptions = const [],
    List<Map<String, dynamic>> selectedToppings = const [],
    String note = '',
  }) async {
    state = state.copyWith(isUpdating: true, clearError: true);
    try {
      final res = await _repo.addItem(
        params: params,
        body: {
          'item_type': 'product',
          'product_id': productId,
          'quantity': quantity,
          'selected_options': selectedOptions,
          'selected_toppings': selectedToppings,
          'note': note,
        },
      );

      state = state.copyWith(
        isUpdating: false,
        current: res, // có items luôn
        summary: res.summary,
        cartIdFromSummary: res.cart.id,
      );
    } catch (e) {
      state = state.copyWith(isUpdating: false, error: e.toString());
    }
  }

  Future<void> addToppingStandalone({
    required String toppingId,
    int quantity = 1,
    String note = '',
  }) async {
    state = state.copyWith(isUpdating: true, clearError: true);
    try {
      final res = await _repo.addItem(
        params: params,
        body: {
          'item_type': 'topping',
          'topping_id': toppingId,
          'quantity': quantity,
          'note': note,
        },
      );

      state = state.copyWith(
        isUpdating: false,
        current: res,
        summary: res.summary,
        cartIdFromSummary: res.cart.id,
      );
    } catch (e) {
      state = state.copyWith(isUpdating: false, error: e.toString());
    }
  }

  Future<void> updateQty(String lineKey, int quantity) async {
    if (quantity < 1) {
      await removeLine(lineKey);
      return;
    }

    state = state.copyWith(isUpdating: true, clearError: true);
    try {
      final res = await _repo.updateItem(
        params: params,
        lineKey: lineKey,
        body: {'quantity': quantity},
      );

      state = state.copyWith(
        isUpdating: false,
        current: res,
        summary: res.summary,
        cartIdFromSummary: res.cart.id,
      );
    } catch (e) {
      state = state.copyWith(isUpdating: false, error: e.toString());
    }
  }

  Future<void> updateNote(String lineKey, String note) async {
    state = state.copyWith(isUpdating: true, clearError: true);
    try {
      final res = await _repo.updateItem(
        params: params,
        lineKey: lineKey,
        body: {'note': note},
      );

      state = state.copyWith(
        isUpdating: false,
        current: res,
        summary: res.summary,
        cartIdFromSummary: res.cart.id,
      );
    } catch (e) {
      state = state.copyWith(isUpdating: false, error: e.toString());
    }
  }

  Future<void> removeLine(String lineKey) async {
    state = state.copyWith(isUpdating: true, clearError: true);
    try {
      final res = await _repo.removeItem(params: params, lineKey: lineKey);

      state = state.copyWith(
        isUpdating: false,
        current: res,
        summary: res.summary,
        cartIdFromSummary: res.cart.id,
      );
    } catch (e) {
      state = state.copyWith(isUpdating: false, error: e.toString());
    }
  }

  Future<void> clearAll() async {
    state = state.copyWith(isUpdating: true, clearError: true);
    try {
      final res = await _repo.clear(params: params);

      state = state.copyWith(
        isUpdating: false,
        current: res,
        summary: res.summary,
        cartIdFromSummary: res.cart.id,
      );
    } catch (e) {
      state = state.copyWith(isUpdating: false, error: e.toString());
    }
  }
}
