import 'package:dio/dio.dart';
import 'package:driver/features/earnings/data/models/driver_earnings_models.dart';

class DriverEarningsRepository {
  DriverEarningsRepository(this._dio);
  final Dio _dio;

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

  String _rangeValue(DriverEarningsRange range) {
    switch (range) {
      case DriverEarningsRange.day:
        return 'day';
      case DriverEarningsRange.week:
        return 'week';
      case DriverEarningsRange.month:
        return 'month';
    }
  }

  Future<DriverEarningsSummary> getSummary({
    required DriverEarningsRange range,
    required DateTime date,
  }) async {
    try {
      final res = await _dio.get(
        '/driver/earnings/summary',
        queryParameters: {
          'range': _rangeValue(range),
          'date': _formatYmd(date),
        },
      );

      final body = res.data;
      if (body is Map && body['data'] is Map) {
        return DriverEarningsSummary.fromJson(
          Map<String, dynamic>.from(body['data'] as Map),
        );
      }

      throw Exception('Invalid earnings summary response');
    } on DioException catch (e) {
      _throwDio(e);
    }
  }

  Future<DriverEarningsHistoryResponse> getHistory({
    required DriverEarningsRange range,
    required DateTime date,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final res = await _dio.get(
        '/driver/earnings/history',
        queryParameters: {
          'range': _rangeValue(range),
          'date': _formatYmd(date),
          'page': page,
          'limit': limit,
        },
      );

      final body = res.data;
      if (body is Map && body['data'] is Map) {
        return DriverEarningsHistoryResponse.fromJson(
          Map<String, dynamic>.from(body['data'] as Map),
        );
      }

      throw Exception('Invalid earnings history response');
    } on DioException catch (e) {
      _throwDio(e);
    }
  }

  String _formatYmd(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}
