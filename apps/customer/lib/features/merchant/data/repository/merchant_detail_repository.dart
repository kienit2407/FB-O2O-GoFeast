import 'dart:convert';
import 'dart:io';

import 'package:customer/core/network/dio_client.dart';
import 'package:customer/features/merchant/data/models/food_detail_model.dart';
import 'package:customer/features/merchant/data/models/merchant_reviews_model.dart';
import 'package:customer/features/merchant/data/models/product_config_model.dart';
import 'package:customer/features/merchant/data/models/product_reviews_model.dart';
import 'package:dio/dio.dart';
import '../models/merchant_detail_model.dart';

class MerchantDetailRepository {
  MerchantDetailRepository(this._dio);

  final DioClient _dio;

  Future<MerchantDetailResponse> getDetail({
    required String merchantId,
    required double lat,
    required double lng,
  }) async {
    final res = await _dio.get(
      '/merchants/$merchantId/detail',
      queryParameters: {'lat': lat, 'lng': lng},
    );

    final raw = res.data;
    final data = (raw is Map && raw['data'] != null)
        ? (raw['data'] as Map).cast<String, dynamic>()
        : (raw as Map).cast<String, dynamic>();

    return MerchantDetailResponse.fromJson(data);
  }

  Options get _multipartOptions => Options(contentType: 'multipart/form-data');

  Future<void> createProductReview({
    required String orderId,
    required String merchantId,
    required String productId,
    required int rating,
    required String comment,
    List<File> newImages = const [],
    File? newVideo,
  }) async {
    final form = FormData.fromMap({
      'order_id': orderId,
      'merchant_id': merchantId,
      'product_id': productId,
      'rating': rating.toString(),
      'comment': comment,
      'images': [
        for (final file in newImages)
          await MultipartFile.fromFile(
            file.path,
            filename: file.path.split('/').last,
          ),
      ],
      if (newVideo != null)
        'video': await MultipartFile.fromFile(
          newVideo.path,
          filename: newVideo.path.split('/').last,
        ),
    });

    await _dio.post(
      '/customer/reviews/product',
      data: form,
      options: _multipartOptions,
    );
  }

  Future<void> updateProductReview({
    required String reviewId,
    required int rating,
    required String comment,
    List<String> keptRemoteImageUrls = const [],
    String? keptRemoteVideoUrl,
    List<File> newImages = const [],
    File? newVideo,
  }) async {
    final form = FormData.fromMap({
      'rating': rating.toString(),
      'comment': comment,
      'kept_remote_image_urls': jsonEncode(keptRemoteImageUrls),
      if (keptRemoteVideoUrl != null && keptRemoteVideoUrl.trim().isNotEmpty)
        'kept_remote_video_url': keptRemoteVideoUrl,
      'images': [
        for (final file in newImages)
          await MultipartFile.fromFile(
            file.path,
            filename: file.path.split('/').last,
          ),
      ],
      if (newVideo != null)
        'video': await MultipartFile.fromFile(
          newVideo.path,
          filename: newVideo.path.split('/').last,
        ),
    });

    await _dio.patch(
      '/customer/reviews/product/$reviewId',
      data: form,
      options: _multipartOptions,
    );
  }

  Future<void> deleteProductReview(String reviewId) async {
    await _dio.delete('/customer/reviews/product/$reviewId');
  }

  Future<ProductReviewsResponse> listProductReviews({
    required String productId,
    int limit = 10,
    String? cursor,
    int? rating,
  }) async {
    final res = await _dio.get<dynamic>(
      '/products/$productId/reviews',
      queryParameters: {
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
        if (rating != null) 'rating': rating,
      },
    );

    final raw = res.data;
    dynamic data = raw;
    if (raw is Map && raw['data'] != null) data = raw['data'];

    return ProductReviewsResponse.fromJson(
      Map<String, dynamic>.from(data as Map),
    );
  }

  Future<FoodDetailResponse> getFoodDetail({
    required String productId,
    double? lat,
    double? lng,
  }) async {
    final res = await _dio.get<dynamic>(
      '/products/$productId/detail',
      queryParameters: {
        if (lat != null && lng != null) 'lat': lat,
        if (lat != null && lng != null) 'lng': lng,
      },
    );

    final raw = res.data;
    dynamic data = raw;
    if (raw is Map && raw['data'] != null) data = raw['data'];

    return FoodDetailResponse.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<ProductConfigResponse> getProductConfig({
    required String merchantId,
    required String productId,
  }) async {
    final res = await _dio.get(
      '/merchants/$merchantId/products/$productId/config',
    );
    return ProductConfigResponse.fromJson(res.data['data']);
  }

  Future<MerchantReviewsResponse> listMerchantReviews({
    required String merchantId,
    int limit = 10,
    String? cursor,
    int? rating,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/customer/reviews/$merchantId/reviews',
      queryParameters: {
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
        if (rating != null) 'rating': rating,
      },
    );

    final body = res.data ?? {};
    final data = Map<String, dynamic>.from((body['data'] as Map?) ?? const {});
    return MerchantReviewsResponse.fromJson(data);
  }

  Future<MerchantReviewViewerState> getMerchantReviewViewerState({
    required String merchantId,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/customer/reviews/merchant/$merchantId/viewer-state',
    );

    final body = res.data ?? {};
    final data = Map<String, dynamic>.from((body['data'] as Map?) ?? const {});
    return MerchantReviewViewerState.fromJson(data);
  }

  Future<void> createMerchantReview({
    required String orderId,
    required String merchantId,
    required int rating,
    required String comment,
    List<File> newImages = const [],
    File? newVideo,
  }) async {
    final form = FormData();

    form.fields.addAll([
      MapEntry('order_id', orderId),
      MapEntry('merchant_id', merchantId),
      MapEntry('rating', rating.toString()),
      MapEntry('comment', comment),
    ]);

    for (final file in newImages) {
      form.files.add(
        MapEntry(
          'images',
          await MultipartFile.fromFile(
            file.path,
            filename: file.uri.pathSegments.last,
          ),
        ),
      );
    }

    if (newVideo != null) {
      form.files.add(
        MapEntry(
          'video',
          await MultipartFile.fromFile(
            newVideo.path,
            filename: newVideo.uri.pathSegments.last,
          ),
        ),
      );
    }

    await _dio.post<Map<String, dynamic>>(
      '/customer/reviews/merchant',
      data: form,
      options: Options(contentType: 'multipart/form-data'),
    );
  }

  Future<void> updateMerchantReview({
    required String reviewId,
    required int rating,
    required String comment,
    List<String> keptRemoteImageUrls = const [],
    String? keptRemoteVideoUrl,
    List<File> newImages = const [],
    File? newVideo,
  }) async {
    final form = FormData();

    form.fields.addAll([
      MapEntry('rating', rating.toString()),
      MapEntry('comment', comment),
      MapEntry('kept_remote_image_urls', jsonEncode(keptRemoteImageUrls)),
      if (keptRemoteVideoUrl != null)
        MapEntry('kept_remote_video_url', keptRemoteVideoUrl),
    ]);

    for (final file in newImages) {
      form.files.add(
        MapEntry(
          'images',
          await MultipartFile.fromFile(
            file.path,
            filename: file.uri.pathSegments.last,
          ),
        ),
      );
    }

    if (newVideo != null) {
      form.files.add(
        MapEntry(
          'video',
          await MultipartFile.fromFile(
            newVideo.path,
            filename: newVideo.uri.pathSegments.last,
          ),
        ),
      );
    }

    await _dio.patch<Map<String, dynamic>>(
      '/customer/reviews/merchant/$reviewId',
      data: form,
      options: Options(contentType: 'multipart/form-data'),
    );
  }

  Future<void> deleteMerchantReview(String reviewId) async {
    await _dio.delete<Map<String, dynamic>>(
      '/customer/reviews/merchant/$reviewId',
    );
  }
}
