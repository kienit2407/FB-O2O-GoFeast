import 'package:dio/dio.dart';
import 'package:driver/features/drivers/data/models/driver_live_models.dart';

class DriverLiveRepository {
  DriverLiveRepository(this._dio);
  final Dio _dio;

  static const String liveStateEndpoint = '/drivers/me/live-state';
  static const String availabilityEndpoint = '/drivers/me/availability';
  static const String locationEndpoint = '/drivers/me/location';

  String _unwrapMessage(Object? errData) {
    if (errData is Map) {
      final msg = errData['message'];
      if (msg is String) return msg;
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
    }
    return 'Request failed';
  }

  Never _throwDio(DioException e) {
    throw Exception(_unwrapMessage(e.response?.data));
  }

  Future<DriverLiveStateResponse> getMyLiveState() async {
    try {
      final res = await _dio.get(liveStateEndpoint);
      final body = res.data;

      if (body is Map && body['data'] is Map) {
        return DriverLiveStateResponse.fromJson(
          Map<String, dynamic>.from(body['data'] as Map),
        );
      }

      throw Exception('Invalid live-state response');
    } on DioException catch (e) {
      _throwDio(e);
    }
  }

  Future<void> setAvailability(bool acceptFoodOrders) async {
    try {
      await _dio.patch(
        availabilityEndpoint,
        data: {'acceptFoodOrders': acceptFoodOrders},
      );
    } on DioException catch (e) {
      _throwDio(e);
    }
  }

  Future<DriverLocationAck> updateLocation({
    required double lat,
    required double lng,
  }) async {
    try {
      final res = await _dio.post(
        locationEndpoint,
        data: {'lat': lat, 'lng': lng},
      );

      final body = res.data;
      if (body is Map && body['data'] is Map) {
        return DriverLocationAck.fromJson(
          Map<String, dynamic>.from(body['data'] as Map),
        );
      }

      throw Exception('Invalid update-location response');
    } on DioException catch (e) {
      _throwDio(e);
    }
  }
}
