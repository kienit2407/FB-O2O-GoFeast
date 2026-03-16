enum DriverNotificationType { reviewReceived, orderStatus, system, unknown }

DriverNotificationType _parseDriverType(String? raw) {
  switch (raw) {
    case 'review_received':
      return DriverNotificationType.reviewReceived;
    case 'order_status':
      return DriverNotificationType.orderStatus;
    case 'system':
      return DriverNotificationType.system;
    default:
      return DriverNotificationType.unknown;
  }
}

class DriverNotificationData {
  final String? orderId;
  final String? orderNumber;
  final String? imageUrl;
  final String? reviewId;
  final String? reviewType;
  final String? action;

  const DriverNotificationData({
    this.orderId,
    this.orderNumber,
    this.imageUrl,
    this.reviewId,
    this.reviewType,
    this.action,
  });

  factory DriverNotificationData.fromJson(Map<String, dynamic>? j) {
    final map = j ?? {};
    return DriverNotificationData(
      orderId: map['order_id']?.toString(),
      orderNumber: map['order_number']?.toString(),
      imageUrl: map['image_url']?.toString(),
      reviewId: map['review_id']?.toString(),
      reviewType: map['review_type']?.toString(),
      action: map['action']?.toString(),
    );
  }
}

class DriverNotificationItem {
  final String id;
  final DriverNotificationType type;
  final String title;
  final String body;
  final bool isRead;
  final DateTime createdAt;
  final DriverNotificationData data;

  const DriverNotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
    required this.data,
  });

  factory DriverNotificationItem.fromJson(Map<String, dynamic> j) {
    return DriverNotificationItem(
      id: j['id']?.toString() ?? j['_id']?.toString() ?? '',
      type: _parseDriverType(j['type']?.toString()),
      title: j['title']?.toString() ?? '',
      body: j['body']?.toString() ?? '',
      isRead: j['is_read'] == true,
      createdAt:
          DateTime.tryParse(j['created_at']?.toString() ?? '') ??
          DateTime.now(),
      data: DriverNotificationData.fromJson(
        (j['data'] as Map?)?.cast<String, dynamic>(),
      ),
    );
  }

  factory DriverNotificationItem.fromSocket(Map<String, dynamic> j) {
    return DriverNotificationItem(
      id: j['id']?.toString() ?? '',
      type: _parseDriverType(j['type']?.toString()),
      title: j['title']?.toString() ?? '',
      body: j['body']?.toString() ?? '',
      isRead: j['is_read'] == true,
      createdAt:
          DateTime.tryParse(j['created_at']?.toString() ?? '') ??
          DateTime.now(),
      data: DriverNotificationData.fromJson(
        (j['data'] as Map?)?.cast<String, dynamic>(),
      ),
    );
  }

  DriverNotificationItem copyWith({bool? isRead}) {
    return DriverNotificationItem(
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

class DriverNotificationPage {
  final List<DriverNotificationItem> items;
  final int unread;

  const DriverNotificationPage({required this.items, required this.unread});

  factory DriverNotificationPage.fromJson(Map<String, dynamic> j) {
    final rows = (j['items'] as List? ?? [])
        .map(
          (e) => DriverNotificationItem.fromJson(
            (e as Map).cast<String, dynamic>(),
          ),
        )
        .toList();

    return DriverNotificationPage(
      items: rows,
      unread: (j['unread'] as num?)?.toInt() ?? 0,
    );
  }
}
