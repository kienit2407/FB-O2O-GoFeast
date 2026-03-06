import 'package:customer/core/services/location_service.dart';
import 'package:customer/features/addresses/data/models/saved_address_models.dart';
import 'package:customer/features/addresses/data/repository/address_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'address_state.dart';

class AddressController extends StateNotifier<AddressState> {
  AddressController({
    required AddressRepository repo,
    required LocationService loc,
    required Future<bool> Function() isLoggedIn,
  }) : _repo = repo,
       _loc = loc,
       _isLoggedIn = isLoggedIn,
       super(const AddressState.initial()) {
    load();
  }

  final AddressRepository _repo;
  final LocationService _loc;
  final Future<bool> Function() _isLoggedIn;

  // ✅ RAM cache theo session (kill app là mất)
  static CurrentLocation? _sessionCurrent;

  Future<void> load({bool force = false}) async {
    // ✅ 1) Nếu đã có current trong state và không force -> không gọi GPS nữa
    if (!force && state.current != null) {
      state = state.copyWith(isFetching: false, didLoad: true, error: null);
      await _syncSavedOnly();
      return;
    }

    // ✅ 2) Nếu state chưa có nhưng RAM cache có -> dùng cache
    if (!force && _sessionCurrent != null) {
      state = state.copyWith(
        isFetching: false,
        didLoad: true,
        current: _sessionCurrent,
        error: null,
      );
      await _syncSavedOnly();
      return;
    }

    // ✅ 3) Chỉ tới đây mới thật sự gọi GPS/reverse
    state = state.copyWith(isFetching: true, error: null);

    try {
      final pos = await _loc.getCurrentLocation();
      final addr = await _repo
          .reversePublic(lat: pos.lat, lng: pos.lng)
          .catchError((_) => null);

      final current = CurrentLocation(
        lat: pos.lat,
        lng: pos.lng,
        address: addr,
      );

      // ✅ lưu RAM cache
      _sessionCurrent = current;

      // update location lên BE nếu login (giữ như bạn)
      if (await _isLoggedIn()) {
        await _repo
            .updateMyLocation(lat: pos.lat, lng: pos.lng, address: addr)
            .catchError((_) {});
      }

      // list saved (giữ như bạn)
      List<SavedAddress> saved = const [];
      if (await _isLoggedIn()) {
        saved = await _repo.listMySavedAddresses();
      }

      state = state.copyWith(
        isFetching: false,
        didLoad: true,
        current: current,
        saved: saved,
      );
    } catch (e) {
      state = state.copyWith(
        isFetching: false,
        didLoad: true,
        error: e.toString(),
      );
    }
  }

  // ✅ chỉ sync saved, không đụng GPS
  Future<void> _syncSavedOnly() async {
    final loggedIn = await _isLoggedIn();
    if (!loggedIn) {
      // logout -> clear saved tránh dính data cũ
      if (state.saved.isNotEmpty) {
        state = state.copyWith(saved: const []);
      }
      return;
    }
    await reloadSaved();
  }

  Future<void> reloadSaved() async {
    if (!await _isLoggedIn()) return;
    try {
      final saved = await _repo.listMySavedAddresses();
      state = state.copyWith(saved: saved);
    } catch (_) {}
  }


  Future<void> createSaved({
    required String address,
    double? lat,
    double? lng,
    String? receiverName,
    String? receiverPhone,
    String? deliveryNote,
  }) async {
    if (!await _isLoggedIn()) return;

    await _repo.createMySavedAddress(
      address: address,
      lat: lat,
      lng: lng,
      receiverName: receiverName,
      receiverPhone: receiverPhone,
      deliveryNote: deliveryNote,
    );

    await reloadSaved();
  }
Future<void> useSavedAsCurrent(SavedAddress a) async {
    if (!await _isLoggedIn()) return;

    await _repo.useSavedAsCurrent(a.id);

    final cur = CurrentLocation(
      lat: a.lat ?? (state.current?.lat ?? 0),
      lng: a.lng ?? (state.current?.lng ?? 0),
      address: a.address,
    );

    // ✅ update state + RAM cache
    _sessionCurrent = cur;
    state = state.copyWith(current: cur);
  }
  Future<void> updateSaved(
    String id, {
    String? address,
    double? lat,
    double? lng,
    String? receiverName,
    String? receiverPhone,
    String? deliveryNote,
  }) async {
    if (!await _isLoggedIn()) return;

    await _repo.updateMySavedAddress(
      id,
      address: address,
      lat: lat,
      lng: lng,
      receiverName: receiverName,
      receiverPhone: receiverPhone,
      deliveryNote: deliveryNote,
    );

    await reloadSaved();
  }

  Future<void> deleteSaved(String id) async {
    if (!await _isLoggedIn()) return;

    await _repo.deleteMySavedAddress(id);
    await reloadSaved();
  }

  // /// Tap 1 địa chỉ đã lưu => set current_location ở BE + cập nhật UI current rồi pop về Home
  // Future<void> useSavedAsCurrent(SavedAddress a) async {
  //   if (!await _isLoggedIn()) return;

  //   await _repo.useSavedAsCurrent(a.id);

  //   // Update UI ngay (khỏi đợi load lại)
  //   state = state.copyWith(
  //     current: CurrentLocation(
  //       lat: a.lat ?? (state.current?.lat ?? 0),
  //       lng: a.lng ?? (state.current?.lng ?? 0),
  //       address: a.address,
  //     ),
  //   );
  // }
}
