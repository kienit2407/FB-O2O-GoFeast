import 'package:flutter/foundation.dart';

@immutable
class SavedAddress {
  final String id; // _id của subdocument
  final String address;

  final double? lat;
  final double? lng;

  final String? receiverName;
  final String? receiverPhone;
  final String? deliveryNote;

  final DateTime? createdAt;
  final DateTime? updatedAt;

  const SavedAddress({
    required this.id,
    required this.address,
    this.lat,
    this.lng,
    this.receiverName,
    this.receiverPhone,
    this.deliveryNote,
    this.createdAt,
    this.updatedAt,
  });

  factory SavedAddress.fromJson(Map<String, dynamic> json) {
    final id = (json['_id'] ?? json['id'] ?? '').toString();
    final addr = (json['address'] ?? '').toString();

    double? lat;
    double? lng;

    final loc = json['location'];
    if (loc is Map) {
      final coords = loc['coordinates'];
      if (coords is List && coords.length >= 2) {
        // BE: [lng, lat]
        final lngN = coords[0];
        final latN = coords[1];
        if (lngN is num) lng = lngN.toDouble();
        if (latN is num) lat = latN.toDouble();
      }
    }

    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      final s = v.toString();
      if (s.isEmpty) return null;
      return DateTime.tryParse(s);
    }

    return SavedAddress(
      id: id,
      address: addr,
      lat: lat,
      lng: lng,
      receiverName: json['receiver_name']?.toString(),
      receiverPhone: json['receiver_phone']?.toString(),
      deliveryNote: json['delivery_note']?.toString(),
      createdAt: parseDate(json['created_at']),
      updatedAt: parseDate(json['updated_at']),
    );
  }
}

@immutable
class CurrentLocation {
  final double lat;
  final double lng;
  final String? address;

  // snapshot giống saved
  final String? receiverName;
  final String? receiverPhone;
  final String? deliveryNote;

  final DateTime? updatedAt;

  const CurrentLocation({
    required this.lat,
    required this.lng,
    this.address,
    this.receiverName,
    this.receiverPhone,
    this.deliveryNote,
    this.updatedAt,
  });

  factory CurrentLocation.fromJson(Map<String, dynamic> json) {
    double? lat;
    double? lng;

    // current_location của bạn là 1 object kiểu GeoJSON:
    // { type:'Point', coordinates:[lng,lat], address, ... }
    final coords = json['coordinates'];
    if (coords is List && coords.length >= 2) {
      final lngN = coords[0];
      final latN = coords[1];
      if (lngN is num) lng = lngN.toDouble();
      if (latN is num) lat = latN.toDouble();
    }

    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      final s = v.toString();
      if (s.isEmpty) return null;
      return DateTime.tryParse(s);
    }

    return CurrentLocation(
      lat: lat ?? 0,
      lng: lng ?? 0,
      address: json['address']?.toString(),
      receiverName: json['receiver_name']?.toString(),
      receiverPhone: json['receiver_phone']?.toString(),
      deliveryNote: json['delivery_note']?.toString(),
      updatedAt: parseDate(json['updated_at']),
    );
  }
}