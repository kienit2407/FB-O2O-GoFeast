String? parseTableIdFromQr(String raw) {
  final value = raw.trim();
  if (value.isEmpty) return null;

  // case 1: raw tableId luôn
  final objectId = RegExp(r'^[a-fA-F0-9]{24}$');
  if (objectId.hasMatch(value)) return value;

  // case 2: URL
  final uri = Uri.tryParse(value);
  if (uri != null) {
    final segments = uri.pathSegments.map((e) => e.trim()).toList();

    // /scan/table/:tableId
    final idx = segments.indexOf('table');
    if (idx >= 0 && idx + 1 < segments.length) {
      final tableId = segments[idx + 1];
      if (objectId.hasMatch(tableId)) return tableId;
    }

    // fallback query ?tableId=...
    final q1 = uri.queryParameters['tableId'];
    if (q1 != null && objectId.hasMatch(q1)) return q1;

    final q2 = uri.queryParameters['table_id'];
    if (q2 != null && objectId.hasMatch(q2)) return q2;
  }

  return null;
}
