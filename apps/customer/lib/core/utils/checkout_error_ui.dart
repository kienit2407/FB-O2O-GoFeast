import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

String mapCheckoutErrorMessage(Object? error) {
  final raw = (error?.toString() ?? '').trim();

  if (raw.contains('Address is outside merchant delivery radius')) {
    return 'Rất tiếc, địa chỉ của bạn nằm ngoài khu vực giao hàng của quán. Vui lòng thay đổi địa chỉ giao hàng hoặc chọn quán gần hơn nhé.';
  }

  if (raw.contains('Merchant is not accepting orders')) {
    return 'Quán hiện chưa nhận đơn. Vui lòng thử lại sau nhé.';
  }

  if (raw.contains('Cart is empty')) {
    return 'Giỏ hàng của bạn đang trống.';
  }

  if (raw.contains('Can not calculate route for this address') ||
      raw.contains('TrackAsia') ||
      raw.contains('BadGatewayException')) {
    return 'Không thể tính quãng đường giao hàng cho địa chỉ này. Vui lòng thử lại hoặc chọn địa chỉ khác.';
  }

  if (raw.contains('Active delivery cart not found')) {
    return 'Không tìm thấy giỏ hàng hiện tại.';
  }

  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

Future<void> showCheckoutErrorDialog(
  BuildContext context, {
  required String message,
}) async {
  if (!context.mounted) return;

  await showCupertinoDialog<void>(
    context: context,
    builder: (ctx) {
      return CupertinoAlertDialog(
        content: Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15),
          ),
        ),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK', style: TextStyle(color: Color(0xFFEE4D2D))),
          ),
        ],
      );
    },
  );
}
