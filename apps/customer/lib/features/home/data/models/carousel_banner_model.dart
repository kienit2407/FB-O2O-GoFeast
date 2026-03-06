class CarouselBannerModel {
  final String id; // _id (nếu BE có) - optional
  final String carouselId; // cloudinary public_id
  final String carouselUrl; // cloudinary secure_url
  final int position;
  final bool isActive;

  const CarouselBannerModel({
    required this.id,
    required this.carouselId,
    required this.carouselUrl,
    required this.position,
    required this.isActive,
  });

  factory CarouselBannerModel.fromJson(Map<String, dynamic> j) {
    return CarouselBannerModel(
      id: (j['_id'] ?? j['id'] ?? '').toString(),
      carouselId: (j['carousel_id'] ?? '').toString(),
      carouselUrl: (j['carousel_url'] ?? '').toString(),
      position: (j['position'] ?? 0) is int
          ? (j['position'] ?? 0)
          : int.tryParse('${j['position']}') ?? 0,
      isActive: (j['is_active'] ?? true) as bool,
    );
  }
}
