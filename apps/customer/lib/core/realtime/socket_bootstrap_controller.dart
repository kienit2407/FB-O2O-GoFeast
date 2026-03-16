import 'dart:async';

import 'package:customer/core/di/providers.dart';
import 'package:customer/core/push/local_notification_service.dart';
import 'package:customer/core/realtime/socket_provider.dart';
import 'package:customer/features/notifications/data/models/notification_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CustomerSocketBootstrapController {
  CustomerSocketBootstrapController({
    required Ref ref,
    required CustomerSocketService socketService,
    required LocalNotificationService notificationService,
  }) : _ref = ref,
       _socketService = socketService,
       _notificationService = notificationService;

  final Ref _ref;
  final CustomerSocketService _socketService;
  final LocalNotificationService _notificationService;

  StreamSubscription? _orderStatusSub;
  StreamSubscription? _dispatchExpiredSub;
  StreamSubscription? _orderCancelledSub;
  StreamSubscription? _promotionPushSub;
  StreamSubscription? _notificationNewSub;

  Future<void> start() async {
    await _socketService.init();
    await _socketService.connect();

    _orderStatusSub ??= _socketService.orderStatusStream.listen((data) async {
      final orderId = data['orderId']?.toString() ?? '';
      final status = data['status']?.toString() ?? 'updated';

      final rawMessage = data['message']?.toString().trim() ?? '';
      final title = _orderStatusTitle(status);
      final body = rawMessage.isNotEmpty
          ? rawMessage
          : _orderStatusFallbackBody(status);

      await _notificationService.showNotification(
        id: orderId.hashCode,
        title: title,
        body: body,
        payload: 'order:$orderId',
      );

      if (orderId.isNotEmpty) {
        await _ref
            .read(myOrdersControllerProvider.notifier)
            .refreshOrderRealtime(orderId: orderId);
      }
    });

    _dispatchExpiredSub ??= _socketService.dispatchExpiredStream.listen((
      data,
    ) async {
      final orderId = data['orderId']?.toString() ?? '';

      await _notificationService.showNotification(
        id: orderId.hashCode ^ 101,
        title: 'Chưa tìm được tài xế',
        body: 'Hệ thống chưa tìm được tài xế phù hợp cho đơn của bạn',
        payload: 'order:$orderId',
      );

      if (orderId.isNotEmpty) {
        await _ref
            .read(myOrdersControllerProvider.notifier)
            .refreshOrderRealtime(orderId: orderId);
      }
    });

    _orderCancelledSub ??= _socketService.orderCancelledStream.listen((
      data,
    ) async {
      final orderId = data['orderId']?.toString() ?? '';
      final message =
          data['message']?.toString() ?? 'Đơn hàng của bạn đã bị hủy';

      await _notificationService.showNotification(
        id: orderId.hashCode ^ 202,
        title: 'Đơn hàng đã bị hủy',
        body: message,
        payload: 'order:$orderId',
      );

      if (orderId.isNotEmpty) {
        await _ref
            .read(myOrdersControllerProvider.notifier)
            .refreshOrderRealtime(orderId: orderId);
      }
    });

    _promotionPushSub ??= _socketService.promotionPushStream.listen((
      data,
    ) async {
      final promotionId = data['promotionId']?.toString() ?? '';
      final title = data['title']?.toString() ?? 'Ưu đãi mới';
      final body = data['body']?.toString() ?? 'Bạn vừa nhận được ưu đãi mới';

      await _notificationService.showNotification(
        id: promotionId.hashCode ^ 303,
        title: title,
        body: body,
        payload: 'promotion:$promotionId',
      );
    });

    _notificationNewSub ??= _socketService.notificationNewStream.listen((
      data,
    ) async {
      final item = AppNotificationItem.fromSocket(data);

      _ref.read(notificationControllerProvider.notifier).prependRealtime(item);

      await _notificationService.showNotification(
        id: item.id.hashCode ^ 404,
        title: item.title,
        body: item.body,
        payload: item.type == AppNotificationType.promotion
            ? 'promotion:${item.data.promotionId ?? ''}'
            : 'order:${item.data.orderId ?? ''}',
      );
    });
  }

  Future<void> stop() async {
    await _orderStatusSub?.cancel();
    await _dispatchExpiredSub?.cancel();
    await _orderCancelledSub?.cancel();
    await _promotionPushSub?.cancel();
    await _notificationNewSub?.cancel();

    _orderStatusSub = null;
    _dispatchExpiredSub = null;
    _orderCancelledSub = null;
    _promotionPushSub = null;
    _notificationNewSub = null;

    _socketService.disconnect();
  }
}

String _orderStatusTitle(String status) {
  switch (status) {
    case 'confirmed':
      return 'Quán đã xác nhận đơn';
    case 'preparing':
      return 'Quán đang chuẩn bị món';
    case 'ready_for_pickup':
      return 'Món đã sẵn sàng';
    case 'driver_assigned':
      return 'Đã có tài xế nhận đơn';
    case 'driver_arrived':
      return 'Tài xế đã tới quán';
    case 'picked_up':
      return 'Tài xế đã lấy món';
    case 'delivering':
      return 'Tài xế đang giao đơn';
    case 'delivered':
      return 'Đơn đã giao tới nơi';
    case 'completed':
      return 'Đơn hàng hoàn tất';
    case 'cancelled':
      return 'Đơn hàng đã bị hủy';
    default:
      return 'Cập nhật đơn hàng';
  }
}

String _orderStatusFallbackBody(String status) {
  switch (status) {
    case 'confirmed':
      return 'Quán đã xác nhận và bắt đầu xử lý đơn của bạn.';
    case 'preparing':
      return 'Quán đang chuẩn bị món cho đơn hàng của bạn.';
    case 'ready_for_pickup':
      return 'Món đã sẵn sàng để tài xế lấy.';
    case 'driver_assigned':
      return 'Đơn hàng của bạn đã có tài xế nhận.';
    case 'driver_arrived':
      return 'Tài xế đã tới quán để lấy món.';
    case 'picked_up':
      return 'Tài xế đã lấy món và chuẩn bị giao cho bạn.';
    case 'delivering':
      return 'Tài xế đang trên đường giao đơn cho bạn.';
    case 'delivered':
      return 'Đơn hàng đã được giao tới nơi.';
    case 'completed':
      return 'Đơn hàng của bạn đã hoàn tất.';
    case 'cancelled':
      return 'Đơn hàng của bạn đã bị hủy.';
    default:
      return 'Đơn hàng của bạn vừa được cập nhật.';
  }
}
