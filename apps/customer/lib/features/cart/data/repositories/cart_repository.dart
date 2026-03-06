// cart_repository.dart
import 'package:customer/core/network/dio_client.dart';
import '../models/cart_models.dart';

class CartRepository {
  CartRepository(this._dio);
  final DioClient _dio;

  Map<String, dynamic> _qp(CartParams p) {
    if (p.orderType == CartOrderType.delivery) {
      return {'merchant_id': p.merchantId};
    }
    return {'table_session_id': p.tableSessionId};
  }

  String _base(CartParams p) {
    return p.orderType == CartOrderType.delivery
        ? '/carts/delivery'
        : '/carts/dine-in';
  }

  // ===== SUMMARY (nhẹ) =====
  Future<CartSummaryResponse> getSummary({required CartParams params}) async {
    final res = await _dio.get(
      '${_base(params)}/summary',
      queryParameters: _qp(params),
    );
    final data = (res.data['data'] as Map).cast<String, dynamic>();
    return CartSummaryResponse.fromJson(data);
  }

  // ===== CURRENT (full cart) =====
  Future<CartResponse> getCurrent({required CartParams params}) async {
    final res = await _dio.get(
      '${_base(params)}/current',
      queryParameters: _qp(params),
    );
    final data = (res.data['data'] as Map).cast<String, dynamic>();
    return CartResponse.fromJson(data);
  }

  // ===== MUTATIONS =====
  Future<CartResponse> addItem({
    required CartParams params,
    required Map<String, dynamic> body,
  }) async {
    final res = await _dio.post(
      '${_base(params)}/items',
      queryParameters: _qp(params),
      data: body,
    );
    final data = (res.data['data'] as Map).cast<String, dynamic>();
    return CartResponse.fromJson(data);
  }

  Future<CartResponse> updateItem({
    required CartParams params,
    required String lineKey,
    required Map<String, dynamic> body,
  }) async {
    final res = await _dio.patch(
      '${_base(params)}/items/$lineKey',
      queryParameters: _qp(params),
      data: body,
    );
    final data = (res.data['data'] as Map).cast<String, dynamic>();
    return CartResponse.fromJson(data);
  }

  Future<CartResponse> removeItem({
    required CartParams params,
    required String lineKey,
  }) async {
    final res = await _dio.delete(
      '${_base(params)}/items/$lineKey',
      queryParameters: _qp(params),
    );
    final data = (res.data['data'] as Map).cast<String, dynamic>();
    return CartResponse.fromJson(data);
  }

  Future<CartResponse> clear({required CartParams params}) async {
    final res = await _dio.post(
      '${_base(params)}/clear',
      queryParameters: _qp(params),
    );
    final data = (res.data['data'] as Map).cast<String, dynamic>();
    return CartResponse.fromJson(data);
  }
}

/// Params dùng chung cho Delivery + Dine-in (1 controller chạy được 2 mode)
class CartParams {
  final CartOrderType orderType;
  final String merchantId; // delivery
  final String tableSessionId; // dine-in

  const CartParams.delivery({required this.merchantId})
    : orderType = CartOrderType.delivery,
      tableSessionId = '';

  const CartParams.dineIn({required this.tableSessionId})
    : orderType = CartOrderType.dineIn,
      merchantId = '';

  String get key =>
      orderType == CartOrderType.delivery ? merchantId : tableSessionId;

  @override
  bool operator ==(Object other) =>
      other is CartParams && other.orderType == orderType && other.key == key;

  @override
  int get hashCode => Object.hash(orderType, key);
}
