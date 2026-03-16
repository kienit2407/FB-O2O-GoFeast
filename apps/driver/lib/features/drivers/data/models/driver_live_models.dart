import 'package:driver/features/auth/data/models/driver_models.dart';

class DriverLiveStateResponse {
  final DriverVerificationStatus verificationStatus;
  final bool acceptFoodOrders;
  final double? lat;
  final double? lng;
  final DateTime? lastLocationUpdate;

  const DriverLiveStateResponse({
    required this.verificationStatus,
    required this.acceptFoodOrders,
    this.lat,
    this.lng,
    this.lastLocationUpdate,
  });

  factory DriverLiveStateResponse.fromJson(Map<String, dynamic> j) {
    final loc = j['current_location'];
    List? coords;

    if (loc is Map && loc['coordinates'] is List) {
      coords = loc['coordinates'] as List;
    }

    double? lat;
    double? lng;

    if (coords != null && coords.length >= 2) {
      lng = (coords[0] as num?)?.toDouble();
      lat = (coords[1] as num?)?.toDouble();
    }

    return DriverLiveStateResponse(
      verificationStatus: parseDriverStatus(
        (j['verification_status'] ?? '').toString(),
      ),
      acceptFoodOrders: j['accept_food_orders'] == true,
      lat: lat,
      lng: lng,
      lastLocationUpdate: j['last_location_update'] != null
          ? DateTime.tryParse(j['last_location_update'].toString())
          : null,
    );
  }
}

class DriverLocationAck {
  final double? lat;
  final double? lng;
  final DateTime? lastLocationUpdate;

  const DriverLocationAck({this.lat, this.lng, this.lastLocationUpdate});

  factory DriverLocationAck.fromJson(Map<String, dynamic> j) {
    final loc = j['current_location'];
    List? coords;

    if (loc is Map && loc['coordinates'] is List) {
      coords = loc['coordinates'] as List;
    }

    double? lat;
    double? lng;

    if (coords != null && coords.length >= 2) {
      lng = (coords[0] as num?)?.toDouble();
      lat = (coords[1] as num?)?.toDouble();
    }

    return DriverLocationAck(
      lat: lat,
      lng: lng,
      lastLocationUpdate: j['last_location_update'] != null
          ? DateTime.tryParse(j['last_location_update'].toString())
          : null,
    );
  }
}
