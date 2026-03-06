import 'package:hive_ce/hive.dart';
import 'package:uuid/uuid.dart';

class DeviceIdStorage {
  static const _boxName = 'device_settings';
  static const _deviceIdKey = 'x_device_id';

  // Mở box (Box này không cần mã hoá để đọc cho nhanh)
  Future<Box> _openBox() async {
    if (Hive.isBoxOpen(_boxName)) {
      return Hive.box(_boxName);
    }
    return await Hive.openBox(_boxName);
  }

  // Hàm quan trọng nhất: Lấy ID, nếu chưa có thì tạo mới
  Future<String> getDeviceId() async {
    final box = await _openBox();
    String? deviceId = box.get(_deviceIdKey);

    if (deviceId == null) {
      deviceId = const Uuid().v4(); // Tạo ID mới
      await box.put(_deviceIdKey, deviceId); // Lưu lại vĩnh viễn
    }
    return deviceId;
  }
}