import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repository/merchant_detail_repository.dart';
import 'merchant_detail_state.dart';

class MerchantDetailParams {
  final String merchantId;
  final double lat;
  final double lng;

  const MerchantDetailParams({
    required this.merchantId,
    required this.lat,
    required this.lng,
  });

  @override
  bool operator ==(Object other) {
    return other is MerchantDetailParams &&
        other.merchantId == merchantId &&
        other.lat == lat &&
        other.lng == lng;
  }

  @override
  int get hashCode => Object.hash(merchantId, lat, lng);
}

class MerchantDetailController extends StateNotifier<MerchantDetailState> {
  MerchantDetailController(this._repo, this.params)
      : super(const MerchantDetailState()) {
    unawaited(load());
  }

  final MerchantDetailRepository _repo;
  final MerchantDetailParams params;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _repo.getDetail(
        merchantId: params.merchantId,
        lat: params.lat,
        lng: params.lng,
      );
      state = state.copyWith(isLoading: false, data: data);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> retry() => load();
}