
import 'package:driver/app/theme/app_color.dart';
import 'package:driver/core/assets/app_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  bool _animateOut = false;

  void _startExitAnimationAndNavigate() async {
    if (_animateOut) return;
    setState(() => _animateOut = true);

    await Future.delayed(const Duration(milliseconds: 450));
    if (!mounted) return;

    context.go('/');
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startExitAnimationAndNavigate();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      body: Stack(
        children: [
          // ✅ Logo giữ nguyên ở giữa
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    image: DecorationImage(
                      image: AssetImage(AppImage.bgSplash),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ✅ Loading nằm sát dưới + ngắn lại
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: EdgeInsets.only(
                left: 100, // 👈 chỉnh độ ngắn/dài ở đây
                right: 100, // 👈 chỉnh độ ngắn/dài ở đây
                bottom:
                    bottomPadding +
                    18, // sát dưới nhưng không đè home indicator
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(30),
                child: LinearProgressIndicator(
                  backgroundColor: Colors.grey[200],
                  color: AppColor.primary,
                  minHeight: 5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
