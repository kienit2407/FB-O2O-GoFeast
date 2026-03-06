import 'package:flutter/foundation.dart';

@immutable
class OAuthProvider {
  final String provider; // google | github
  final String providerId;
  final String? email;

  const OAuthProvider({
    required this.provider,
    required this.providerId,
    this.email,
  });
}

@immutable
class GeoPoint {
  final String type; // "Point"
  final List<double> coordinates; // [lng, lat]

  const GeoPoint({required this.type, required this.coordinates});
}

/// current_location (snapshot giống saved)
@immutable
class CurrentLocation extends GeoPoint {
  final String? address;
  final String? receiverName;
  final String? receiverPhone;
  final String? deliveryNote;
  final DateTime? updatedAt;

  const CurrentLocation({
    required super.type,
    required super.coordinates,
    this.address,
    this.receiverName,
    this.receiverPhone,
    this.deliveryNote,
    this.updatedAt,
  });

  double get lng => coordinates.isNotEmpty ? coordinates[0] : 0;
  double get lat => coordinates.length > 1 ? coordinates[1] : 0;
}

/// saved_addresses item (schema mới)
@immutable
class SavedAddress {
  final String id; // _id subdocument
  final String address;
  final GeoPoint? location;

  final String? receiverName;
  final String? receiverPhone;
  final String? deliveryNote;

  final DateTime? createdAt;
  final DateTime? updatedAt;

  const SavedAddress({
    required this.id,
    required this.address,
    this.location,
    this.receiverName,
    this.receiverPhone,
    this.deliveryNote,
    this.createdAt,
    this.updatedAt,
  });

  double? get lng =>
      (location?.coordinates ?? const []).isNotEmpty ? location!.coordinates[0] : null;
  double? get lat =>
      (location?.coordinates ?? const []).length > 1 ? location!.coordinates[1] : null;
}

@immutable
class CustomerProfile {
  final String id;
  final String userId;

  final CurrentLocation? currentLocation;
  final List<SavedAddress> savedAddresses;

  final int totalOrders;
  final int totalSpent;

  final DateTime? createdAt;
  final DateTime? updatedAt;

  const CustomerProfile({
    required this.id,
    required this.userId,
    this.currentLocation,
    required this.savedAddresses,
    required this.totalOrders,
    required this.totalSpent,
    this.createdAt,
    this.updatedAt,
  });
}

@immutable
class AuthUser {
  final String id;
  final String role;

  final String? email;
  final String? phone;
  final String? fullName;
  final String? avatarUrl;

  final String? language;
  final bool notificationEnabled;

  final List<String> authMethods;
  final List<OAuthProvider> oauthProviders;

  final CustomerProfile? customerProfile;

  const AuthUser({
    required this.id,
    required this.role,
    this.email,
    this.phone,
    this.fullName,
    this.avatarUrl,
    this.language,
    required this.notificationEnabled,
    required this.authMethods,
    required this.oauthProviders,
    this.customerProfile,
  });
}