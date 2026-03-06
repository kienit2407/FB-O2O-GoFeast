import 'dart:io';

import 'package:dio/dio.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/shared/contants/url_config.dart';

class AuthRemoteDataSource {
  final DioClient _client;
  AuthRemoteDataSource(this._client);

  Future<Map<String, dynamic>?> me() async {
    final res = await _client.get<Map<String, dynamic>>(UrlConfig.customerMe);
    return res.data?['data'] as Map<String, dynamic>?;
  }

  Future<(String access, String refresh)> refresh(String refreshToken) async {
    final res = await _client.post<Map<String, dynamic>>(
      UrlConfig.refreshToken,
      data: {'refreshToken': refreshToken},
      options: Options(
        extra: const {'__skipAuth': true, '__skipAuthRefresh': true},
      ),
    );

    //  BE của bạn đang trả { success: true, data: { accessToken, refreshToken } }
    final data = (res.data?['data'] as Map?)?.cast<String, dynamic>() ?? {};
    return (data['accessToken'] as String, data['refreshToken'] as String);
  }

  //  ADD: register device (upsert user_devices)
  Future<void> registerDevice({String? fcmToken}) async {
    final platform = Platform.isAndroid
        ? 'android'
        : (Platform.isIOS ? 'ios' : 'unknown');

    final body = <String, dynamic>{
      'deviceId': _client.deviceId,
      'platform': platform,
      if (fcmToken != null && fcmToken.isNotEmpty) 'fcmToken': fcmToken,
    };

    await _client.post(UrlConfig.customerDeviceRegister, data: body);
  }

  Future<Map<String, dynamic>?> updatePhone(String phone) async {
    final res = await _client.put<Map<String, dynamic>>(
      '/users/phone',
      data: {'phone': phone},
    );
    return (res.data?['data'] as Map?)?.cast<String, dynamic>();
  }

  Future<void> logout(String? refreshToken) async {
    await _client.post(
      UrlConfig.customerLogout,
      data: {'refreshToken': refreshToken},
      options: Options(
        extra: const {'__skipAuth': true, '__skipAuthRefresh': true},
      ),
    );
  }
}
