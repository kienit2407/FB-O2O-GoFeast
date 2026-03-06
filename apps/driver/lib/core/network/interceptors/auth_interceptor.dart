import 'dart:async';
import 'package:dio/dio.dart';

typedef GetToken = Future<String?> Function();
typedef SaveToken =
    Future<void> Function(String accessToken, String refreshToken);
typedef RefreshTokens =
    Future<(String accessToken, String refreshToken)> Function(
      String refreshToken,
    );
typedef OnSessionExpired = Future<void> Function();

class AuthInterceptor extends Interceptor {
  final Dio dio;
  final GetToken getAccessToken;
  final GetToken getRefreshToken;
  final SaveToken saveToken;
  final RefreshTokens refreshTokens;
  final OnSessionExpired onSessionExpired;

  bool _isRefreshing = false;
  Completer<void>? _refreshCompleter;

  AuthInterceptor({
    required this.dio,
    required this.getAccessToken,
    required this.getRefreshToken,
    required this.saveToken,
    required this.refreshTokens,
    required this.onSessionExpired,
  });

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // ✅ skip attach token (dùng cho refresh/logout/me guest…)
    if (options.extra['__skipAuth'] == true) {
      handler.next(options);
      return;
    }

    final access = await getAccessToken();
    if (access != null && access.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $access';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final status = err.response?.statusCode;
    final req = err.requestOptions;

    // Chỉ xử lý 401, và tránh loop retry
    final alreadyRetried = req.extra['__retried'] == true;
    final skipRefresh = req.extra['__skipAuthRefresh'] == true;

    if (skipRefresh || status != 401 || alreadyRetried) {
      handler.next(err);
      return;
    }

    try {
      await _refreshIfNeeded();

      // retry request với token mới
      final newReq = await _retryRequest(req);
      handler.resolve(newReq);
    } catch (_) {
      // refresh fail => clear session (không điều hướng UI ở đây)
      await onSessionExpired();
      handler.next(err);
    }
  }

  Future<void> _refreshIfNeeded() async {
    if (_isRefreshing) {
      // chờ refresh đang chạy
      await _refreshCompleter?.future;
      return;
    }

    _isRefreshing = true;
    _refreshCompleter = Completer<void>();

    try {
      final refresh = await getRefreshToken();
      if (refresh == null || refresh.isEmpty)
        throw Exception('No refresh token');

      final tokens = await refreshTokens(refresh);
      await saveToken(tokens.$1, tokens.$2);

      _refreshCompleter?.complete();
    } catch (e) {
      _refreshCompleter?.completeError(e);
      rethrow;
    } finally {
      _isRefreshing = false;
    }
  }

  Future<Response<dynamic>> _retryRequest(RequestOptions requestOptions) async {
    final options = Options(
      method: requestOptions.method,
      headers: Map<String, dynamic>.from(requestOptions.headers),
      responseType: requestOptions.responseType,
      contentType: requestOptions.contentType,
      validateStatus: requestOptions.validateStatus,
      receiveTimeout: requestOptions.receiveTimeout,
      sendTimeout: requestOptions.sendTimeout,
    );

    requestOptions.extra['__retried'] = true;

    return dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }
}
