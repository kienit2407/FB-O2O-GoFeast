class ActivePlatformPromotionItem {
  final String id;
  final String name;
  final String description;
  final String? bannerUrl;

  const ActivePlatformPromotionItem({
    required this.id,
    required this.name,
    required this.description,
    required this.bannerUrl,
  });

  factory ActivePlatformPromotionItem.fromJson(Map<String, dynamic> j) {
    return ActivePlatformPromotionItem(
      id: (j['id'] ?? j['_id'] ?? '').toString(),
      name: (j['name'] ?? '').toString(),
      description: (j['description'] ?? '').toString(),
      bannerUrl: j['banner_url']?.toString(),
    );
  }
}
