enum DriverEarningsRange { day, week, month }

enum DriverEarningsHistoryType { trip, deduction, withdrawal, unknown }

class DriverEarningsSummary {
  final String range;
  final String date;
  final DateTime? from;
  final DateTime? to;

  final int tripIncome;
  final int deduction;
  final int tripCount;
  final double averageRating;
  final int total;

  const DriverEarningsSummary({
    required this.range,
    required this.date,
    required this.from,
    required this.to,
    required this.tripIncome,
    required this.deduction,
    required this.tripCount,
    required this.averageRating,
    required this.total,
  });

  factory DriverEarningsSummary.fromJson(Map<String, dynamic> j) {
    final summary = (j['summary'] as Map?)?.cast<String, dynamic>() ?? {};

    return DriverEarningsSummary(
      range: (j['range'] ?? 'day').toString(),
      date: (j['date'] ?? '').toString(),
      from: j['from'] != null ? DateTime.tryParse(j['from'].toString()) : null,
      to: j['to'] != null ? DateTime.tryParse(j['to'].toString()) : null,
      tripIncome: (summary['trip_income'] as num?)?.toInt() ?? 0,
      deduction: (summary['deduction'] as num?)?.toInt() ?? 0,
      tripCount: (summary['trip_count'] as num?)?.toInt() ?? 0,
      averageRating: (summary['average_rating'] as num?)?.toDouble() ?? 0,
      total: (summary['total'] as num?)?.toInt() ?? 0,
    );
  }
}

class DriverEarningsHistoryItem {
  final String id;
  final DriverEarningsHistoryType type;
  final String title;
  final String subtitle;
  final int amount;
  final bool isPositive;
  final DateTime? occurredAt;
  final String? orderId;
  final String? orderNumber;

  const DriverEarningsHistoryItem({
    required this.id,
    required this.type,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.isPositive,
    required this.occurredAt,
    required this.orderId,
    required this.orderNumber,
  });

  static DriverEarningsHistoryType _mapType(String value) {
    switch (value) {
      case 'trip':
        return DriverEarningsHistoryType.trip;
      case 'deduction':
        return DriverEarningsHistoryType.deduction;
      case 'withdrawal':
        return DriverEarningsHistoryType.withdrawal;
      default:
        return DriverEarningsHistoryType.unknown;
    }
  }

  factory DriverEarningsHistoryItem.fromJson(Map<String, dynamic> j) {
    return DriverEarningsHistoryItem(
      id: (j['id'] ?? '').toString(),
      type: _mapType((j['type'] ?? '').toString()),
      title: (j['title'] ?? '').toString(),
      subtitle: (j['subtitle'] ?? '').toString(),
      amount: (j['amount'] as num?)?.toInt() ?? 0,
      isPositive: j['is_positive'] == true,
      occurredAt: j['occurred_at'] != null
          ? DateTime.tryParse(j['occurred_at'].toString())
          : null,
      orderId: j['order_id']?.toString(),
      orderNumber: j['order_number']?.toString(),
    );
  }
}

class DriverEarningsHistoryResponse {
  final String range;
  final String date;
  final DateTime? from;
  final DateTime? to;
  final List<DriverEarningsHistoryItem> items;
  final int total;
  final int page;
  final int limit;

  const DriverEarningsHistoryResponse({
    required this.range,
    required this.date,
    required this.from,
    required this.to,
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
  });

  factory DriverEarningsHistoryResponse.fromJson(Map<String, dynamic> j) {
    final rawItems = (j['items'] as List?) ?? const [];

    return DriverEarningsHistoryResponse(
      range: (j['range'] ?? 'day').toString(),
      date: (j['date'] ?? '').toString(),
      from: j['from'] != null ? DateTime.tryParse(j['from'].toString()) : null,
      to: j['to'] != null ? DateTime.tryParse(j['to'].toString()) : null,
      items: rawItems
          .whereType<Map>()
          .map(
            (e) => DriverEarningsHistoryItem.fromJson(
              Map<String, dynamic>.from(e),
            ),
          )
          .toList(),
      total: (j['total'] as num?)?.toInt() ?? 0,
      page: (j['page'] as num?)?.toInt() ?? 1,
      limit: (j['limit'] as num?)?.toInt() ?? 20,
    );
  }
}
