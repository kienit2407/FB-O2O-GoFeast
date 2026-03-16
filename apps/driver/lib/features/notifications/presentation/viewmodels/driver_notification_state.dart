import 'package:driver/features/notifications/data/models/driver_notification_models.dart';


class DriverNotificationState {
  final bool loading;
  final bool loadingMore;
  final String? error;
  final List<DriverNotificationItem> items;
  final int unreadCount;
  final int page;
  final int limit;
  final bool hasMore;

  const DriverNotificationState({
    this.loading = false,
    this.loadingMore = false,
    this.error,
    this.items = const [],
    this.unreadCount = 0,
    this.page = 1,
    this.limit = 20,
    this.hasMore = true,
  });

  DriverNotificationState copyWith({
    bool? loading,
    bool? loadingMore,
    String? error,
    List<DriverNotificationItem>? items,
    int? unreadCount,
    int? page,
    int? limit,
    bool? hasMore,
    bool clearError = false,
  }) {
    return DriverNotificationState(
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      error: clearError ? null : (error ?? this.error),
      items: items ?? this.items,
      unreadCount: unreadCount ?? this.unreadCount,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}
