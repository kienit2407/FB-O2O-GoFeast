import 'dart:io';
import 'package:driver/core/storage/token_storage.dart';
import 'package:driver/features/auth/data/models/driver_models.dart';
import 'package:driver/features/auth/data/repository/driver_auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'driver_auth_state.dart';

class DriverAuthController extends StateNotifier<DriverAuthState> {
  DriverAuthController({
    required DriverAuthRepository repo,
    required TokenStorage tokenStorage,
  }) : _repo = repo,
       _tokenStorage = tokenStorage,
       super(const DriverAuthState()) {
    bootstrap();
  }

  final DriverAuthRepository _repo;
  final TokenStorage _tokenStorage;

  Future<void> bootstrap() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final access = await _tokenStorage.getAccessToken();
      final refresh = await _tokenStorage.getRefreshToken();

      if (access == null || refresh == null) {
        state = state.copyWith(isLoading: false, me: null);
        return;
      }

      final me = await _repo.getMe();
      state = state.copyWith(isLoading: false, me: me);
    } catch (e) {
      state = state.copyWith(isLoading: false, me: null, error: e.toString());
    }
  }

  Future<void> refreshMe() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final me = await _repo.getMe();
      state = state.copyWith(isLoading: false, me: me);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
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
    state = const DriverAuthState(me: null);
  }

  Future<void> submitMultipart({
    required Map<String, dynamic> fields,
    File? idCardFront,
    File? idCardBack,
    File? licenseImage,
    File? vehicleImage,
    File? avatarImage,
    String? idCardFrontUrl,
    String? idCardBackUrl,
    String? licenseImageUrl,
    String? vehicleImageUrl,
    String? avatarUrl,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final access = await _tokenStorage.getAccessToken();
      if (access == null) throw Exception('Missing access token');

      await _repo.submitMultipart(
        accessToken: access,
        fields: fields,
        idCardFront: idCardFront,
        idCardBack: idCardBack,
        licenseImage: licenseImage,
        vehicleImage: vehicleImage,
        avatarImage: avatarImage,
        idCardFrontUrl: idCardFrontUrl,
        idCardBackUrl: idCardBackUrl,
        licenseImageUrl: licenseImageUrl,
        vehicleImageUrl: vehicleImageUrl,
        avatarUrl: avatarUrl,
      );

      final me = await _repo.getMe();
      state = state.copyWith(isLoading: false, me: me);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<String> uploadImage({required File file, required String folder}) {
    return _repo.uploadImage(file: file, folder: folder);
  }
}
