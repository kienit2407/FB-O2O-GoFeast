import 'package:customer/features/notifications/data/models/active_platform_promotion_models.dart';
import '../../data/models/notification_models.dart';

class NotificationState {
  final bool loading;
  final bool loadingMore;
  final String? error;
  final List<AppNotificationItem> items;
  final int unreadCount;
  final int page;
  final List<ActivePlatformPromotionItem> activePromotions;
  final bool loadingPromotions;
  final int limit;
  final bool hasMore;

  const NotificationState({
    this.loading = false,
    this.loadingMore = false,
    this.error,
    this.items = const [],
    this.unreadCount = 0,
    this.page = 1,
    this.limit = 20,
    this.hasMore = true,
    this.activePromotions = const [], // Thêm default value
    this.loadingPromotions = false,   // Thêm default value
  });

  NotificationState copyWith({
    bool? loading,
    bool? loadingMore,
    String? error,
    List<AppNotificationItem>? items,
    int? unreadCount,
    int? page,
    int? limit,
    bool? hasMore,
    List<ActivePlatformPromotionItem>? activePromotions, // Thêm tham số
    bool? loadingPromotions,                             // Thêm tham số
    bool clearError = false,
  }) {
    return NotificationState(
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      error: clearError ? null : (error ?? this.error),
      items: items ?? this.items,
      unreadCount: unreadCount ?? this.unreadCount,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      hasMore: hasMore ?? this.hasMore,
      activePromotions: activePromotions ?? this.activePromotions,       // Gán giá trị mới
      loadingPromotions: loadingPromotions ?? this.loadingPromotions,    // Gán giá trị mới
    );
  }
}