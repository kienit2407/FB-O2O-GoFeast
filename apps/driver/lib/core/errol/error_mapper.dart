import 'package:dio/dio.dart';
import 'app_exception.dart';

class ErrorMapper {
  static AppException fromDio(DioException e) {
    // Network-level
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return const NetworkException('Network error. Please try again.');
    }

    final status = e.response?.statusCode;
    final data = e.response?.data;

    final parsed = _parseErrorPayload(data);
    final msg = parsed.message ?? e.message ?? 'Something went wrong';
    final code = parsed.code;
    final details = parsed.details;

    if (status == 400) return BadRequestException(msg, statusCode: status, code: code, details: details);
    if (status == 401) return UnauthorizedException(msg, statusCode: status, code: code, details: details);
    if (status == 404) return NotFoundException(msg, statusCode: status, code: code, details: details);
    if (status == 429) return TooManyRequestsException(msg, statusCode: status, code: code, details: details);

    if (status != null && status >= 500) {
      return ServerException(msg, statusCode: status, code: code, details: details);
    }

    return UnknownException(msg, statusCode: status, code: code, details: details);
  }

  static _ParsedError _parseErrorPayload(dynamic data) {
    if (data is Map<String, dynamic>) {
      // case 1: {msg, code, details}
      if (data['msg'] is String || data['code'] != null || data['details'] != null) {
        return _ParsedError(
          message: data['msg'] as String?,
          code: data['code']?.toString(),
          details: data['details'] is Map<String, dynamic> ? data['details'] as Map<String, dynamic> : null,
        );
      }
      // case 2: {error: {message, code, details}}
      final err = data['error'];
      if (err is Map<String, dynamic>) {
        return _ParsedError(
          message: (err['message'] ?? err['msg'])?.toString(),
          code: err['code']?.toString(),
          details: err['details'] is Map<String, dynamic> ? err['details'] as Map<String, dynamic> : null,
        );
      }
    }
    return const _ParsedError();
  }
}

class _ParsedError {
  final String? message;
  final String? code;
  final Map<String, dynamic>? details;
  const _ParsedError({this.message, this.code, this.details});
}
