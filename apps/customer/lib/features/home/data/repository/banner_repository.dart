import 'package:customer/core/network/dio_client.dart';
import 'package:customer/core/shared/contants/url_config.dart';
import '../models/carousel_banner_model.dart';

class BannerRepository {
  final DioClient _dio;
  BannerRepository(this._dio);

  Future<List<CarouselBannerModel>> fetchCarouselBanners() async {
    final res = await _dio.get<Map<String, dynamic>>('/carousel-banners');

    final body = res.data ?? {};
    final list = (body['data'] as List?) ?? const [];

    final items = list
        .whereType<Map>()
        .map((e) => CarouselBannerModel.fromJson(e.cast<String, dynamic>()))
        .toList();

    // sort theo position
    items.sort((a, b) => a.position.compareTo(b.position));
    return items;
  }
}
