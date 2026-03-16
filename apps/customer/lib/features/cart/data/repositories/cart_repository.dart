import 'dart:convert';

import 'package:customer/core/network/dio_client.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/cart_models.dart';

class CartRepository {
  CartRepository(this._dio);
  final DioClient _dio;

  bool _isPublicDineIn(CartParams p) => p.orderType == CartOrderType.dineIn;

  Map<String, dynamic> _qp(CartParams p) {
    if (p.orderType == CartOrderType.delivery) {
      return {'merchant_id': p.merchantId};
    }
    // public dine-in dùng token, không dùng query param table_session_id nữa
    return {};
  }

  String _base(CartParams p) {
    return p.orderType == CartOrderType.delivery
        ? '/carts/delivery'
        : '/carts/dine-in/public';
  }

  Future<String?> _readDineInToken() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('active_dine_in_context_v1');
    if (raw == null || raw.trim().isEmpty) return null;

    try {
      final map = (jsonDecode(raw) as Map).cast<String, dynamic>();
      final token = map['dine_in_token']?.toString();
      if (token == null || token.trim().isEmpty) return null;
      return token;
    } catch (_) {
      return null;
    }
  }

  Future<Options?> _options(CartParams p) async {
    if (!_isPublicDineIn(p)) return null;

    final token = await _readDineInToken();
    return Options(
      headers: {
        if (token != null && token.isNotEmpty) 'X-Dine-In-Token': token,
      },
    );
  }

  // ===== SUMMARY (nhẹ) =====
  Future<CartSummaryResponse> getSummary({required CartParams params}) async {
    final res = await _dio.get(
      '${_base(params)}/summary',
      queryParameters: _qp(params),
      options: await _options(params),
    );
    final data = (res.data['data'] as Map).cast<String, dynamic>();
    return CartSummaryResponse.fromJson(data);
  }

  // ===== CURRENT (full cart) =====
  Future<CartResponse> getCurrent({required CartParams params}) async {
    final res = await _dio.get(
      '${_base(params)}/current',
      queryParameters: _qp(params),
      options: await _options(params),
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
      options: await _options(params),
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
      options: await _options(params),
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
      options: await _options(params),
    );
    final data = (res.data['data'] as Map).cast<String, dynamic>();
    return CartResponse.fromJson(data);
  }

  Future<CartResponse> clear({required CartParams params}) async {
    if (_isPublicDineIn(params)) {
      final res = await _dio.delete(
        '${_base(params)}/clear',
        options: await _options(params),
      );
      final data = (res.data['data'] as Map).cast<String, dynamic>();
      return CartResponse.fromJson(data);
    }

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
