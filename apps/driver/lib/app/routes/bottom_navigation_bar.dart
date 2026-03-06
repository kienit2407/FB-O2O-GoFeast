// lib/main_shell.dart
import 'dart:ui';

import 'package:driver/app/theme/app_color.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:iconsax_flutter/iconsax_flutter.dart';

class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _index = 0;
  // 1. Thêm biến trạng thái để kiểm soát việc Hiện/Ẩn
  bool _isVisible = true;
  final List<bool> _built = [true, false, true, false];

  final _pages = const [
   
  ];

  @override
  Widget build(BuildContext context) {
    // 1. Lấy padding đáy (Vùng Home Indicator của iPhone)
    final double bottomPadding = MediaQuery.of(context).padding.bottom;
    // 2. Định nghĩa chiều cao thực tế của thanh Bar (không tính padding)
    const double navBarHeight = 55.0;
   

    return Scaffold(
      extendBody: true,
      body: NotificationListener<UserScrollNotification>(
        onNotification: (notification) {
          // Nếu không phải là HomePage (index 0) thì không làm gì cả, return luôn
          if (_index != 0) {
            return true;
          }
          // Chỉ xử lý khi cuộn dọc (Axis.vertical)
          // để tránh bị ẩn khi lướt ngang cái Banner Carousel
          if (notification.metrics.axis == Axis.vertical) {
            // Nếu vuốt lên (Scroll xuôi - Reverse) -> Ẩn Menu
            if (notification.direction == ScrollDirection.reverse) {
              if (_isVisible) setState(() => _isVisible = false);
            }
            // Nếu vuốt xuống (Scroll ngược - Forward) -> Hiện Menu
            else if (notification.direction == ScrollDirection.forward) {
              if (!_isVisible) setState(() => _isVisible = true);
            }
          }
          return true; // Cho phép sự kiện tiếp tục lan truyền
        },
        child: Stack(
          children: [
            IndexedStack(
              index: _index,
              children: List.generate(_pages.length, (i) {
                if (!_built[i]) return SizedBox.shrink();
                return _pages[i];
              }),
            ),
            // _pages[_index],
            // PromotionHighlightEntryMobile(),
          ],
        ),
      ),
      bottomNavigationBar: AnimatedContainer(
        duration: const Duration(milliseconds: 300), // Thời gian trượt (0.3s)
        curve: Curves.easeInOut, // Hiệu ứng mượt mà
        height: _isVisible
            ? (navBarHeight + bottomPadding)
            : 0, // Mẹo: Thay đổi chiều cao hoặc dịch chuyển
        // Dùng transform để đẩy nó xuống dưới màn hình khi ẩn
        transform: Matrix4.translationValues(0, _isVisible ? 0 : 100, 0),
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 35, sigmaY: 35),
            child: Container(
              alignment: Alignment.topCenter,
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: AppColor.textPrimary.withOpacity(.4),
                    width: .4,
                  ),
                ),
                color: Colors.white.withOpacity(.7),
                // image: DecorationImage(
                //   image: AssetImage(AppImage.bgNav),
                //   fit: BoxFit.cover,
                // ),
              ),
              child: NavigationBarTheme(
                data: NavigationBarThemeData(
                  iconTheme: WidgetStateProperty.resolveWith((states) {
                    if (states.contains(WidgetState.selected)) {
                      return const IconThemeData(
                        color: AppColor.primary,
                      );
                    }
                    return const IconThemeData(color: Color(0xff6C757D));
                  }),
                  labelTextStyle: WidgetStateProperty.resolveWith((states) {
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
                  overlayColor: WidgetStatePropertyAll(Colors.transparent),
                  indicatorColor: Colors.transparent,
                  selectedIndex: _index,
                  onDestinationSelected: (i) {
                    setState(() {
                      _index = i;
                      _built[i] = true;
                      // QUAN TRỌNG: Khi chuyển tab bất kỳ,
                      // BẮT BUỘC phải hiện lại Nav Bar ngay lập tức
                      _isVisible = true;
                    });
                  },
                  destinations: [
                    const NavigationDestination(
                      icon: Icon(Iconsax.home_copy),
                      selectedIcon: Icon(Iconsax.home_1),
                      label: 'Trang chủ',
                    ),
                    const NavigationDestination(
                      icon: Icon(Iconsax.discount_shape_copy),
                      selectedIcon: Icon(Iconsax.discount_shape),
                      label: 'Khuyến mãi',
                    ),
                    // NavigationDestination(
                    //   icon: _NavIconWithBadge(
                    //     icon: Iconsax.notification_copy,
                    //     count: unread,
                    //   ),
                    //   selectedIcon: _NavIconWithBadge(
                    //     icon: Iconsax.notification,
                    //     count: unread,
                    //   ),
                    //   label: 'Thông báo',
                    // ),
                    // NavigationDestination(
                    //   icon:
                    //       (user?.avatarUrl != null &&
                    //           user!.avatarUrl!.isNotEmpty)
                    //       ? CircleAvatar(
                    //           radius: 12,
                    //           backgroundImage: NetworkImage(user!.avatarUrl!),
                    //           backgroundColor: Colors.transparent,
                    //         )
                    //       : const Icon(Iconsax.user_copy),
                    //   selectedIcon:
                    //       (user?.avatarUrl != null &&
                    //           user!.avatarUrl!.isNotEmpty)
                    //       ? Container(
                    //           decoration: BoxDecoration(
                    //             shape: BoxShape.circle,
                    //             border: Border.all(
                    //               color: AppColor.buttonprimaryCol,
                    //               width: 1.5,
                    //             ),
                    //           ),
                    //           child: CircleAvatar(
                    //             radius: 12,
                    //             backgroundImage: NetworkImage(user!.avatarUrl!),
                    //             backgroundColor: Colors.transparent,
                    //           ),
                    //         )
                    //       : const Icon(Iconsax.user),
                    //   label: 'Tài khoản',
                    // ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavIconWithBadge extends StatelessWidget {
  const _NavIconWithBadge({required this.icon, required this.count});

  final IconData icon;
  final int count;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) {
      return Icon(icon);
    }

    final display = count > 99 ? '99+' : '$count';

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        Positioned(
          right: -6,
          top: -4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
            decoration: BoxDecoration(
              color: Colors.red,
              borderRadius: BorderRadius.circular(999),
            ),
            constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
            child: Text(
              display,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 9,
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
