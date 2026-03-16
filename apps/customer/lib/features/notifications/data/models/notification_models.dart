enum AppNotificationType {
  orderCreated,
  orderStatus,
  promotion,
  reviewReceived,
  reviewReplied,
  system,
  unknown,
}

enum AppNotificationSection { promotion, order }

class AppNotificationData {
  final String? action;
  final String? orderId;
  final String? orderNumber;
  final String? imageUrl;
  final String? merchantId;
  final String? driverId;
  final String? productId;
  final String? reviewId;
  final String? reviewType;
  final String? promotionId;
  final String? tableNumber;
  final String? orderType;

  const AppNotificationData({
    this.action,
    this.orderId,
    this.orderNumber,
    this.imageUrl,
    this.merchantId,
    this.driverId,
    this.productId,
    this.reviewId,
    this.reviewType,
    this.promotionId,
    this.tableNumber,
    this.orderType,
  });

  factory AppNotificationData.fromJson(Map<String, dynamic>? j) {
    final map = j ?? {};
    return AppNotificationData(
      action: map['action']?.toString(),
      orderId: map['order_id']?.toString(),
      orderNumber: map['order_number']?.toString(),
      imageUrl: map['image_url']?.toString(),
      merchantId: map['merchant_id']?.toString(),
      driverId: map['driver_id']?.toString(),
      productId: map['product_id']?.toString(),
      reviewId: map['review_id']?.toString(),
      reviewType: map['review_type']?.toString(),
      promotionId: map['promotion_id']?.toString(),
      tableNumber: map['table_number']?.toString(),
      orderType: map['order_type']?.toString(),
    );
  }
}

AppNotificationType _parseType(String? raw) {
  switch (raw) {
    case 'order_created':
      return AppNotificationType.orderCreated;
    case 'order_status':
      return AppNotificationType.orderStatus;
    case 'promotion':
      return AppNotificationType.promotion;
    case 'review_received':
      return AppNotificationType.reviewReceived;
    case 'review_replied':
      return AppNotificationType.reviewReplied;
    case 'system':
      return AppNotificationType.system;
    default:
      return AppNotificationType.unknown;
  }
}

class AppNotificationItem {
  final String id;
  final AppNotificationType type;
  final String title;
  final String body;
  final bool isRead;
  final DateTime createdAt;
  final AppNotificationData data;

  const AppNotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
    required this.data,
  });

  AppNotificationSection get section {
    if (type == AppNotificationType.promotion) {
      return AppNotificationSection.promotion;
    }
    return AppNotificationSection.order;
  }

  bool get isOrderNotification =>
      type == AppNotificationType.orderCreated ||
      type == AppNotificationType.orderStatus;

  factory AppNotificationItem.fromJson(Map<String, dynamic> j) {
    return AppNotificationItem(
      id: j['id']?.toString() ?? j['_id']?.toString() ?? '',
      type: _parseType(j['type']?.toString()),
      title: j['title']?.toString() ?? '',
      body: j['body']?.toString() ?? '',
      isRead: j['is_read'] == true,
      createdAt:
          DateTime.tryParse(j['created_at']?.toString() ?? '') ??
          DateTime.now(),
      data: AppNotificationData.fromJson(
        (j['data'] as Map?)?.cast<String, dynamic>(),
      ),
    );
  }

  factory AppNotificationItem.fromSocket(Map<String, dynamic> j) {
    return AppNotificationItem(
      id: j['id']?.toString() ?? '',
      type: _parseType(j['type']?.toString()),
      title: j['title']?.toString() ?? '',
      body: j['body']?.toString() ?? '',
      isRead: j['is_read'] == true,
      createdAt:
          DateTime.tryParse(j['created_at']?.toString() ?? '') ??
          DateTime.now(),
      data: AppNotificationData.fromJson(
        (j['data'] as Map?)?.cast<String, dynamic>(),
      ),
    );
  }

  AppNotificationItem copyWith({bool? isRead}) {
    return AppNotificationItem(
      id: id,
      type: type,
      title: title,
      body: body,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
      data: data,
    );
  }
}

class AppNotificationPage {
  final List<AppNotificationItem> items;
  final int total;
  final int unread;
  final int page;
  final int limit;

  const AppNotificationPage({
    required this.items,
    required this.total,
    required this.unread,
    required this.page,
    required this.limit,
  });

  factory AppNotificationPage.fromJson(Map<String, dynamic> j) {
    final rows = (j['items'] as List? ?? [])
        .map(
          (e) =>
              AppNotificationItem.fromJson((e as Map).cast<String, dynamic>()),
        )
        .toList();

    return AppNotificationPage(
      items: rows,
      total: (j['total'] as num?)?.toInt() ?? 0,
      unread: (j['unread'] as num?)?.toInt() ?? 0,
      page: (j['page'] as num?)?.toInt() ?? 1,
      limit: (j['limit'] as num?)?.toInt() ?? 20,
    );
  }
}
