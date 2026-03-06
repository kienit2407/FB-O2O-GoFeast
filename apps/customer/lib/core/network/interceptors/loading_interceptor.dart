import 'dart:async';
import 'package:customer/core/utils/global_loading.dart'; // Import file của bạn
import 'package:dio/dio.dart';

class LoadingInterceptor extends Interceptor {
  int _inflightRequests = 0;
  Timer? _fakeProgressTimer;
  double _currentProgress = 0.0;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (_inflightRequests == 0) {
      showGlobalLoading(); 
      _startFakeProgress(); // Bắt đầu chạy % giả
    }
    _inflightRequests++;
    
    super.onRequest(options, handler);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    _stopLoading();
    super.onResponse(response, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _stopLoading();
    super.onError(err, handler);
  }

  void _startFakeProgress() {
    _currentProgress = 0.1; // Bắt đầu ở 10%
    updateGlobalLoading(_currentProgress);

    _fakeProgressTimer?.cancel();
    // Cứ mỗi 200ms thì nhích phần trăm lên một xíu (nhích chậm dần)
    _fakeProgressTimer = Timer.periodic(const Duration(milliseconds: 200), (timer) {
      if (_currentProgress >= 0.9) {
        timer.cancel(); // Dừng lại ở 90%, đợi API xong thì mới chạy nốt 100%
      } else {
        // Công thức tính nhích % chậm dần (giống nprogress)
        _currentProgress += (1.0 - _currentProgress) * 0.1;
        updateGlobalLoading(_currentProgress);
      }
    });
  }

  void _stopLoading() {
    if (_inflightRequests > 0) {
      _inflightRequests--;
    }
    if (_inflightRequests == 0) {
      _fakeProgressTimer?.cancel();
      updateGlobalLoading(1.0); // Cho nó chạy vọt lên 100%
      
      // Đợi 300ms cho UI kịp diễn hoạt animation đầy thanh rồi mới ẩn
      Future.delayed(const Duration(milliseconds: 300), () {
        hideGlobalLoading();
      });
    }
  }
}