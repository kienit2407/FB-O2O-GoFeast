import 'dart:async';
import 'package:flutter/material.dart';

const double kMerchantCartBarH = 54; // chỉnh 60-72 tuỳ UI bar bạn

Future<T?> showBottomOverlaySheet<T>({
  required BuildContext context,
  required double bottomGap,
  required Widget Function(BuildContext ctx, void Function([T? result]) close)
  builder,
  Color barrierColor = const Color(0x59000000), // ~35%
  Duration duration = const Duration(milliseconds: 220),
}) {
  final overlay = Overlay.of(context, rootOverlay: true);
  if (overlay == null) return Future.value(null);

  final completer = Completer<T?>();
  late OverlayEntry entry;

  entry = OverlayEntry(
    builder: (ctx) => _BottomOverlayHost<T>(
      bottomGap: bottomGap,
      barrierColor: barrierColor,
      duration: duration,
      onClosed: (result) {
        if (entry.mounted) entry.remove();
        if (!completer.isCompleted) completer.complete(result);
      },
      builder: builder,
    ),
  );

  overlay.insert(entry);
  return completer.future;
}

class _BottomOverlayHost<T> extends StatefulWidget {
  const _BottomOverlayHost({
    required this.bottomGap,
    required this.barrierColor,
    required this.duration,
    required this.onClosed,
    required this.builder,
  });

  final double bottomGap;
  final Color barrierColor;
  final Duration duration;
  final void Function(T? result) onClosed;
  final Widget Function(BuildContext ctx, void Function([T? result]) close)
  builder;

  @override
  State<_BottomOverlayHost<T>> createState() => _BottomOverlayHostState<T>();
}

class _BottomOverlayHostState<T> extends State<_BottomOverlayHost<T>>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;
  bool _closing = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _close([T? result]) async {
    if (_closing) return;
    _closing = true;
    await _ctrl.reverse();
    widget.onClosed(result);
  }

  @override
  Widget build(BuildContext context) {
    final screenH = MediaQuery.of(context).size.height;
    final sheetH = (screenH - widget.bottomGap).clamp(0.0, screenH);

    // ✅ QUAN TRỌNG:
    // Root Stack không tự hit-test -> vùng bottomGap trống sẽ "lọt" click xuống _MerchantCartBar.
    return Stack(
      children: [
        // barrier CHỈ phủ tới trên bar
        Positioned.fill(
          bottom: widget.bottomGap,
          child: FadeTransition(
            opacity: _fade,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => _close(),
              child: ColoredBox(color: widget.barrierColor),
            ),
          ),
        ),

        // sheet nằm trên bar
        Positioned(
          left: 0,
          right: 0,
          bottom: widget.bottomGap,
          height: sheetH,
          child: SlideTransition(
            position: _slide,
            child: Material(
              type: MaterialType.transparency, //  cấp Material cho InkWell
              child: widget.builder(context, _close),
            ),
          ),
        ),
      ],
    );
  }
}
