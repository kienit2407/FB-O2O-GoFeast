// lib/core/network/dio_client.dart
import 'package:customer/core/errol/error_mapper.dart';
import 'package:customer/core/network/interceptors/auth_interceptor.dart';
import 'package:customer/core/network/interceptors/loading_interceptor.dart';
import 'package:customer/core/storage/token_storage.dart';
import 'package:dio/dio.dart';
import 'package:dio_cache_interceptor/dio_cache_interceptor.dart';
import 'package:dio_smart_retry/dio_smart_retry.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';

class DioClient {
  final TokenStorage tokenStorage;
  final String baseUrl;
  final String deviceId;

  late final Dio dio;
  late final CacheOptions cacheOptions;

  DioClient._internal({
    required this.tokenStorage,
    required this.baseUrl,
    required this.deviceId,
  });

  static Future<DioClient> create({
    required TokenStorage tokenStorage,
    required String baseUrl,
    required String deviceId,
    required Future<(String accessToken, String refreshToken)> Function(
      String refreshToken,
    )
    refreshTokens,
  }) async {
    final client = DioClient._internal(
      tokenStorage: tokenStorage,
      baseUrl: baseUrl,
      deviceId: deviceId,
    );

    client._initCache();
    client._initDio(refreshTokens: refreshTokens);
    return client;
  }

  void _initCache() {
    cacheOptions = CacheOptions(
      store: MemCacheStore(),
      policy: CachePolicy.request,
      maxStale: const Duration(minutes: 1),
      hitCacheOnNetworkFailure: true,
      allowPostMethod: false,
    );
  }

  void _initDio({
    required Future<(String accessToken, String refreshToken)> Function(
      String refreshToken,
    )
    refreshTokens,
  }) {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-client-platform': 'mobile',
          "x-client-app": "customer_mobile",
          'x-device-id': deviceId,
        },
        // Cho phép 4xx đi qua để bạn đọc body lỗi (msg/code/details)
        validateStatus: (status) =>
            status != null && status >= 200 && status < 400,
        responseType: ResponseType.json,
      ),
    );

    dio.interceptors.addAll([
      LoadingInterceptor(),
      DioCacheInterceptor(options: cacheOptions),

      AuthInterceptor(
        dio: dio,
        getAccessToken: tokenStorage.getAccessToken,
        getRefreshToken: tokenStorage.getRefreshToken,
        saveToken: tokenStorage.saveToken,
        refreshTokens: refreshTokens,
        onSessionExpired: () async {
          await tokenStorage.clearToken();
        },
      ),

      RetryInterceptor(
        dio: dio,
        retries: 3,
        retryDelays: const [
          Duration(seconds: 1),
          Duration(seconds: 2),
          Duration(seconds: 3),
        ],
        retryEvaluator: (e, attempt) {
          // chỉ retry network/5xx
          if (e.type == DioExceptionType.connectionError ||
              e.type == DioExceptionType.connectionTimeout ||
              e.type == DioExceptionType.sendTimeout ||
              e.type == DioExceptionType.receiveTimeout)
            return true;

          final status = e.response?.statusCode;
          return status != null && status >= 500;
        },
      ),

      PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        error: true,
        compact: true,
        maxWidth: 100,
      ),
    ]);
  }

  // Wrapper tiện dùng (optional)
  Future<Response<T>> get<T>(
  String path, {
  Map<String, dynamic>? queryParameters,
  Options? options,
  CancelToken? cancelToken, // ✅ thêm
}) async {
  try {
    return await dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken, // ✅ forward
    );
  } on DioException catch (e) {
    throw ErrorMapper.fromDio(e);
  }
}
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await dio.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw ErrorMapper.fromDio(e);
    }
  }

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await dio.patch<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw ErrorMapper.fromDio(e);
    }
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw ErrorMapper.fromDio(e);
    }
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw ErrorMapper.fromDio(e);
    }
  }
}
