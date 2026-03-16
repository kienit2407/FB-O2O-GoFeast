import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/promotion/data/models/promotion_models.dart';

class PromotionPopupEntry extends ConsumerStatefulWidget {
  const PromotionPopupEntry({super.key});

  @override
  ConsumerState<PromotionPopupEntry> createState() =>
      _PromotionPopupEntryState();
}

class _PromotionPopupEntryState extends ConsumerState<PromotionPopupEntry> {
  bool _loading = false;

  // giữ trạng thái trong suốt vòng đời app process
  static bool _shownInThisAppSession = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadAndShowIfNeeded);
  }

  Future<void> _loadAndShowIfNeeded() async {
    if (!mounted || _loading || _shownInThisAppSession) return;

    _loading = true;

    try {
      final repo = ref.read(promotionRepositoryProvider);
      final promo = await repo.getPopupPromotion();

      if (!mounted || promo == null) return;

      _shownInThisAppSession = true;

      final action = await showGeneralDialog<String>(
        context: context,
        barrierDismissible: true,
        barrierLabel: 'promotion_popup',
        barrierColor: Colors.black.withOpacity(0.58),
        transitionDuration: const Duration(milliseconds: 400),
        pageBuilder: (context, animation, secondaryAnimation) {
          return SafeArea(child: _PromotionPopupDialog(promo: promo));
        },
        transitionBuilder: (context, animation, secondaryAnimation, child) {
          return ScaleTransition(
            scale: CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutBack,
            ),
            child: FadeTransition(opacity: animation, child: child),
          );
        },
      );

      if (!mounted) return;

      if (action == 'detail') {
        context.push('/promotion/${promo.id}');
      }
    } catch (_) {
      // tránh crash app
    } finally {
      _loading = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}

class _PromotionPopupDialog extends StatelessWidget {
  const _PromotionPopupDialog({required this.promo});

  final PopupPromotionItem promo;

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.of(context).size;
    final maxWidth = screen.width * 0.9;
    final maxHeight = screen.height * 0.82;

    return Material(
      color: Colors.transparent,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(24),
                  onTap: () => Navigator.of(context).pop('detail'),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x40000000),
                          blurRadius: 24,
                          offset: Offset(0, 12),
                        ),
                      ],
                    ),
                    child: _PromotionPopupImageCard(
                      promo: promo,
                      maxWidth: maxWidth,
                      maxHeight: maxHeight,
                    ),
                  ),
                ),
              ),
              Positioned(
                right: -5,
                top: -20,
                child: IconButton(
                  onPressed: () => Navigator.of(context).pop('close'),
                  icon: const Icon(
                    Icons.close,
                    color: Colors.black38,
                    size: 18,
                  ),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white60,
                    shape: const CircleBorder(),
                    padding: const EdgeInsets.all(0),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PromotionPopupImageCard extends StatefulWidget {
  const _PromotionPopupImageCard({
    required this.promo,
    required this.maxWidth,
    required this.maxHeight,
  });

  final PopupPromotionItem promo;
  final double maxWidth;
  final double maxHeight;

  @override
  State<_PromotionPopupImageCard> createState() =>
      _PromotionPopupImageCardState();
}

class _PromotionPopupImageCardState extends State<_PromotionPopupImageCard> {
  double? _aspectRatio;
  bool _hasError = false;

  ImageStream? _imageStream;
  ImageStreamListener? _imageListener;

  @override
  void initState() {
    super.initState();
    _resolveImage();
  }

  @override
  void didUpdateWidget(covariant _PromotionPopupImageCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.promo.bannerUrl != widget.promo.bannerUrl) {
      _clearImageListener();
      _aspectRatio = null;
      _hasError = false;
      _resolveImage();
    }
  }

  @override
  void dispose() {
    _clearImageListener();
    super.dispose();
  }

  void _resolveImage() {
    final url = widget.promo.bannerUrl;
    if (url == null || url.trim().isEmpty) return;

    final provider = NetworkImage(url);
    final stream = provider.resolve(const ImageConfiguration());

    final listener = ImageStreamListener(
      (info, _) {
        final width = info.image.width.toDouble();
        final height = info.image.height.toDouble();
        if (width > 0 && height > 0 && mounted) {
          setState(() {
            _aspectRatio = width / height;
          });
        }
      },
      onError: (_, __) {
        if (mounted) {
          setState(() {
            _hasError = true;
          });
        }
      },
    );

    _imageStream = stream;
    _imageListener = listener;
    stream.addListener(listener);
  }

  void _clearImageListener() {
    final stream = _imageStream;
    final listener = _imageListener;
    if (stream != null && listener != null) {
      stream.removeListener(listener);
    }
    _imageStream = null;
    _imageListener = null;
  }

  @override
  Widget build(BuildContext context) {
    final hasImage =
        !_hasError &&
        widget.promo.bannerUrl != null &&
        widget.promo.bannerUrl!.trim().isNotEmpty;

    final ratio = (_aspectRatio ?? 0.72).clamp(0.45, 1.5);
    final height = (widget.maxWidth / ratio).clamp(240.0, widget.maxHeight);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
      width: widget.maxWidth,
      height: height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(21),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (hasImage)
              Image.network(
                widget.promo.bannerUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) {
                  return _PromotionBannerFallback(
                    width: widget.maxWidth,
                    height: height,
                  );
                },
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return Container(
                    color: AppColor.primaryLight,
                    alignment: Alignment.center,
                    child: const SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator.adaptive(),
                    ),
                  );
                },
              )
            else
              _PromotionBannerFallback(width: widget.maxWidth, height: height),
            Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.transparent,
                        Colors.black.withOpacity(0.10),
                        Colors.black.withOpacity(0.42),
                      ],
                      stops: const [0, 0.55, 0.8, 1],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 12,
              right: 12,
              bottom: 14,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _PromotionCountdownChip(
                    startDate: widget.promo.validFrom,
                    endDate: widget.promo.validTo,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PromotionBannerFallback extends StatelessWidget {
  const _PromotionBannerFallback({required this.width, required this.height});

  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColor.headerGradStart, AppColor.headerGradEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      alignment: Alignment.center,
      child: const Icon(
        Icons.local_offer_rounded,
        color: Colors.white,
        size: 64,
      ),
    );
  }
}

class _PromotionCountdownChip extends StatefulWidget {
  const _PromotionCountdownChip({
    required this.startDate,
    required this.endDate,
  });

  final String? startDate;
  final String? endDate;

  @override
  State<_PromotionCountdownChip> createState() =>
      _PromotionCountdownChipState();
}

class _PromotionCountdownChipState extends State<_PromotionCountdownChip> {
  Timer? _timer;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _now = DateTime.now();
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  DateTime? _parse(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    return DateTime.tryParse(value)?.toLocal();
  }

  String _formatDuration(Duration d) {
    if (d.isNegative) return '00:00:00';

    final days = d.inDays;
    final hours = d.inHours.remainder(24);
    final minutes = d.inMinutes.remainder(60);
    final seconds = d.inSeconds.remainder(60);

    String two(int n) => n.toString().padLeft(2, '0');

    if (days > 0) {
      return '${days}d ${two(hours)}:${two(minutes)}:${two(seconds)}';
    }
    return '${two(hours)}:${two(minutes)}:${two(seconds)}';
  }

  @override
  Widget build(BuildContext context) {
    final start = _parse(widget.startDate);
    final end = _parse(widget.endDate);

    String label;
    String value;

    if (start != null && _now.isBefore(start)) {
      label = 'Bắt đầu sau';
      value = _formatDuration(start.difference(_now));
    } else if (end != null && _now.isBefore(end)) {
      label = 'Kết thúc sau';
      value = _formatDuration(end.difference(_now));
    } else if (end != null && !_now.isBefore(end)) {
      label = 'Khuyến mãi';
      value = 'Đã kết thúc';
    } else {
      label = 'Khuyến mãi';
      value = 'Nhấn để xem chi tiết';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(.96),
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [
          BoxShadow(
            color: Color(0x22000000),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.access_time_rounded,
            size: 16,
            color: AppColor.primary,
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              '$label: $value',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColor.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
