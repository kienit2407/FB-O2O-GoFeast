import 'dart:convert';

import 'package:customer/core/network/dio_client.dart';
import 'package:customer/features/dinein/data/models/dine_in_models.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DineInRepository {
  DineInRepository(this._dio);

  final DioClient _dio;

  static const _storageKey = 'active_dine_in_context_v1';

  Future<DineInResolveTableResponse> resolveTable(String tableId) async {
    final res = await _dio.get('/dine-in/public/resolve-table/$tableId');

    final raw = res.data;
    final data = (raw is Map && raw['data'] != null)
        ? (raw['data'] as Map).cast<String, dynamic>()
        : (raw as Map).cast<String, dynamic>();

    return DineInResolveTableResponse.fromJson(data);
  }

  Future<DineInEnterTableResponse> enterTable({
    required String tableId,
    String? guestName,
  }) async {
    final res = await _dio.post(
      '/dine-in/public/enter-table',
      data: {
        'table_id': tableId,
        if (guestName != null && guestName.trim().isNotEmpty)
          'guest_name': guestName.trim(),
      },
    );

    final raw = res.data;
    final data = (raw is Map && raw['data'] != null)
        ? (raw['data'] as Map).cast<String, dynamic>()
        : (raw as Map).cast<String, dynamic>();

    return DineInEnterTableResponse.fromJson(data);
  }

  Future<DineInEnterTableResponse> getCurrentSession(String dineInToken) async {
    final res = await _dio.get(
      '/dine-in/public/session/current',
      options: Options(headers: {'X-Dine-In-Token': dineInToken}),
    );

    final raw = res.data;
    final data = (raw is Map && raw['data'] != null)
        ? (raw['data'] as Map).cast<String, dynamic>()
        : (raw as Map).cast<String, dynamic>();

    // endpoint current không trả lại dine_in_token
    final merged = <String, dynamic>{
      ...data,
      'dine_in_token': dineInToken,
      'mode': data['mode'] ?? 'guest',
    };

    return DineInEnterTableResponse.fromJson(merged);
  }

  Future<void> leaveTable(String dineInToken) async {
    await _dio.post(
      '/dine-in/public/leave-table',
      options: Options(headers: {'X-Dine-In-Token': dineInToken}),
    );
  }

  Future<void> saveContext(DineInContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(context.toJson()));
  }

  Future<DineInContext?> readSavedContext() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw == null || raw.trim().isEmpty) return null;

    try {
      final map = (jsonDecode(raw) as Map).cast<String, dynamic>();
      return DineInContext.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearStoredContext() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('active_dine_in_context_v1');
  }

  Future<void> clearSavedContext() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }
}
