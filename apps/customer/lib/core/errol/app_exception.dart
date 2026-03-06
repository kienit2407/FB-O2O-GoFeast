sealed class AppException implements Exception {
  final String message;
  final int? statusCode;
  final String? code;
  final Map<String, dynamic>? details;

  const AppException(
    this.message, {
    this.statusCode,
    this.code,
    this.details,
  });

  @override
  String toString() => '$runtimeType($statusCode, $code): $message';
}

final class NetworkException extends AppException {
  const NetworkException(super.message);
}

final class BadRequestException extends AppException {
  const BadRequestException(super.message, {super.statusCode, super.code, super.details});
}

final class UnauthorizedException extends AppException {
  const UnauthorizedException(super.message, {super.statusCode, super.code, super.details});
}

final class NotFoundException extends AppException {
  const NotFoundException(super.message, {super.statusCode, super.code, super.details});
}

final class TooManyRequestsException extends AppException {
  const TooManyRequestsException(super.message, {super.statusCode, super.code, super.details});
}

final class ServerException extends AppException {
  const ServerException(super.message, {super.statusCode, super.code, super.details});
}

final class UnknownException extends AppException {
  const UnknownException(super.message, {super.statusCode, super.code, super.details});
}
