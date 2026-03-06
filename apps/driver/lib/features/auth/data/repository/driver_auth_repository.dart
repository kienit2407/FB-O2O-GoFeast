import 'dart:io';
import 'package:dio/dio.dart';
import '../models/driver_models.dart';

class DriverAuthRepository {
  DriverAuthRepository(this._dio);
  final Dio _dio;

  // ====== ENDPOINTS (KHỚP BE) ======
  static const String meEndpoint = '/auth/driver/me';
  static const String onboardingEndpoint = '/auth/driver/onboarding';
  static const String onboardingSubmitEndpoint =
      '/auth/driver/onboarding/submit';
  static const String logoutEndpoint = '/auth/driver/logout';
  static const String refreshEndpoint = '/auth/driver/refresh';
  // Upload lên Cloudinary qua BE (bạn đang dùng cái này)
  static const String uploadEndpoint = '/auth/driver/upload';
  static const String registerDeviceEndpoint = '/auth/driver/device/register';
  static const String onboardingSubmitMultipartEndpoint =
      '/auth/driver/onboarding/submit-multipart';

  // =========================
  // Helpers
  // =========================
  Map<String, dynamic> _unwrapMap(Response res) {
    final body = res.data;
    if (body is Map && body['data'] is Map) {
      return Map<String, dynamic>.from(body['data'] as Map);
    }
    if (body is Map) return Map<String, dynamic>.from(body);
    throw Exception('Invalid response');
  }

  String _unwrapMessage(Object? errData) {
    if (errData is Map) {
      final msg = errData['message'];
      if (msg is String) return msg;
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
    }
    return 'Request failed';
  }

  Never _throwDio(DioException e) {
    final msg = _unwrapMessage(e.response?.data);
    throw Exception(msg);
  }

  // =========================
  // API
  // =========================

  Future<DriverMe?> getMe() async {
    try {
      final res = await _dio.get(meEndpoint);
      final data = _unwrapMap(res);
      // BE trả {id,email,phone,..., driver_profile:{}}
      return DriverMe.fromJson(data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) return null;
      _throwDio(e);
    }
  }

  /// PATCH /auth/driver/onboarding
  Future<void> saveDraft(Map<String, dynamic> patch) async {
    try {
      await _dio.patch(onboardingEndpoint, data: patch);
    } on DioException catch (e) {
      _throwDio(e);
    }
  }

  /// POST /auth/driver/onboarding/submit
  Future<void> submit(Map<String, dynamic> payload) async {
    try {
      await _dio.post(onboardingSubmitEndpoint, data: payload);
    } on DioException catch (e) {
      _throwDio(e);
    }
  }

  Future<void> submitMultipart({
    required Map<String, dynamic> fields,
    required String accessToken,
    File? idCardFront,
    File? idCardBack,
    File? licenseImage,
    File? vehicleImage,

    // fallback urls nếu user không chọn lại ảnh
    String? idCardFrontUrl,
    String? idCardBackUrl,
    String? licenseImageUrl,
    String? vehicleImageUrl,
  }) async {
    try {
      final form = FormData.fromMap({
        ...fields,

        // ✅ nếu có file thì gửi file
        if (idCardFront != null)
          'idCardFront': await MultipartFile.fromFile(
            idCardFront.path,
            filename: idCardFront.path.split('/').last,
          )
        else if (idCardFrontUrl != null)
          'idCardFrontUrl': idCardFrontUrl,

        if (idCardBack != null)
          'idCardBack': await MultipartFile.fromFile(
            idCardBack.path,
            filename: idCardBack.path.split('/').last,
          )
        else if (idCardBackUrl != null)
          'idCardBackUrl': idCardBackUrl,

        if (licenseImage != null)
          'licenseImage': await MultipartFile.fromFile(
            licenseImage.path,
            filename: licenseImage.path.split('/').last,
          )
        else if (licenseImageUrl != null)
          'licenseImageUrl': licenseImageUrl,

        if (vehicleImage != null)
          'vehicleImage': await MultipartFile.fromFile(
            vehicleImage.path,
            filename: vehicleImage.path.split('/').last,
          )
        else if (vehicleImageUrl != null)
          'vehicleImageUrl': vehicleImageUrl,
      });

      await _dio.post(
        onboardingSubmitMultipartEndpoint,
        data: form,
        options: Options(
          contentType: 'multipart/form-data',
          headers: {'Authorization': 'Bearer $accessToken'},
        ),
      );
    } on DioException catch (e) {
      _throwDio(e);
    }
  }

  Future<void> logout({String? refreshToken}) async {
    try {
      await _dio.post(
        logoutEndpoint,
        data: {if (refreshToken != null) 'refreshToken': refreshToken},
      );
    } on DioException catch (e) {
      // logout fail vẫn không quá critical, nhưng để debug thì throw
      _throwDio(e);
    }
  }

  Future<void> registerDevice({
    required String deviceId,
    required String platform, // android/ios
    String? fcmToken,
  }) async {
    await _dio.post(
      registerDeviceEndpoint,
      data: {'deviceId': deviceId, 'platform': platform, 'fcmToken': fcmToken},
    );
  }

  /// Upload -> trả URL
  /// body: { folder, file }
  Future<String> uploadImage({
    required File file,
    required String folder,
    String fieldName = 'file',
  }) async {
    try {
      final form = FormData.fromMap({
        'folder': folder,
        fieldName: await MultipartFile.fromFile(
          file.path,
          filename: file.path.split('/').last,
        ),
      });

      final res = await _dio.post(
        uploadEndpoint,
        data: form,
        options: Options(contentType: 'multipart/form-data'),
      );

      final body = res.data;

      // hỗ trợ: {success:true,data:{url}} hoặc {url}
      if (body is Map &&
          body['data'] is Map &&
          (body['data'] as Map)['url'] != null) {
        return (body['data'] as Map)['url'].toString();
      }
      if (body is Map && body['url'] != null) return body['url'].toString();

      throw Exception('Upload failed: missing url');
    } on DioException catch (e) {
      _throwDio(e);
    }
  }

  Future<Map<String, String>> refreshTokens(String refreshToken) async {
    try {
      final res = await _dio.post(
        refreshEndpoint,
        data: {'refreshToken': refreshToken},
      );
      final body = res.data;

      // expect: { success:true, data:{ accessToken, refreshToken } }
      final data = (body is Map) ? body['data'] : null;
      if (data is Map &&
          data['accessToken'] != null &&
          data['refreshToken'] != null) {
        return {
          'accessToken': data['accessToken'].toString(),
          'refreshToken': data['refreshToken'].toString(),
        };
      }
      throw Exception('Invalid refresh response');
    } on DioException catch (e) {
      _throwDio(e);
    }
  }
}
