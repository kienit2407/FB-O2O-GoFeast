import 'package:customer/core/network/dio_client.dart';
import 'package:dio/dio.dart';

class UserProfileRepository {
  UserProfileRepository(this._dio);

  final DioClient _dio;

  Future<void> updateProfile({
    String? fullName,
    String? phone,
    String? gender,
    DateTime? dateOfBirth,
    bool clearGender = false,
    bool clearDateOfBirth = false,
  }) async {
    final data = <String, dynamic>{};

    if (fullName != null) data['full_name'] = fullName.trim();
    if (phone != null) data['phone'] = phone.trim();
    if (gender != null) data['gender'] = gender;
    if (clearGender) data['gender'] = null;

    if (dateOfBirth != null) {
      data['date_of_birth'] = dateOfBirth.toIso8601String();
    }
    if (clearDateOfBirth) data['date_of_birth'] = null;

    await _dio.patch('/customers/me/profile', data: data);
  }

  Future<void> uploadAvatar(String filePath) async {
    final fileName = filePath.split('/').last;

    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
    });

    await _dio.post('/customers/me/avatar', data: form);
  }

  Future<void> removeAvatar() async {
    await _dio.delete('/customers/me/avatar');
  }
}
