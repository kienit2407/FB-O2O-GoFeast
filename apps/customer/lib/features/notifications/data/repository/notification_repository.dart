import 'package:customer/core/network/dio_client.dart';
import 'package:customer/features/notifications/data/models/active_platform_promotion_models.dart';
import '../models/notification_models.dart';

class NotificationRepository {
  NotificationRepository(this._dio);

  final DioClient _dio;

  Future<AppNotificationPage> listMine({int page = 1, int limit = 20}) async {
    final res = await _dio.dio.get(
      '/notifications/me',
      queryParameters: {
        'page': page,
        'limit': limit,
        'exclude_promotion': true,
      },
    );

    return AppNotificationPage.fromJson(
      (res.data['data'] as Map).cast<String, dynamic>(),
    );
  }

  Future<List<ActivePlatformPromotionItem>>
  fetchActivePlatformPromotions() async {
    final res = await _dio.dio.get('/promotions/platform/active');

    final rows = (res.data['data'] as List? ?? [])
        .map(
          (e) => ActivePlatformPromotionItem.fromJson(
            (e as Map).cast<String, dynamic>(),
          ),
        )
        .toList();

    return rows;
  }

  Future<int> unreadCount() async {
    final res = await _dio.dio.get(
      '/notifications/me/unread-count',
      queryParameters: {'exclude_promotion': true},
    );
    final data = (res.data['data'] as Map).cast<String, dynamic>();
    return (data['unread'] as num?)?.toInt() ?? 0;
  }

  Future<void> markRead(String id) async {
    await _dio.dio.patch('/notifications/me/$id/read');
  }

  Future<void> markAllRead() async {
    await _dio.dio.patch('/notifications/me/read-all');
  }

  Future<void> deleteOne(String id) async {
    await _dio.dio.delete('/notifications/me/$id');
  }

  Future<void> clearAll() async {
    await _dio.dio.delete('/notifications/me/clear-all');
  }
}
