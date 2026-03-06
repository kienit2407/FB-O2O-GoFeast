import 'package:customer/core/network/dio_client.dart';
import 'package:customer/features/home/data/models/feed_home_model.dart';

class FeedRepository {
  final DioClient dio;
  FeedRepository(this.dio);

  Future<FeedHomeResponse> getHomeFeed({
    required double lat,
    required double lng,
    String orderType = 'delivery',
    int distanceKm = 7,
    int limitPerSection = 10,
  }) async {
    final res = await dio.get<dynamic>(
      '/feed/home',
      queryParameters: {
        'lat': lat,
        'lng': lng,
        'order_type': orderType,
        'distance_km': distanceKm,
        'limit_per_section': limitPerSection,
      },
      // guest được => không cần skipAuth
    );

    // handle both {data: {...}} hoặc trả thẳng {...}
    final raw = res.data;
    Map<String, dynamic> body;
    if (raw is Map && raw['sections'] != null) {
      body = Map<String, dynamic>.from(raw);
    } else if (raw is Map && raw['data'] is Map) {
      body = Map<String, dynamic>.from(raw['data'] as Map);
    } else {
      body = <String, dynamic>{};
    }

    return FeedHomeResponse.fromJson(body);
  }
}
