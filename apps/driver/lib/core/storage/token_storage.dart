import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_ce/hive.dart';

class TokenStorage {
  static const _boxName = 'authToken';
  static const _refreshKey = 'refreshToken';
  static const _accessKey = 'accessToken';
  static const _hiveKey = 'key';

  final FlutterSecureStorage _secureStorage;
  Box? _box;

  TokenStorage({FlutterSecureStorage? secureStorage}) : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  Future<void> init() async {
    await _getBox(); // mở box 1 lần
  }

  Future<Box> _getBox() async {
    if (_box != null && _box!.isOpen) return _box!;

    String? encryptionKey = await _secureStorage.read(key: _hiveKey);
    if (encryptionKey == null) {
      final newKey = Hive.generateSecureKey();
      encryptionKey = base64UrlEncode(newKey);
      await _secureStorage.write(key: _hiveKey, value: encryptionKey);
    }
    final key = base64Url.decode(encryptionKey);

    _box = await Hive.openBox(
      _boxName,
      encryptionCipher: HiveAesCipher(key),
    );
    return _box!;
  }

  Future<String?> getAccessToken() async {
    final box = await _getBox();
    return box.get(_accessKey) as String?;
  }

  Future<String?> getRefreshToken() async {
    final box = await _getBox();
    return box.get(_refreshKey) as String?;
  }

  Future<void> saveToken(String accessToken, String refreshToken) async {
    final box = await _getBox();
    await box.put(_accessKey, accessToken);
    await box.put(_refreshKey, refreshToken);
  }

  Future<void> clearToken() async {
    final box = await _getBox();
    await box.clear();
  }
}
