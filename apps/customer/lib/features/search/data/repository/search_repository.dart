import 'package:customer/core/network/dio_client.dart';
import 'package:dio/dio.dart';

import '../models/search_models.dart';

class SearchRepository {
  SearchRepository(this._dio);

  final Dio _dio;

  Map<String, dynamic> _unwrap(Map<String, dynamic> json) {
    final data = json['data'];
    if (data is Map<String, dynamic>) return data;
    return json;
  }

  Future<SearchOverviewResponse> overview({
    required String q,
    required SearchTabType tab,
    double? lat,
    double? lng,
    int merchantPage = 1,
    int merchantLimit = 10,
    int productPage = 1,
    int productLimit = 10,
  }) async {
    final res = await _dio.get(
      '/search/overview',
      queryParameters: {
        'q': q,
        'tab': tab == SearchTabType.all ? 'all' : 'near_me',
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
        'merchant_page': merchantPage,
        'merchant_limit': merchantLimit,
        'product_page': productPage,
        'product_limit': productLimit,
      },
    );

    return SearchOverviewResponse.fromJson(
      _unwrap(Map<String, dynamic>.from(res.data)),
    );
  }

  Future<SearchPagedMerchants> merchants({
    required String q,
    required SearchTabType tab,
    double? lat,
    double? lng,
    required int page,
    int limit = 10,
  }) async {
    final res = await _dio.get(
      '/search/merchants',
      queryParameters: {
        'q': q,
        'tab': tab == SearchTabType.all ? 'all' : 'near_me',
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
        'page': page,
        'limit': limit,
      },
    );

    return SearchPagedMerchants.fromJson(
      _unwrap(Map<String, dynamic>.from(res.data)),
    );
  }

  Future<SearchPagedProducts> products({
    required String q,
    required SearchTabType tab,
    double? lat,
    double? lng,
    required int page,
    int limit = 10,
  }) async {
    final res = await _dio.get(
      '/search/products',
      queryParameters: {
        'q': q,
        'tab': tab == SearchTabType.all ? 'all' : 'near_me',
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
        'page': page,
        'limit': limit,
      },
    );

    return SearchPagedProducts.fromJson(
      _unwrap(Map<String, dynamic>.from(res.data)),
    );
  }
}
