import 'dart:async';

import 'package:driver/core/services/location_service.dart';
import 'package:driver/features/drivers/data/repository/driver_live_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'driver_live_state.dart';

class DriverLiveController extends StateNotifier<DriverLiveState> {
  DriverLiveController({
    required DriverLiveRepository repo,
    required LocationService locationService,
  }) : _repo = repo,
       _locationService = locationService,
       super(const DriverLiveState()) {
    bootstrap();
  }

  final DriverLiveRepository _repo;
  final LocationService _locationService;

  StreamSubscription<LocationResult>? _sub;

  LocationResult? _lastRawPoint;
  LocationResult? _lastSentPoint;
  DateTime? _lastSentAt;
  bool _sendingNow = false;

  static const int _minSendSeconds = 5;
  static const double _minDistanceMeters = 20;
  static const int _heartbeatSeconds = 25;
  static const double _maxAcceptedAccuracy = 35;

  Future<void> bootstrap() async {
    state = state.copyWith(isBootstrapping: true, clearError: true);

    try {
      final live = await _repo.getMyLiveState();

      state = state.copyWith(
        isBootstrapping: false,
        acceptFoodOrders: live.acceptFoodOrders,
        verificationStatus: live.verificationStatus,
        lat: live.lat,
        lng: live.lng,
        lastLocationUpdate: live.lastLocationUpdate,
      );

      if (live.acceptFoodOrders && live.verificationStatus.name == 'approved') {
        await startTracking();
      }
    } catch (e) {
      state = state.copyWith(isBootstrapping: false, error: e.toString());
    }
  }

  Future<void> refreshLiveState() async {
    try {
      final live = await _repo.getMyLiveState();

      state = state.copyWith(
        acceptFoodOrders: live.acceptFoodOrders,
        verificationStatus: live.verificationStatus,
        lat: live.lat,
        lng: live.lng,
        lastLocationUpdate: live.lastLocationUpdate,
      );

      if (live.acceptFoodOrders && live.verificationStatus.name == 'approved') {
        await startTracking();
      } else {
        await stopTracking();
      }
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> setAvailability(bool value) async {
    if (state.isUpdatingAvailability) return;
    if (!state.canGoOnline && value) {
      state = state.copyWith(
        error: 'Tài khoản chưa được duyệt nên chưa thể bật nhận chuyến',
      );
      return;
    }

    state = state.copyWith(isUpdatingAvailability: true, clearError: true);

    try {
      await _repo.setAvailability(value);

      state = state.copyWith(
        isUpdatingAvailability: false,
        acceptFoodOrders: value,
      );

      if (value) {
        await startTracking();
        await sendCurrentLocationNow();
      } else {
        await stopTracking();
      }
    } catch (e) {
      state = state.copyWith(
        isUpdatingAvailability: false,
        error: e.toString(),
      );
    }
  }

  Future<void> startTracking() async {
    if (_sub != null) return;
    if (!state.acceptFoodOrders) return;
    if (!state.canGoOnline) return;

    state = state.copyWith(isTracking: true, clearError: true);

    try {
      _sub = _locationService
          .getPositionStream(distanceFilter: 5)
          .listen(
            (point) async {
              await _handlePoint(point);
            },
            onError: (e) {
              state = state.copyWith(isTracking: false, error: e.toString());
            },
          );
    } catch (e) {
      state = state.copyWith(isTracking: false, error: e.toString());
    }
  }

  Future<void> stopTracking() async {
    await _sub?.cancel();
    _sub = null;

    _lastRawPoint = null;
    _lastSentPoint = null;
    _lastSentAt = null;
    _sendingNow = false;

    state = state.copyWith(isTracking: false, isSendingLocation: false);
  }

  Future<void> sendCurrentLocationNow() async {
    try {
      final point = await _locationService.getCurrentLocation();
      await _sendLocation(point, force: true);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> _handlePoint(LocationResult point) async {
    _lastRawPoint = point;

    state = state.copyWith(
      lat: point.lat,
      lng: point.lng,
      accuracy: point.accuracy,
    );

    if (!state.acceptFoodOrders || !state.canGoOnline) return;
    if (_sendingNow) return;

    if (!_shouldSend(point)) return;

    await _sendLocation(point);
  }

  bool _shouldSend(LocationResult next) {
    if (next.accuracy > _maxAcceptedAccuracy) {
      return false;
    }

    if (_lastSentPoint == null || _lastSentAt == null) {
      return true;
    }

    final now = DateTime.now();
    final secondsSinceLast = now.difference(_lastSentAt!).inSeconds;

    final distance = _locationService.distanceMeters(
      startLat: _lastSentPoint!.lat,
      startLng: _lastSentPoint!.lng,
      endLat: next.lat,
      endLng: next.lng,
    );

    final movedEnough = distance >= _minDistanceMeters;
    final minIntervalReached = secondsSinceLast >= _minSendSeconds;
    final heartbeatDue = secondsSinceLast >= _heartbeatSeconds;

    if (heartbeatDue) return true;
    if (movedEnough && minIntervalReached) return true;

    return false;
  }

  Future<void> _sendLocation(LocationResult point, {bool force = false}) async {
    if (_sendingNow) return;

    if (!force && point.accuracy > _maxAcceptedAccuracy) return;

    _sendingNow = true;
    state = state.copyWith(isSendingLocation: true, clearError: true);

    try {
      final ack = await _repo.updateLocation(lat: point.lat, lng: point.lng);

      _lastSentPoint = point;
      _lastSentAt = DateTime.now();

      state = state.copyWith(
        isSendingLocation: false,
        lat: ack.lat ?? point.lat,
        lng: ack.lng ?? point.lng,
        accuracy: point.accuracy,
        lastLocationUpdate: ack.lastLocationUpdate ?? DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(isSendingLocation: false, error: e.toString());
    } finally {
      _sendingNow = false;
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
