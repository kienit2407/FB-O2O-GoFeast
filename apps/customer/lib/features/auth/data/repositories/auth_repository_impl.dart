import 'package:customer/features/auth/data/models/auth_user_model.dart';

import '../../domain/entities/auth_user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../../../../core/storage/token_storage.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remote;
  final TokenStorage tokenStorage;

  AuthRepositoryImpl({required this.remote, required this.tokenStorage});

  @override
  Future<AuthUser?> bootstrap() async {
    // nếu có token -> gọi me, không có -> guest
    try {
      return await fetchMe();
    } catch (_) {
      return null;
    }
  }

  @override
  Future<AuthUser?> updatePhone(String phone) async {
    final json = await remote.updatePhone(phone);
    if (json == null) return null;
    return AuthUserModel.fromJson(json);
  }

  @override
  Future<void> saveTokens(String accessToken, String refreshToken) =>
      tokenStorage.saveToken(accessToken, refreshToken);

  @override
  Future<AuthUser?> fetchMe() async {
    final json = await remote.me();
    if (json == null) return null;
    return AuthUserModel.fromJson(json);
  }

  @override
  Future<void> logout() async {
    final rt = await tokenStorage.getRefreshToken();
    try {
      await remote.logout(rt);
    } catch (_) {}
    await tokenStorage.clearToken();
  }

  // ✅ add
  @override
  Future<void> registerDevice({String? fcmToken}) async {
    await remote.registerDevice(fcmToken: fcmToken);
  }
}
