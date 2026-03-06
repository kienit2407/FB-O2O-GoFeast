import '../../domain/entities/auth_user.dart';

double _toDouble(dynamic x) => (x as num).toDouble();
DateTime? _toDate(dynamic v) => v == null ? null : DateTime.tryParse(v.toString());

class OAuthProviderModel extends OAuthProvider {
  const OAuthProviderModel({
    required super.provider,
    required super.providerId,
    super.email,
  });

  factory OAuthProviderModel.fromJson(Map<String, dynamic> j) => OAuthProviderModel(
        provider: (j['provider'] ?? '').toString(),
        providerId: (j['provider_id'] ?? j['providerId'] ?? '').toString(),
        email: j['email'] as String?,
      );
}

class GeoPointModel extends GeoPoint {
  const GeoPointModel({required super.type, required super.coordinates});

  factory GeoPointModel.fromJson(Map<String, dynamic> j) => GeoPointModel(
        type: (j['type'] ?? 'Point').toString(),
        coordinates: ((j['coordinates'] as List?) ?? const []).map(_toDouble).toList(),
      );
}

class CurrentLocationModel extends CurrentLocation {
  const CurrentLocationModel({
    required super.type,
    required super.coordinates,
    super.address,
    super.receiverName,
    super.receiverPhone,
    super.deliveryNote,
    super.updatedAt,
  });

  factory CurrentLocationModel.fromJson(Map<String, dynamic> j) => CurrentLocationModel(
        type: (j['type'] ?? 'Point').toString(),
        coordinates: ((j['coordinates'] as List?) ?? const []).map(_toDouble).toList(),
        address: j['address']?.toString(),
        receiverName: j['receiver_name']?.toString(),
        receiverPhone: j['receiver_phone']?.toString(),
        deliveryNote: j['delivery_note']?.toString(),
        updatedAt: _toDate(j['updated_at']),
      );
}

class SavedAddressModel extends SavedAddress {
  const SavedAddressModel({
    required super.id,
    required super.address,
    super.location,
    super.receiverName,
    super.receiverPhone,
    super.deliveryNote,
    super.createdAt,
    super.updatedAt,
  });

  factory SavedAddressModel.fromJson(Map<String, dynamic> j) {
    final loc = j['location'];
    return SavedAddressModel(
      id: (j['_id'] ?? j['id'] ?? '').toString(),
      address: (j['address'] ?? '').toString(),
      location: (loc is Map<String, dynamic>)
          ? GeoPointModel.fromJson(loc)
          : (loc is Map ? GeoPointModel.fromJson(loc.cast<String, dynamic>()) : null),
      receiverName: j['receiver_name']?.toString(),
      receiverPhone: j['receiver_phone']?.toString(),
      deliveryNote: j['delivery_note']?.toString(),
      createdAt: _toDate(j['created_at']),
      updatedAt: _toDate(j['updated_at']),
    );
  }
}

class CustomerProfileModel extends CustomerProfile {
  const CustomerProfileModel({
    required super.id,
    required super.userId,
    super.currentLocation,
    required super.savedAddresses,
    required super.totalOrders,
    required super.totalSpent,
    super.createdAt,
    super.updatedAt,
  });

  factory CustomerProfileModel.fromJson(Map<String, dynamic> j) {
    final cur = j['current_location'];
    final list = (j['saved_addresses'] as List?) ?? const [];

    return CustomerProfileModel(
      id: (j['_id'] ?? j['id'] ?? '').toString(),
      userId: (j['user_id'] ?? '').toString(),
      currentLocation: (cur is Map<String, dynamic>)
          ? CurrentLocationModel.fromJson(cur)
          : (cur is Map ? CurrentLocationModel.fromJson(cur.cast<String, dynamic>()) : null),
      savedAddresses: list
          .whereType<Map>()
          .map((e) => SavedAddressModel.fromJson(e.cast<String, dynamic>()))
          .toList(),
      totalOrders: (j['total_orders'] ?? 0) as int,
      totalSpent: (j['total_spent'] ?? 0) as int,
      createdAt: _toDate(j['created_at']),
      updatedAt: _toDate(j['updated_at']),
    );
  }
}

class AuthUserModel extends AuthUser {
  const AuthUserModel({
    required super.id,
    required super.role,
    super.email,
    super.phone,
    super.fullName,
    super.avatarUrl,
    super.language,
    required super.notificationEnabled,
    required super.authMethods,
    required super.oauthProviders,
    super.customerProfile,
  });

  factory AuthUserModel.fromJson(Map<String, dynamic> j) {
    final methods = (j['auth_methods'] as List?) ?? const [];
    final providers = (j['oauth_providers'] as List?) ?? const [];
    final profile = j['customer_profile'];

    return AuthUserModel(
      id: (j['id'] ?? j['_id'] ?? '').toString(),
      role: (j['role'] ?? 'customer').toString(),
      email: j['email'] as String?,
      phone: j['phone'] as String?,
      fullName: j['full_name'] as String?,
      avatarUrl: j['avatar_url'] as String?,
      language: j['language'] as String?,
      notificationEnabled: (j['notification_enabled'] ?? true) as bool,
      authMethods: methods.map((e) => e.toString()).toList(),
      oauthProviders: providers
          .whereType<Map>()
          .map((e) => OAuthProviderModel.fromJson(e.cast<String, dynamic>()))
          .toList(),
      customerProfile: (profile is Map<String, dynamic>)
          ? CustomerProfileModel.fromJson(profile)
          : (profile is Map ? CustomerProfileModel.fromJson(profile.cast<String, dynamic>()) : null),
    );
  }
}