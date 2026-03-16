import 'package:customer/core/network/dio_client.dart';
import 'package:customer/features/orders/data/models/customer_my_reviews_models.dart';
import 'package:customer/features/orders/data/models/customer_order_detail_model.dart';
import 'package:customer/features/orders/data/models/customer_review_models.dart';
import 'package:dio/dio.dart';
import 'package:customer/features/orders/data/models/my_order_models.dart';

class MyOrdersRepository {
  final DioClient _dio;
  MyOrdersRepository(this._dio);
  Options get _multipartOptions => Options(contentType: 'multipart/form-data');
  Future<MyOrdersTabCounts> fetchTabCounts() async {
    final res = await _dio.get('/orders/me/tab-counts');
    return MyOrdersTabCounts.fromJson(
      (res.data['data'] as Map).cast<String, dynamic>(),
    );
  }

  Future<CustomerOrderDetail> fetchCustomerOrderDetail(String orderId) async {
    final res = await _dio.get('/orders/me/$orderId');
    return CustomerOrderDetail.fromJson(
      (res.data['data'] as Map).cast<String, dynamic>(),
    );
  }

  Future<void> cancelPendingOrder(String orderId, {String? reason}) async {
    await _dio.patch(
      '/orders/me/$orderId/cancel',
      data: {
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
  }

  Future<MyOrderListResponse> fetchActiveOrders({
    int limit = 10,
    String? cursor,
  }) async {
    final res = await _dio.get(
      '/orders/me/active',
      queryParameters: {
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );

    return MyOrderListResponse.fromJson(
      (res.data['data'] as Map).cast<String, dynamic>(),
    );
  }

  Future<MyOrderListResponse> fetchHistoryOrders({
    int limit = 10,
    String? cursor,
  }) async {
    final res = await _dio.get(
      '/orders/me/history',
      queryParameters: {
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );

    return MyOrderListResponse.fromJson(
      (res.data['data'] as Map).cast<String, dynamic>(),
    );
  }

  Future<MyReviewListResponse> fetchMyReviews({
    String type = 'all',
    int limit = 10,
    String? cursor,
  }) async {
    final res = await _dio.get(
      '/customer/reviews/mine',
      queryParameters: {
        'type': type,
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );

    return MyReviewListResponse.fromJson(
      (res.data['data'] as Map).cast<String, dynamic>(),
    );
  }

  Future<CustomerOrderReviewStatusModel> fetchOrderReviewStatus(
    String orderId,
  ) async {
    final res = await _dio.get('/customer/reviews/order/$orderId/status');
    return CustomerOrderReviewStatusModel.fromJson(
      (res.data['data'] as Map).cast<String, dynamic>(),
    );
  }

  Future<void> createMerchantReview(CustomerReviewSubmitInput input) async {
    final form = FormData.fromMap({
      'order_id': input.orderId,
      'merchant_id': input.merchantId,
      'rating': input.rating.toString(),
      'comment': input.comment,
      'images': [
        for (final file in input.newImages)
          await MultipartFile.fromFile(
            file.path,
            filename: file.path.split('/').last,
          ),
      ],
      if (input.newVideo != null)
        'video': await MultipartFile.fromFile(
          input.newVideo!.path,
          filename: input.newVideo!.path.split('/').last,
        ),
    });

    await _dio.post(
      '/customer/reviews/merchant',
      data: form,
      options: _multipartOptions,
    );
  }

  Future<void> updateMerchantReview(
    String reviewId,
    CustomerReviewSubmitInput input,
  ) async {
    final form = FormData.fromMap({
      'rating': input.rating.toString(),
      'comment': input.comment,
      'kept_remote_image_urls': input.keptRemoteImageUrls,
      if (input.keptRemoteVideoUrl != null)
        'kept_remote_video_url': input.keptRemoteVideoUrl,
      'images': [
        for (final file in input.newImages)
          await MultipartFile.fromFile(
            file.path,
            filename: file.path.split('/').last,
          ),
      ],
      if (input.newVideo != null)
        'video': await MultipartFile.fromFile(
          input.newVideo!.path,
          filename: input.newVideo!.path.split('/').last,
        ),
    });

    await _dio.patch(
      '/customer/reviews/merchant/$reviewId',
      data: form,
      options: _multipartOptions,
    );
  }

  Future<void> deleteMyMerchantReview(String reviewId) async {
    await _dio.delete('/customer/reviews/merchant/$reviewId');
  }

  Future<void> createDriverReview(CustomerReviewSubmitInput input) async {
    final form = FormData.fromMap({
      'order_id': input.orderId,
      'driver_user_id': input.driverUserId,
      'rating': input.rating.toString(),
      'comment': input.comment,
      'images': [
        for (final file in input.newImages)
          await MultipartFile.fromFile(
            file.path,
            filename: file.path.split('/').last,
          ),
      ],
      if (input.newVideo != null)
        'video': await MultipartFile.fromFile(
          input.newVideo!.path,
          filename: input.newVideo!.path.split('/').last,
        ),
    });

    await _dio.post(
      '/customer/reviews/driver',
      data: form,
      options: _multipartOptions,
    );
  }

  Future<void> updateDriverReview(
    String reviewId,
    CustomerReviewSubmitInput input,
  ) async {
    final form = FormData.fromMap({
      'rating': input.rating.toString(),
      'comment': input.comment,
      'kept_remote_image_urls': input.keptRemoteImageUrls,
      if (input.keptRemoteVideoUrl != null)
        'kept_remote_video_url': input.keptRemoteVideoUrl,
      'images': [
        for (final file in input.newImages)
          await MultipartFile.fromFile(
            file.path,
            filename: file.path.split('/').last,
          ),
      ],
      if (input.newVideo != null)
        'video': await MultipartFile.fromFile(
          input.newVideo!.path,
          filename: input.newVideo!.path.split('/').last,
        ),
    });

    await _dio.patch(
      '/customer/reviews/driver/$reviewId',
      data: form,
      options: _multipartOptions,
    );
  }

  Future<void> deleteMyDriverReview(String reviewId) async {
    await _dio.delete('/customer/reviews/driver/$reviewId');
  }

  Future<CustomerMyReviewsSummary> fetchMyReviewsSummary() async {
    final res = await _dio.get('/customer/reviews/mine/summary');
    return CustomerMyReviewsSummary.fromJson(
      (res.data['data'] as Map).cast<String, dynamic>(),
    );
  }

  Future<void> createProductReview(CustomerReviewSubmitInput input) async {
    final form = FormData.fromMap({
      'order_id': input.orderId,
      'merchant_id': input.merchantId,
      'product_id': input.productId,
      'rating': input.rating.toString(),
      'comment': input.comment,
      'images': [
        for (final file in input.newImages)
          await MultipartFile.fromFile(
            file.path,
            filename: file.path.split('/').last,
          ),
      ],
      if (input.newVideo != null)
        'video': await MultipartFile.fromFile(
          input.newVideo!.path,
          filename: input.newVideo!.path.split('/').last,
        ),
    });

    await _dio.post(
      '/customer/reviews/product',
      data: form,
      options: _multipartOptions,
    );
  }

  Future<void> updateProductReview(
    String reviewId,
    CustomerReviewSubmitInput input,
  ) async {
    final form = FormData.fromMap({
      'rating': input.rating.toString(),
      'comment': input.comment,
      'kept_remote_image_urls': input.keptRemoteImageUrls,
      if (input.keptRemoteVideoUrl != null)
        'kept_remote_video_url': input.keptRemoteVideoUrl,
      'images': [
        for (final file in input.newImages)
          await MultipartFile.fromFile(
            file.path,
            filename: file.path.split('/').last,
          ),
      ],
      if (input.newVideo != null)
        'video': await MultipartFile.fromFile(
          input.newVideo!.path,
          filename: input.newVideo!.path.split('/').last,
        ),
    });

    await _dio.patch(
      '/customer/reviews/product/$reviewId',
      data: form,
      options: _multipartOptions,
    );
  }

  Future<void> deleteMyProductReview(String reviewId) async {
    await _dio.delete('/customer/reviews/product/$reviewId');
  }

  Future<MyDraftCartListResponse> fetchDraftCarts({
    int limit = 10,
    String? cursor,
  }) async {
    final res = await _dio.get(
      '/carts/delivery/drafts',
      queryParameters: {
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );

    return MyDraftCartListResponse.fromJson(
      (res.data['data'] as Map?)?.cast<String, dynamic>() ??
          (res.data as Map).cast<String, dynamic>(),
    );
  }

  Future<void> clearAllDraftCarts() async {
    await _dio.post('/carts/delivery/drafts/clear-all');
  }
}
