import 'dart:async';

import 'package:customer/core/di/providers.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/auth_user.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthViewModel extends AsyncNotifier<AuthUser?> {
  late final AuthRepository _repo;

  StreamSubscription<String>? _tokenSub;

  @override
  Future<AuthUser?> build() async {
    _repo = ref.read(authRepositoryProvider);

    //  ĐẶT Ở ĐÂY: lắng nghe token refresh (setup 1 lần)
    _tokenSub ??= FirebaseMessaging.instance.onTokenRefresh.listen((
      newToken,
    ) async {
      try {
        debugPrint('[fcm] onTokenRefresh => registerDevice');
        await _repo.registerDevice(fcmToken: newToken);
      } catch (e) {
        debugPrint('[fcm] registerDevice failed: $e');
      }
    });

    // hủy khi provider bị dispose
    ref.onDispose(() {
      _tokenSub?.cancel();
      _tokenSub = null;
    });

    return _repo.bootstrap();
  }

  Future<void> signInWithTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _repo.saveTokens(accessToken, refreshToken);

    //  LẦN 1: đăng ký device ngay sau login (token có thể null)
    try {
      final fcmService = ref.read(fcmServiceProvider);
      final fcm = await fcmService.getFcmToken();
      await _repo.registerDevice(fcmToken: fcm);
    } catch (e) {
      if (e is DioException) {
        debugPrint('[registerDevice] status=${e.response?.statusCode}');
        debugPrint('[registerDevice] data=${e.response?.data}');
      } else {
        debugPrint('[registerDevice] failed: $e');
      }
    }

    state = const AsyncLoading();
    state = AsyncData(await _repo.fetchMe());
  }

  Future<void> updatePhone(String phone) async {
    state = const AsyncLoading();
    final updated = await _repo.updatePhone(phone);
    state = AsyncData(updated);
  }

  Future<void> refreshMe() async {
    try {
      final user = await _repo.fetchMe();
      // không cần set loading, vì chỉ refresh data
      state = AsyncData(user);
    } catch (e, st) {
      // tuỳ bạn: giữ state cũ hoặc báo lỗi
      debugPrint('[auth] refreshMe failed: $e');
      state = AsyncError(e, st); // nếu muốn show lỗi
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncData(null);
  }
}
