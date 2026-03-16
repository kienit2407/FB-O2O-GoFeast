import 'package:geolocator/geolocator.dart';

class LocationResult {
  final double lat;
  final double lng;
  final double accuracy;
  final double? speed;

  LocationResult(this.lat, this.lng, {this.accuracy = 0, this.speed});
}

class LocationService {
  Future<bool> isLocationServiceEnabled() =>
      Geolocator.isLocationServiceEnabled();

  Future<LocationPermission> checkPermission() => Geolocator.checkPermission();

  Future<LocationPermission> requestPermission() =>
      Geolocator.requestPermission();

  Future<void> ensurePermission() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      throw Exception('Location service is disabled');
    }

    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }

    if (perm == LocationPermission.denied) {
      throw Exception('Location permission denied');
    }

    if (perm == LocationPermission.deniedForever) {
      throw Exception('Location permission denied forever');
    }
  }

  Future<LocationResult> getCurrentLocation() async {
    await ensurePermission();

    final pos = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    return LocationResult(
      pos.latitude,
      pos.longitude,
      accuracy: pos.accuracy,
      speed: pos.speed,
    );
  }

  Stream<LocationResult> getPositionStream({
    LocationAccuracy accuracy = LocationAccuracy.high,
    int distanceFilter = 5,
  }) async* {
    await ensurePermission();

    final settings = LocationSettings(
      accuracy: accuracy,
      distanceFilter: distanceFilter,
    );

    yield* Geolocator.getPositionStream(locationSettings: settings).map(
      (pos) => LocationResult(
        pos.latitude,
        pos.longitude,
        accuracy: pos.accuracy,
        speed: pos.speed,
      ),
    );
  }

  double distanceMeters({
    required double startLat,
    required double startLng,
    required double endLat,
    required double endLng,
  }) {
    return Geolocator.distanceBetween(startLat, startLng, endLat, endLng);
  }
}
