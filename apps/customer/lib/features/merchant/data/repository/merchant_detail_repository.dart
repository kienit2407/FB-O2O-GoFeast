import 'package:customer/core/network/dio_client.dart';
import 'package:customer/features/merchant/data/models/product_config_model.dart';
import '../models/merchant_detail_model.dart';

class MerchantDetailRepository {
  MerchantDetailRepository(this._dio);
  final DioClient _dio;

  Future<MerchantDetailResponse> getDetail({
    required String merchantId,
    required double lat,
    required double lng,
  }) async {
    final res = await _dio.get(
      '/merchants/$merchantId/detail',
      queryParameters: {'lat': lat, 'lng': lng},
    );

    final raw = res.data;
    final data = (raw is Map && raw['data'] != null)
        ? (raw['data'] as Map).cast<String, dynamic>()
        : (raw as Map).cast<String, dynamic>();

    return MerchantDetailResponse.fromJson(data);
  }

  Future<ProductConfigResponse> getProductConfig({
    required String merchantId,
    required String productId,
  }) async {
    final res = await _dio.get(
      '/merchants/$merchantId/products/$productId/config',
    );
    return ProductConfigResponse.fromJson(res.data['data']);
  }
}
