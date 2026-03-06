import 'dart:async';
import 'package:customer/features/addresses/data/models/reverse_suggest_models.dart';
import 'package:customer/features/addresses/data/repository/address_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'choose_address_state.dart';

class ChooseAddressController extends StateNotifier<ChooseAddressState> {
  ChooseAddressController({required AddressRepository repo})
    : _repo = repo,
      super(const ChooseAddressState.initial());

  final AddressRepository _repo;

  Timer? _debounce;
  CancelToken? _cancel;

  /// Gọi khi pin/camera center thay đổi (onCameraIdle hoặc throttled onCameraMove)
  void setCenter(double lat, double lng) {
    state = state.copyWith(lat: lat, lng: lng, error: null);

    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _fetchReverse(lat, lng);
    });
  }

  Future<void> _fetchReverse(double lat, double lng) async {
    _cancel?.cancel('new request');
    _cancel = CancelToken();
    state = state.copyWith(isLoading: true, error: null);

    try {
      final reverse = await _repo.reverseSuggestPublic(
        lat: lat,
        lng: lng,
        size: 5,
        radius: 120,
        cancelToken: _cancel,
      );

      final nearby = await _repo.nearbyPublic(
        lat: lat,
        lng: lng,
        radius: 350,
        size: 12,
        type: 'restaurant|cafe|convenience_store|pharmacy',
        cancelToken: _cancel,
      );

      // merge + dedupe
      final merged = <ReverseSuggestItem>[];
      final seen = <String>{};

      void addItem(ReverseSuggestItem it) {
        final key = (it.placeId?.trim().isNotEmpty == true)
            ? 'pid:${it.placeId}'
            : 'addr:${it.address.trim().toLowerCase()}';
        if (seen.add(key)) merged.add(it);
      }

      for (final it in reverse.items) addItem(it);
      for (final it in nearby) addItem(it);

      state = state.copyWith(
        isLoading: false,
        pinnedAddress: reverse.address,
        suggestions: merged,
      );
    } catch (e) {
      if (e is DioException && CancelToken.isCancel(e)) return;
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _cancel?.cancel('dispose');
    super.dispose();
  }
}
