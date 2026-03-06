import 'package:customer/features/merchant/data/models/merchant_detail_model.dart';
import 'package:customer/features/merchant/presentation/pages/merchant_detail_page.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

String formatDistance(double? km) {
  if (km == null) return '';
  if (km <= 0) return '';

  if (km < 1) {
    final m = (km * 1000).round();
    return '${m}m';
  }

  if (km < 10) {
    return '${km.toStringAsFixed(1)} km';
  }

  return '${km.round()} km';
}

String hhmm(DateTime dt) =>
    '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

String promotionText(AutoPromotion p) {
  final isPercent = p.type == 'percentage';
  final discount = isPercent
      ? 'Giảm ${p.discountValue.toStringAsFixed(0)}%'
      : 'Giảm ${money(p.discountValue)}';

  final maxPart = (p.maxDiscount > 0) ? ' tối đa ${money(p.maxDiscount)}' : '';
  final minPart = (p.minOrderAmount > 0)
      ? ' cho đơn từ ${money(p.minOrderAmount)}'
      : '';
  final levelPart = (p.applyLevel == 'shipping') ? ' trên phí vận chuyển' : '';

  return '$discount$maxPart$levelPart$minPart';
}

String vnRemoveDiacritics(String str) {
  // Giữ nguyên độ dài (1 ký tự -> 1 ký tự), để index match dùng được cho text gốc
  const withDia =
      'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩ'
      'òóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ'
      'ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨ'
      'ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ';
  const withoutDia =
      'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
      'AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD';

  final map = <String, String>{};
  for (int i = 0; i < withDia.length; i++) {
    map[withDia[i]] = withoutDia[i];
  }

  final sb = StringBuffer();
  for (final ch in str.characters) {
    sb.write(map[ch] ?? ch);
  }
  return sb.toString();
}

Future<void> openGoogleMaps(String address) async {
  // 1. Mã hóa chuỗi địa chỉ (đổi dấu cách thành %20, v.v. để URL không bị lỗi)
  final String encodedAddress = Uri.encodeComponent(address);

  // 2. Tạo URI chuẩn của Google Maps
  final Uri mapUri = Uri.parse(
    'https://www.google.com/maps/search/?api=1&query=$encodedAddress',
  );

  // 3. Kiểm tra và mở URL
  if (await canLaunchUrl(mapUri)) {
    // Dùng LaunchMode.externalApplication để ép mở bằng App Google Maps (nếu có) thay vì mở trình duyệt ẩn
    await launchUrl(mapUri, mode: LaunchMode.externalApplication);
  } else {
    // Xử lý khi thiết bị không thể mở được link (ví dụ: hiển thị SnackBar báo lỗi)
    print('Không thể mở Google Maps cho địa chỉ này.');
  }
}

List<TextSpan> buildHighlightedSpans({
  required String text,
  required String query,
  required TextStyle normal,
  required TextStyle highlight,
}) {
  final qRaw = query.trim();
  if (qRaw.isEmpty || text.isEmpty) {
    return [TextSpan(text: text, style: normal)];
  }

  final src = vnRemoveDiacritics(text.toLowerCase());
  final q = vnRemoveDiacritics(qRaw.toLowerCase());

  if (q.isEmpty) return [TextSpan(text: text, style: normal)];

  final spans = <TextSpan>[];
  int from = 0;

  int idx = src.indexOf(q, from);
  while (idx != -1) {
    final start = idx;
    final end = idx + q.length;

    // ✅ chặn mọi trường hợp vượt biên (đây là chỗ bạn đang bị crash)
    if (start < 0 || start > text.length) break;
    if (end < 0 || end > text.length) break;

    if (start > from) {
      spans.add(TextSpan(text: text.substring(from, start), style: normal));
    }
    spans.add(TextSpan(text: text.substring(start, end), style: highlight));

    from = end;
    if (from >= src.length) break;
    idx = src.indexOf(q, from);
  }

  if (from < text.length) {
    spans.add(TextSpan(text: text.substring(from), style: normal));
  }

  // Nếu không match thì trả nguyên text
  if (spans.isEmpty) return [TextSpan(text: text, style: normal)];
  return spans;
}
