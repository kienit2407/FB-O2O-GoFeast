class ReverseSuggestItem {
  final String? placeId;
  final String address;
  final String? name;
  final double? lat;
  final double? lng;

  const ReverseSuggestItem({
    required this.address,
    this.placeId,
    this.name,
    this.lat,
    this.lng,
  });

  factory ReverseSuggestItem.fromJson(Map<String, dynamic> json) {
    return ReverseSuggestItem(
      placeId: json['placeId'] as String?,
      address: (json['address'] ?? '').toString(),
      name: json['name'] as String?,
      lat: (json['lat'] is num) ? (json['lat'] as num).toDouble() : null,
      lng: (json['lng'] is num) ? (json['lng'] as num).toDouble() : null,
    );
  }
}

class ReverseSuggestResponse {
  final String? address;
  final List<ReverseSuggestItem> items;

  const ReverseSuggestResponse({required this.address, required this.items});

  factory ReverseSuggestResponse.fromJson(Map<String, dynamic> json) {
    final itemsRaw = (json['items'] is List)
        ? (json['items'] as List)
        : const [];
    return ReverseSuggestResponse(
      address: json['address'] as String?,
      items: itemsRaw
          .whereType<Map>()
          .map((e) => ReverseSuggestItem.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }
}
