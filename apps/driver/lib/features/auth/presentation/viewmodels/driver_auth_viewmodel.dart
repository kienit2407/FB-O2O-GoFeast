import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:driver/core/di/providers.dart';
import 'package:driver/core/storage/token_storage.dart';

import 'package:driver/features/auth/data/models/driver_models.dart';
import 'package:driver/features/auth/data/repository/driver_auth_repository.dart';

// Provider cho repository
final driverAuthRepositoryProvider = Provider<DriverAuthRepository>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return DriverAuthRepository(dio);
});

class DriverAuthViewModel extends AsyncNotifier<DriverMe?> {
  late final TokenStorage _tokenStorage;
  late final DriverAuthRepository _repo;

  @override
  Future<DriverMe?> build() async {
    _tokenStorage = ref.read(tokenStorageProvider);
    _repo = ref.read(driverAuthRepositoryProvider);
    return _bootstrap();
  }

  Future<DriverMe?> _bootstrap() async {
    final access = await _tokenStorage.getAccessToken();
    final refresh = await _tokenStorage.getRefreshToken();
    if (access == null || refresh == null) return null;

    try {
      return await _repo.getMe();
    } catch (_) {
      await _tokenStorage.clearToken();
      return null;
    }
  }

  Future<void> submitMultipart({
    required Map<String, dynamic> fields,
    File? idCardFront,
    File? idCardBack,
    File? licenseImage,
    File? vehicleImage,

    String? idCardFrontUrl,
    String? idCardBackUrl,
    String? licenseImageUrl,
    String? vehicleImageUrl,
  }) async {
    state = await AsyncValue.guard(() async {
      // ✅ optional nhưng rất nên có
      // await ensureFreshAccessToken();
      final access = await _tokenStorage.getAccessToken();
      if (access == null) throw Exception('Missing access token');

      await _repo.submitMultipart(
        accessToken: access,
        fields: fields,
        idCardFront: idCardFront,
        idCardBack: idCardBack,
        licenseImage: licenseImage,
        vehicleImage: vehicleImage,
        idCardFrontUrl: idCardFrontUrl,
        idCardBackUrl: idCardBackUrl,
        licenseImageUrl: licenseImageUrl,
        vehicleImageUrl: vehicleImageUrl,
      );
      return await _repo.getMe();
    });
  }
  // ========= actions =========

  Future<void> refreshMe() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return await _repo.getMe();
    });
  }

  Future<void> signInWithTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _tokenStorage.saveToken(accessToken, refreshToken);
    await refreshMe();
  }

  Future<void> logout() async {
    try {
      final refresh = await _tokenStorage.getRefreshToken();
      await _repo.logout(refreshToken: refresh);
    } catch (_) {}

    await _tokenStorage.clearToken();
    state = const AsyncData(null);
  }

  Future<void> saveDraft(Map<String, dynamic> patch) async {
    state = await AsyncValue.guard(() async {
      await _repo.saveDraft(patch);
      return await _repo.getMe();
    });
  }

  Future<void> submit(Map<String, dynamic> payload) async {
    state = await AsyncValue.guard(() async {
      await _repo.submit(payload);
      return await _repo.getMe();
    });
  }

  /// Upload ảnh -> url
  Future<String> uploadImage({
    required File file,
    required String folder,
  }) async {
    return _repo.uploadImage(file: file, folder: folder);
  }
}
