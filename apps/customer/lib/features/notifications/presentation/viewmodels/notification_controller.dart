import 'package:customer/features/notifications/presentation/viewmodels/notication_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/notification_models.dart';
import '../../data/repository/notification_repository.dart';

class NotificationController extends StateNotifier<NotificationState> {
  NotificationController(this._repo) : super(const NotificationState());

  final NotificationRepository _repo;

  Future<void> bootstrap() async {
    state = state.copyWith(loading: true, clearError: true);

    try {
      final page = await _repo.listMine(page: 1, limit: state.limit);
      final promos = await _repo.fetchActivePlatformPromotions();

      state = state.copyWith(
        loading: false,
        items: page.items,
        unreadCount: page.unread,
        page: 1,
        hasMore: page.items.length >= state.limit,
        activePromotions: promos,
      );
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> refresh() => bootstrap();

  Future<void> loadMore() async {
    if (state.loadingMore || !state.hasMore) return;

    state = state.copyWith(loadingMore: true, clearError: true);

    try {
      final nextPage = state.page + 1;
      final page = await _repo.listMine(page: nextPage, limit: state.limit);

      state = state.copyWith(
        loadingMore: false,
        items: [...state.items, ...page.items],
        unreadCount: page.unread,
        page: nextPage,
        hasMore: page.items.length >= state.limit,
      );
    } catch (e) {
      state = state.copyWith(loadingMore: false, error: e.toString());
    }
  }

  Future<bool> deleteOne(String id) async {
    final existed = state.items.any((e) => e.id == id);
    if (!existed) return false;

    final target = state.items.firstWhere((e) => e.id == id);
    final nextItems = state.items.where((e) => e.id != id).toList();
    final nextUnread = !target.isRead && state.unreadCount > 0
        ? state.unreadCount - 1
        : state.unreadCount;

    state = state.copyWith(items: nextItems, unreadCount: nextUnread);

    try {
      await _repo.deleteOne(id);
      return true;
    } catch (_) {
      await bootstrap();
      return false;
    }
  }

  Future<void> loadUnreadOnly() async {
    try {
      final unread = await _repo.unreadCount();
      state = state.copyWith(unreadCount: unread);
    } catch (_) {}
  }

  Future<void> loadActivePromotions() async {
    try {
      final rows = await _repo.fetchActivePlatformPromotions();
      state = state.copyWith(activePromotions: rows);
    } catch (_) {}
  }

  Future<bool> clearAll() async {
    final oldItems = state.items;
    final oldUnread = state.unreadCount;

    state = state.copyWith(items: const [], unreadCount: 0);

    try {
      await _repo.clearAll();
      return true;
    } catch (_) {
      state = state.copyWith(items: oldItems, unreadCount: oldUnread);
      return false;
    }
  }

  Future<void> markRead(String id) async {
    final item = state.items.where((e) => e.id == id).firstOrNull;
    if (item == null || item.isRead) return;

    state = state.copyWith(
      items: state.items
          .map((e) => e.id == id ? e.copyWith(isRead: true) : e)
          .toList(),
      unreadCount: state.unreadCount > 0 ? state.unreadCount - 1 : 0,
    );

    try {
      await _repo.markRead(id);
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    final hasUnread = state.items.any((e) => !e.isRead);
    if (!hasUnread) return;

    state = state.copyWith(
      items: state.items.map((e) => e.copyWith(isRead: true)).toList(),
      unreadCount: 0,
    );

    try {
      await _repo.markAllRead();
    } catch (_) {}
  }

  void prependRealtime(AppNotificationItem item) {
    final existed = state.items.any((e) => e.id == item.id);
    if (existed) return;

    state = state.copyWith(
      items: [item, ...state.items],
      unreadCount: item.isRead ? state.unreadCount : state.unreadCount + 1,
    );
  }
}
