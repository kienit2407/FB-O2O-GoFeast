import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class FcmService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<String?> getFcmToken() async {
    await _requestPermission();

    if (Platform.isIOS) {
      // Đợi APNs token sẵn (tối đa ~5s), không throw
      String? apns;
      for (var i = 0; i < 10; i++) {
        apns = await _messaging.getAPNSToken();
        if (apns != null && apns.isNotEmpty) break;
        await Future.delayed(const Duration(milliseconds: 500));
      }
      debugPrint('[fcm] apns=${apns != null}');
      if (apns == null) {
        // chưa có APNs token thì tạm trả null, lần sau gọi lại
        return null;
      }
    }

    final fcm = await _messaging.getToken();
    debugPrint('[fcm] token=${fcm != null}');
    return fcm;
  }

  Future<void> _requestPermission() async {
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
  }
}
