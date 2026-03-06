import 'package:flutter/foundation.dart';

// Đổi từ ValueNotifier<bool> sang ValueNotifier<double>
// Giá trị -1.0 nghĩa là đang ẨN loading
// Giá trị từ 0.0 đến 1.0 là phần trăm tiến độ (0% đến 100%)
final ValueNotifier<double> globalLoadingProgress = ValueNotifier<double>(-1.0);

// Hàm show loading (mặc định bắt đầu từ 0%)
void showGlobalLoading() {
  globalLoadingProgress.value = 0.0;
}

// Hàm cập nhật phần trăm (từ 0.0 đến 1.0)
void updateGlobalLoading(double progress) {
  globalLoadingProgress.value = progress;
}

// Hàm ẩn loading
void hideGlobalLoading() {
  globalLoadingProgress.value = -1.0;
}