// lib/core/di/providers.dart

import 'package:driver/core/network/dio_client.dart';
import 'package:driver/core/push/fcm_service.dart';
import 'package:driver/core/shared/contants/url_config.dart';
import 'package:driver/core/storage/device_id_storage.dart';
import 'package:driver/core/storage/token_storage.dart';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';
import 'package:dio/dio.dart';

// Giữ nguyên 2 provider bạn đang có
final dioClientProvider = Provider<DioClient>((ref) {
  throw UnimplementedError('dioClientProvider chưa được override');
});

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  throw UnimplementedError('tokenStorageProvider chưa được override');
});
final fcmServiceProvider = Provider((ref) => FcmService());
/// ✅ Bootstrap theo kiểu DI chuẩn:
/// main chỉ gọi await bootstrapOverrides() rồi runApp(ProviderScope(overrides: ...))
Future<List<Override>> bootstrapOverrides() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Phần UI overlay y như bạn đang làm trong main
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      systemNavigationBarColor: Colors.transparent,
      statusBarColor: Colors.transparent,
    ),
  );

  // Hive init (bạn đang làm trong main)
  await Hive.initFlutter();

  // Token storage init
  final tokenStorage = TokenStorage();
  await tokenStorage.init();

  // DeviceId init
  final deviceId = await DeviceIdStorage().getDeviceId();

  // Tạo DioClient + refreshTokens wiring (không để ở main nữa)
  late final DioClient dioClient;

  Future<(String accessToken, String refreshToken)> refreshTokensFromApi(
    String refreshToken,
  ) async {
    //  Quan trọng: call refresh bằng chính dioClient nhưng có extra để:
    // - không attach Authorization (skip auth)
    // - không trigger refresh lại nếu refresh 401 (skip auth refresh)
    final res = await dioClient.post<Map<String, dynamic>>(
      UrlConfig.refreshToken,
      data: {'refreshToken': refreshToken},
      options: Options(
        extra: const {'__skipAuth': true, '__skipAuthRefresh': true},
      ),
    );

    final body = res.data ?? {};
    final payload = (body['data'] as Map).cast<String, dynamic>();
    final access = payload['accessToken'] as String;
    final refresh = payload['refreshToken'] as String;
    return (access, refresh);
  }

  dioClient = await DioClient.create(
    tokenStorage: tokenStorage,
    baseUrl: UrlConfig.backendBaseUrl,
    deviceId: deviceId,
    refreshTokens: refreshTokensFromApi,
  );

  return [
    tokenStorageProvider.overrideWithValue(tokenStorage),
    dioClientProvider.overrideWithValue(dioClient),
  ];
}
