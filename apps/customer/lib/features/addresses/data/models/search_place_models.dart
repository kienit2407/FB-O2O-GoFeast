import 'package:flutter/foundation.dart';

@immutable
class SearchPlaceItem {
  final String title;
  final String subtitle;
  final String? placeId;
  final String? description; // full description từ autocomplete
  final double? lat;
  final double? lng;

  const SearchPlaceItem({
    required this.title,
    required this.subtitle,
    this.placeId,
    this.description,
    this.lat,
    this.lng,
  });

  SearchPlaceItem copyWith({
    String? title,
    String? subtitle,
    String? placeId,
    String? description,
    double? lat,
    double? lng,
  }) {
    return SearchPlaceItem(
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      placeId: placeId ?? this.placeId,
      description: description ?? this.description,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
    );
  }
}
