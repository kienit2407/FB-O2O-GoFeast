class DineInMerchantInfo {
  final String id;
  final String name;
  final String? logoUrl;
  final String? address;

  const DineInMerchantInfo({
    required this.id,
    required this.name,
    required this.logoUrl,
    required this.address,
  });

  factory DineInMerchantInfo.fromJson(Map<String, dynamic> j) {
    return DineInMerchantInfo(
      id: (j['id'] ?? j['_id'] ?? '').toString(),
      name: (j['name'] ?? '').toString(),
      logoUrl: j['logo_url']?.toString(),
      address: j['address']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'logo_url': logoUrl,
    'address': address,
  };
}

class DineInTableInfo {
  final String id;
  final String tableNumber;
  final String? name;
  final int capacity;
  final String? status;
  final bool? isActive;

  const DineInTableInfo({
    required this.id,
    required this.tableNumber,
    required this.name,
    required this.capacity,
    required this.status,
    required this.isActive,
  });

  factory DineInTableInfo.fromJson(Map<String, dynamic> j) {
    return DineInTableInfo(
      id: (j['id'] ?? j['_id'] ?? '').toString(),
      tableNumber: (j['table_number'] ?? '').toString(),
      name: j['name']?.toString(),
      capacity: (j['capacity'] as num?)?.toInt() ?? 0,
      status: j['status']?.toString(),
      isActive: j['is_active'] as bool?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'table_number': tableNumber,
    'name': name,
    'capacity': capacity,
    'status': status,
    'is_active': isActive,
  };
}

class DineInTableSessionInfo {
  final String id;
  final String status;
  final DateTime? startedAt;

  const DineInTableSessionInfo({
    required this.id,
    required this.status,
    required this.startedAt,
  });

  factory DineInTableSessionInfo.fromJson(Map<String, dynamic> j) {
    return DineInTableSessionInfo(
      id: (j['id'] ?? j['_id'] ?? '').toString(),
      status: (j['status'] ?? '').toString(),
      startedAt: j['started_at'] == null
          ? null
          : DateTime.tryParse(j['started_at'].toString()),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'status': status,
    'started_at': startedAt?.toIso8601String(),
  };
}

class DineInResolveTableResponse {
  final DineInMerchantInfo merchant;
  final DineInTableInfo table;
  final DineInTableSessionInfo? currentSession;

  const DineInResolveTableResponse({
    required this.merchant,
    required this.table,
    required this.currentSession,
  });

  factory DineInResolveTableResponse.fromJson(Map<String, dynamic> j) {
    final current = j['current_session'];
    return DineInResolveTableResponse(
      merchant: DineInMerchantInfo.fromJson(
        ((j['merchant'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
      table: DineInTableInfo.fromJson(
        ((j['table'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
      currentSession: current is Map
          ? DineInTableSessionInfo.fromJson(current.cast<String, dynamic>())
          : null,
    );
  }
}

class DineInEnterTableResponse {
  final DineInMerchantInfo merchant;
  final DineInTableInfo table;
  final DineInTableSessionInfo tableSession;
  final String dineInToken;
  final String mode;

  const DineInEnterTableResponse({
    required this.merchant,
    required this.table,
    required this.tableSession,
    required this.dineInToken,
    required this.mode,
  });

  factory DineInEnterTableResponse.fromJson(Map<String, dynamic> j) {
    return DineInEnterTableResponse(
      merchant: DineInMerchantInfo.fromJson(
        ((j['merchant'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
      table: DineInTableInfo.fromJson(
        ((j['table'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
      tableSession: DineInTableSessionInfo.fromJson(
        ((j['table_session'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
      dineInToken: (j['dine_in_token'] ?? '').toString(),
      mode: (j['mode'] ?? 'guest').toString(),
    );
  }
}

class DineInContext {
  final String merchantId;
  final String merchantName;
  final String? merchantLogoUrl;
  final String? merchantAddress;

  final String tableId;
  final String tableNumber;
  final String? tableName;

  final String tableSessionId;
  final String dineInToken;

  const DineInContext({
    required this.merchantId,
    required this.merchantName,
    required this.merchantLogoUrl,
    required this.merchantAddress,
    required this.tableId,
    required this.tableNumber,
    required this.tableName,
    required this.tableSessionId,
    required this.dineInToken,
  });

  factory DineInContext.fromEnterTableResponse(DineInEnterTableResponse r) {
    return DineInContext(
      merchantId: r.merchant.id,
      merchantName: r.merchant.name,
      merchantLogoUrl: r.merchant.logoUrl,
      merchantAddress: r.merchant.address,
      tableId: r.table.id,
      tableNumber: r.table.tableNumber,
      tableName: r.table.name,
      tableSessionId: r.tableSession.id,
      dineInToken: r.dineInToken,
    );
  }

  factory DineInContext.fromJson(Map<String, dynamic> j) {
    return DineInContext(
      merchantId: (j['merchant_id'] ?? '').toString(),
      merchantName: (j['merchant_name'] ?? '').toString(),
      merchantLogoUrl: j['merchant_logo_url']?.toString(),
      merchantAddress: j['merchant_address']?.toString(),
      tableId: (j['table_id'] ?? '').toString(),
      tableNumber: (j['table_number'] ?? '').toString(),
      tableName: j['table_name']?.toString(),
      tableSessionId: (j['table_session_id'] ?? '').toString(),
      dineInToken: (j['dine_in_token'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'merchant_id': merchantId,
    'merchant_name': merchantName,
    'merchant_logo_url': merchantLogoUrl,
    'merchant_address': merchantAddress,
    'table_id': tableId,
    'table_number': tableNumber,
    'table_name': tableName,
    'table_session_id': tableSessionId,
    'dine_in_token': dineInToken,
  };
}
