import 'package:customer/core/network/dio_client.dart';
import 'package:customer/features/promotion/data/models/promotion_models.dart';

class PromotionRepository {
  PromotionRepository(this._dio);

  final DioClient _dio;

  Future<List<MerchantPromotionSummaryItem>> listMerchantPromotions({
    required String merchantId,
    required String orderType,
  }) async {
    final res = await _dio.get(
      '/promotions/public/merchant/$merchantId',
      queryParameters: {'order_type': orderType},
    );

    final raw = res.data;
    final data = (raw is Map && raw['data'] != null)
        ? raw['data'] as List
        : raw as List;

    return data
        .whereType<Map>()
        .map(
          (e) =>
              MerchantPromotionSummaryItem.fromJson(e.cast<String, dynamic>()),
        )
        .toList();
  }

  Future<PromotionDetailResponse> getPromotionDetail(String promotionId) async {
    final res = await _dio.get('/promotions/public/$promotionId');

    final raw = res.data;
    final data = (raw is Map && raw['data'] != null)
        ? (raw['data'] as Map).cast<String, dynamic>()
        : (raw as Map).cast<String, dynamic>();

    return PromotionDetailResponse.fromJson(data);
  }

  Future<bool> saveVoucher(String voucherId) async {
    await _dio.post('/vouchers/$voucherId/save');
    return true;
  }

  Future<bool> unsaveVoucher(String voucherId) async {
    await _dio.delete('/vouchers/$voucherId/save');
    return true;
  }

  Future<(List<SavedVoucherItem>, String?)> listSavedVouchers({
    int limit = 20,
    String? cursor,
  }) async {
    final res = await _dio.get(
      '/me/vouchers',
      queryParameters: {
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );

    final raw = res.data;
    final data = (raw is Map && raw['data'] != null)
        ? (raw['data'] as Map).cast<String, dynamic>()
        : (raw as Map).cast<String, dynamic>();

    final items = ((data['items'] as List?) ?? const [])
        .whereType<Map>()
        .map((e) => SavedVoucherItem.fromJson(e.cast<String, dynamic>()))
        .toList();

    return (items, data['nextCursor']?.toString());
  }

  Future<PopupPromotionItem?> getPopupPromotion() async {
    final res = await _dio.get('/promotions/public/popup');

    final raw = res.data;

    if (raw is Map) {
      final map = raw.cast<String, dynamic>();

      // API wrapper kiểu { success, data, statusCode }
      if (map.containsKey('data')) {
        final inner = map['data'];
        if (inner == null) return null;
        return PopupPromotionItem.fromJson(
          (inner as Map).cast<String, dynamic>(),
        );
      }

      // fallback nếu backend trả thẳng object promo
      return PopupPromotionItem.fromJson(map);
    }

    return null;
  }
}
