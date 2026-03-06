// lib/main_shell.dart
import 'dart:ui';

import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/utils/global_loading.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:customer/features/home/presentation/pages/home_page.dart';
import 'package:customer/features/home/presentation/widgets/qr_scan.dart';
import 'package:customer/features/profile/presentation/pages/profile_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:lottie/lottie.dart';

class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _index = 0;

  // Ẩn/hiện nav bar khi scroll (chỉ ở tab Home)
  bool _isVisible = true;

  // Lazy build (đúng length = 5)
  final List<bool> _built = [true, false, false, false, false];

  // TODO: Thay các trang này bằng page thật của dự án bạn
  final List<Widget> _pages = const [
    HomePage(),
    SizedBox.shrink(), // OrdersPage()
    SizedBox.shrink(), // (placeholder cho Scan - không dùng)
    SizedBox.shrink(), // NotificationsPage() hoặc FavoritesPage tuỳ dự án
    ProfilePage(),
  ];

  Future<void> _openScanner(BuildContext context) async {
    // TODO: thay QrScanPage bằng màn hình scan thật của bạn
    final result = await Navigator.of(
      context,
    ).push<String>(MaterialPageRoute(builder: (_) => const QrScanPage()));

    if (!mounted) return;

    if (result != null && result.isNotEmpty) {
      // Bạn tự xử lý kết quả QR ở đây
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('QR: $result')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final double bottomPadding = MediaQuery.of(context).padding.bottom;
    const double navBarHeight = 55.0;
    final authState = ref.watch(authViewModelProvider);
    final user = authState.valueOrNull;
    return Scaffold(
      extendBody: true,
      body: NotificationListener<UserScrollNotification>(
        onNotification: (notification) {
          if (_index != 0) return true;

          if (notification.metrics.axis == Axis.vertical) {
            if (notification.direction == ScrollDirection.reverse) {
              if (_isVisible) setState(() => _isVisible = false);
            } else if (notification.direction == ScrollDirection.forward) {
              if (!_isVisible) setState(() => _isVisible = true);
            }
          }
          return true;
        },
        child: Stack(
          children: [
            IndexedStack(
              index: _index,
              children: List.generate(_pages.length, (i) {
                if (!_built[i]) return const SizedBox.shrink();
                return _pages[i];
              }),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ValueListenableBuilder<double>(
            valueListenable: globalLoadingProgress,
            builder: (context, progress, child) {
              if (progress < 0) {
                return const SizedBox(
                  height: 3,
                ); // Giữ khoảng trống để tránh giật UI
              }

              return TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOut,
                tween: Tween<double>(begin: 0, end: progress),
                builder: (context, value, _) {
                  return LinearProgressIndicator(
                    value: value,
                    minHeight: 3,
                    color: AppColor.primary, // Dùng màu thương hiệu của bạn
                    backgroundColor: Colors.transparent,
                  );
                },
              );
            },
          ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            height: _isVisible ? (navBarHeight + bottomPadding) : 0,
            transform: Matrix4.translationValues(0, _isVisible ? 0 : 120, 0),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                // Nền blur + NavigationBar
                ClipRect(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: Container(
                      alignment: Alignment.topCenter,
                      decoration: BoxDecoration(
                        border: Border(
                          top: BorderSide(
                            color: AppColor.textPrimary.withOpacity(.4),
                            width: .4,
                          ),
                        ),
                        color: Colors.white.withOpacity(.75),
                      ),
                      child: Material(
                        type: MaterialType.transparency, // ✅ trong suốt thật
                        child: NavigationBarTheme(
                          data: NavigationBarThemeData(
                            iconTheme: WidgetStateProperty.resolveWith((
                              states,
                            ) {
                              if (states.contains(WidgetState.selected)) {
                                return const IconThemeData(
                                  color: AppColor.primary,
                                );
                              }
                              return const IconThemeData(
                                color: Color(0xff6C757D),
                              );
                            }),
                            labelTextStyle: WidgetStateProperty.resolveWith((
                              states,
                            ) {
                              if (states.contains(WidgetState.selected)) {
                                return const TextStyle(
                                  color: AppColor.primary,
                                  fontSize: 10,
                                );
                              }
                              return const TextStyle(
                                color: Color(0xff6C757D),
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                              );
                            }),
                          ),
                          child: NavigationBar(
                            height: navBarHeight,
                            labelPadding: EdgeInsets.zero,
                            backgroundColor: Colors.transparent,
                            surfaceTintColor: Colors.transparent,
                            overlayColor: const WidgetStatePropertyAll(
                              Colors.transparent,
                            ),
                            indicatorColor: Colors.transparent,
                            selectedIndex: _index,
                            onDestinationSelected: (i) {
                              // tab giữa chỉ là placeholder, không làm gì
                              if (i == 2) return;
                              if (i == 2) {
                                _isVisible = true;
                                _openScanner(context);
                                return;
                              }

                              setState(() {
                                _index = i;
                                _built[i] = true;
                                _isVisible =
                                    true; // chuyển tab thì hiện nav ngay
                              });
                            },
                            destinations: [
                              NavigationDestination(
                                icon: Icon(Icons.restaurant_outlined),
                                selectedIcon: Icon(Icons.restaurant),
                                label: 'Home',
                              ),
                              NavigationDestination(
                                icon: Icon(Icons.receipt_long_outlined),
                                selectedIcon: Icon(Icons.receipt_long),
                                label: 'Đơn hàng',
                              ),

                              // Placeholder vị trí giữa để chừa slot cho nút Scan nổi
                              NavigationDestination(
                                icon: SizedBox.shrink(),
                                selectedIcon: SizedBox.shrink(),
                                label: '',
                              ),

                              NavigationDestination(
                                icon: Icon(Iconsax.notification_copy),
                                selectedIcon: Icon(Iconsax.notification),
                                label: 'Thông báo',
                              ),
                              NavigationDestination(
                                icon:
                                    (user?.avatarUrl != null &&
                                        user!.avatarUrl!.isNotEmpty)
                                    ? CircleAvatar(
                                        radius: 12,
                                        backgroundImage: NetworkImage(
                                          user.avatarUrl!,
                                        ),
                                        backgroundColor: Colors.transparent,
                                      )
                                    : Icon(Iconsax.user_copy),
                                selectedIcon:
                                    (user?.avatarUrl != null &&
                                        user!.avatarUrl!.isNotEmpty)
                                    ? Container(
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: AppColor.primary,
                                            width: 1.5,
                                          ),
                                        ),
                                        child: CircleAvatar(
                                          radius: 12,
                                          backgroundImage: NetworkImage(
                                            user.avatarUrl!,
                                          ),
                                          backgroundColor: Colors.transparent,
                                        ),
                                      )
                                    : const Icon(Iconsax.user),
                                label: 'Tài khoản',
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

                // Nút Scan nổi ở giữa
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: bottomPadding + 2,
                  child: _ScanButton(onTap: () => _openScanner(context)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ScanButton extends StatefulWidget {
  const _ScanButton({required this.onTap, this.size = 54, this.color});

  final VoidCallback onTap;
  final double size;
  final Color? color;

  @override
  State<_ScanButton> createState() => _ScanButtonState();
}

class _ScanButtonState extends State<_ScanButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.color ?? AppColor.primary;

    const double spread = 14; // 👈 giảm/tăng để vòng tỏa nhỏ/lớn

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // ✅ giữ đúng size nút -> không bị đội lên cao
        SizedBox(
          width: widget.size,
          height: widget.size,
          child: Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              IgnorePointer(
                child: OverflowBox(
                  maxWidth: widget.size + spread * 2,
                  maxHeight: widget.size + spread * 2,
                  child: AnimatedBuilder(
                    animation: _ctrl,
                    builder: (_, __) {
                      final paintSize = widget.size + spread * 2;
                      return CustomPaint(
                        size: Size.square(paintSize),
                        painter: _PulsePainter(
                          t: _ctrl.value,
                          color: c,
                          baseRadius: widget.size / 2,
                          spread: spread,
                        ),
                      );
                    },
                  ),
                ),
              ),

              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: widget.onTap,
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    width: widget.size,
                    height: widget.size,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: c,
                      boxShadow: [
                        BoxShadow(
                          blurRadius: 14,
                          spreadRadius: -3,
                          offset: const Offset(0, 0),
                          color: c,
                        ),
                      ],
                    ),
                    child: SizedBox(
                      width: 12,
                      height: 12,
                      child: Lottie.asset(
                        'assets/icons/scan_icon.json',
                        delegates: LottieDelegates(
                          values: [
                            ValueDelegate.color(
                              const ['**'],
                              // value: Colors.black
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Scan',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: Color(0xff6C757D),
          ),
        ),
      ],
    );
  }
}

class _PulsePainter extends CustomPainter {
  _PulsePainter({
    required this.t,
    required this.color,
    required this.baseRadius,
    required this.spread,
  });

  final double t; // 0..1
  final Color color;
  final double baseRadius;
  final double spread;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    const rings = 3;
    for (int i = 0; i < rings; i++) {
      final phase = (t + i / rings) % 1.0;

      final radius = baseRadius + phase * spread; // ✅ nhỏ gọn
      final opacity = (1.0 - phase) * 0.20; // ✅ nhẹ hơn

      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = _lerp(6, 1.5, phase)
        ..color = color.withOpacity(opacity.clamp(0.0, 1.0));

      canvas.drawCircle(center, radius, paint);
    }
  }

  double _lerp(double a, double b, double t) => a + (b - a) * t;

  @override
  bool shouldRepaint(covariant _PulsePainter oldDelegate) =>
      oldDelegate.t != t ||
      oldDelegate.color != color ||
      oldDelegate.baseRadius != baseRadius ||
      oldDelegate.spread != spread;
}
