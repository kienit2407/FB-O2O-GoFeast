import 'package:customer/core/network/dio_client.dart';
import '../model/favorite_merchant_models.dart';

class FavoriteMerchantRepository {
  FavoriteMerchantRepository(this._dio);
  final DioClient _dio;

  Map<String, dynamic> _unwrap(dynamic raw) {
    // Backend hay trả: { statusCode, message, success, data }
    if (raw is Map && raw['data'] is Map) {
      return (raw['data'] as Map).cast<String, dynamic>();
    }
    return (raw as Map).cast<String, dynamic>();
  }

  Future<FavoriteMerchantResponse> favorite({
    required String merchantId,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/merchants/$merchantId/favorite',
    );
    final data = _unwrap(res.data);
    return FavoriteMerchantResponse.fromJson(data);
  }

  Future<FavoriteMerchantResponse> unfavorite({
    required String merchantId,
  }) async {
    final res = await _dio.delete<Map<String, dynamic>>(
      '/merchants/$merchantId/favorite',
    );
    final data = _unwrap(res.data);
    return FavoriteMerchantResponse.fromJson(data);
  }

  Future<FavoriteMerchantsResponse> listMyFavorites({
    int limit = 10,
    String? cursor,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/me/favorites/merchants',
      queryParameters: {
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );

    final data = _unwrap(res.data);
    return FavoriteMerchantsResponse.fromJson(data);
  }
}
