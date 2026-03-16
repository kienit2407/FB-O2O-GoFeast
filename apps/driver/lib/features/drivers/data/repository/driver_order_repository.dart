import 'dart:io';

import 'package:dio/dio.dart';
import 'package:driver/core/network/dio_client.dart';

class DriverOrderRepository {
  DriverOrderRepository(this._dio);
  final DioClient _dio;

  Future<void> arrived(String orderId, {String? note}) =>
      _dio.patch('/driver/orders/$orderId/arrived', data: {'note': note});

  Future<void> pickedUp(String orderId, {String? note}) =>
      _dio.patch('/driver/orders/$orderId/picked-up', data: {'note': note});

  Future<void> delivering(String orderId, {String? note}) =>
      _dio.patch('/driver/orders/$orderId/delivering', data: {'note': note});

  Future<void> delivered(String orderId, {String? note}) =>
      _dio.patch('/driver/orders/$orderId/delivered', data: {'note': note});

  Future<void> complete(
    String orderId, {
    required List<String> proofImages,
    String? note,
  }) => _dio.patch(
    '/driver/orders/$orderId/complete',
    data: {'proof_of_delivery_images': proofImages, 'note': note},
  );
  Future<Map<String, dynamic>?> fetchCurrentOrder() async {
    final res = await _dio.get('/driver/orders/current');

    final responseBody = res is Map<String, dynamic> ? res : res.data;
    final data = responseBody?['data'];

    if (data == null) return null;
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>?> fetchRoute({
    required double originLat,
    required double originLng,
    required double destinationLat,
    required double destinationLng,
    String mode = 'motorcycling',
  }) async {
    final res = await _dio.get(
      '/geo/route',
      queryParameters: {
        'originLat': originLat,
        'originLng': originLng,
        'destinationLat': destinationLat,
        'destinationLng': destinationLng,
        'mode': mode,
      },
    );

    final responseBody = res is Map<String, dynamic> ? res : res.data;
    final data = responseBody?['data'];

    if (data == null) return null;
    return Map<String, dynamic>.from(data as Map);
  }

  Future<List<String>> uploadProofImages(List<File> files) async {
    final formData = FormData();

    for (final file in files) {
      formData.files.add(
        MapEntry(
          'files',
          await MultipartFile.fromFile(
            file.path,
            filename: file.uri.pathSegments.isNotEmpty
                ? file.uri.pathSegments.last
                : 'image.jpg',
          ),
        ),
      );
    }

    final res = await _dio.post(
      '/driver/orders/upload-proof-images',
      data: formData,
    );

    final responseBody = res is Map<String, dynamic> ? res : res.data;
    final data = responseBody?['data'];

    if (data is! List) return [];

    return data
        .map((e) => (e as Map<String, dynamic>)['url']?.toString() ?? '')
        .where((x) => x.isNotEmpty)
        .toList();
  }
}
