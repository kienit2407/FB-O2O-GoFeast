import 'dart:math' as math;
import 'package:driver/app/theme/app_color.dart';
import 'package:flutter/material.dart';

class SlideToAccept extends StatefulWidget {
  const SlideToAccept({
    super.key,
    required this.text,
    required this.onSubmit,
    this.loading = false,
    this.height = 58,
  });

  final String text;
  final Future<void> Function() onSubmit;
  final bool loading;
  final double height;

  @override
  State<SlideToAccept> createState() => _SlideToAcceptState();
}

class _SlideToAcceptState extends State<SlideToAccept> {
  double _dx = 0;
  bool _submitted = false;

  void _reset() {
    if (!mounted) return;
    setState(() {
      _dx = 0;
      _submitted = false;
    });
  }

  @override
  void didUpdateWidget(covariant SlideToAccept oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (!widget.loading && oldWidget.loading && !_submitted) {
      _reset();
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const horizontalPadding = 4.0;
        final trackWidth = constraints.maxWidth;
        final thumbSize = widget.height - 8;
        final maxDx = math.max(
          0.0,
          trackWidth - thumbSize - (horizontalPadding * 2),
        );

        final progress = maxDx <= 0 ? 0.0 : (_dx / maxDx).clamp(0.0, 1.0);

        Future<void> handleSubmit() async {
          if (_submitted || widget.loading) return;
          setState(() {
            _submitted = true;
            _dx = maxDx;
          });
          await widget.onSubmit();
        }

        return Container(
          height: widget.height,
          decoration: BoxDecoration(
            color: AppColor.primaryLight,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColor.border),
          ),
          child: Stack(
            children: [
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 90),
                  width: thumbSize + (maxDx * progress),
                  decoration: BoxDecoration(
                    color: AppColor.primary.withOpacity(.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
              Positioned.fill(
                child: Center(
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 120),
                    opacity: 1 - (progress * 0.75),
                    child: Text(
                      widget.loading ? 'Đang gửi yêu cầu...' : widget.text,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColor.textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: horizontalPadding + _dx,
                top: 4,
                child: GestureDetector(
                  onHorizontalDragUpdate: widget.loading
                      ? null
                      : (details) {
                          setState(() {
                            _dx = (_dx + details.delta.dx).clamp(0.0, maxDx);
                          });
                        },
                  onHorizontalDragEnd: widget.loading
                      ? null
                      : (_) async {
                          final accepted = progress >= 0.88;
                          if (accepted) {
                            await handleSubmit();
                          } else {
                            _reset();
                          }
                        },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 100),
                    width: thumbSize,
                    height: thumbSize,
                    decoration: BoxDecoration(
                      color: AppColor.primary,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: const [
                        BoxShadow(
                          blurRadius: 10,
                          offset: Offset(0, 4),
                          color: Color(0x26000000),
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: widget.loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.4,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(
                            Icons.arrow_forward_rounded,
                            color: Colors.white,
                            size: 28,
                          ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
