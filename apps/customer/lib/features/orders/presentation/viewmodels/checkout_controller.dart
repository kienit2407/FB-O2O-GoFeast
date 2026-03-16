import 'dart:async';
import 'package:customer/features/orders/data/repository/checkout_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/checkout_models.dart';
import 'checkout_state.dart';

class CheckoutController extends StateNotifier<CheckoutState> {
  CheckoutController(this._repo, this.params) : super(const CheckoutState());

  final CheckoutRepository _repo;
  final CheckoutParams params;

  void setPaymentMethod(CheckoutPaymentMethod method) {
    state = state.copyWith(paymentMethod: method, clearError: true);
  }

  void setVoucherCode(String value) {
    state = state.copyWith(voucherCode: value, clearError: true);
  }

  void setOrderNote(String value) {
    state = state.copyWith(orderNote: value, clearError: true);
  }

  void setDeliveryAddress({
    required double lat,
    required double lng,
    required String address,
    required String receiverName,
    required String receiverPhone,
    String addressNote = '',
  }) {
    state = state.copyWith(
      lat: lat,
      lng: lng,
      address: address,
      receiverName: receiverName,
      receiverPhone: receiverPhone,
      addressNote: addressNote,
      clearError: true,
    );
  }

  Future<void> loadPreview() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final res = await _repo.preview(
        params: params,
        lat: state.lat,
        lng: state.lng,
        address: state.address,
        receiverName: state.receiverName,
        receiverPhone: state.receiverPhone,
        addressNote: state.addressNote,
        paymentMethod: state.paymentMethod,
        voucherCode: state.voucherCode.trim().isEmpty
            ? null
            : state.voucherCode.trim(),
      );

      state = state.copyWith(isLoading: false, preview: res);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> refreshPreview() => loadPreview();

  Future<void> applyVoucher(String code) async {
    state = state.copyWith(voucherCode: code, clearError: true);
    await loadPreview();
  }

  Future<void> removeVoucher() async {
    state = state.copyWith(voucherCode: '', clearError: true);
    await loadPreview();
  }

  Future<PlaceOrderResponse?> placeOrder() async {
    if (params.mode == CheckoutMode.delivery) {
      if (state.lat == null || state.lng == null) {
        state = state.copyWith(error: 'Thiếu toạ độ giao hàng');
        return null;
      }
      if (state.address.trim().isEmpty) {
        state = state.copyWith(error: 'Thiếu địa chỉ giao hàng');
        return null;
      }
      if (state.receiverName.trim().isEmpty) {
        state = state.copyWith(error: 'Thiếu tên người nhận');
        return null;
      }
      if (state.receiverPhone.trim().isEmpty) {
        state = state.copyWith(error: 'Thiếu số điện thoại người nhận');
        return null;
      }
    }

    state = state.copyWith(
      isPlacing: true,
      clearError: true,
      clearPlacedOrder: true,
    );

    try {
      final res = await _repo.placeOrder(
        params: params,
        lat: state.lat,
        lng: state.lng,
        address: state.address,
        receiverName: state.receiverName,
        receiverPhone: state.receiverPhone,
        addressNote: state.addressNote,
        orderNote: state.orderNote.trim(),
        paymentMethod: state.paymentMethod,
        voucherCode: state.voucherCode.trim().isEmpty
            ? null
            : state.voucherCode.trim(),
      );

      state = state.copyWith(isPlacing: false, placedOrder: res);

      return res;
    } catch (e) {
      state = state.copyWith(isPlacing: false, error: e.toString());
      return null;
    }
  }
}
