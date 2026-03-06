import '../entities/auth_user.dart';

abstract class AuthRepository {
  Future<AuthUser?> bootstrap();
  Future<void> saveTokens(String accessToken, String refreshToken);
  Future<AuthUser?> fetchMe();
  Future<void> logout();
  Future<void> registerDevice({String? fcmToken});
  Future<AuthUser?> updatePhone(String phone);
}
