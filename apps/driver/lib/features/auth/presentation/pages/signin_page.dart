import 'package:driver/app/theme/app_color.dart';
import 'package:driver/core/assets/app_icon.dart';
import 'package:driver/core/shared/contants/url_config.dart';
import 'package:driver/core/storage/device_id_storage.dart';
import 'package:driver/features/auth/presentation/viewmodels/auth_provider.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:go_router/go_router.dart';

class SigninPage extends ConsumerStatefulWidget {
  const SigninPage({super.key});

  @override
  ConsumerState<SigninPage> createState() => _SigninPageState();
}

class _SigninPageState extends ConsumerState<SigninPage> {
  bool _loadingGoogle = false;
  bool _loadingGithub = false;

  Future<void> _oauthLogin(String startUrl, {required String provider}) async {
    final deviceId = await DeviceIdStorage().getDeviceId();
    final urlWithDevice = '$startUrl&deviceId=${Uri.encodeComponent(deviceId)}';
    setState(() {
      if (provider == 'google') _loadingGoogle = true;
      if (provider == 'github') _loadingGithub = true;
    });

    try {
      final result = await FlutterWebAuth2.authenticate(
        url: urlWithDevice,
        callbackUrlScheme: 'myshop',
      );

      final uri = Uri.parse(result);
      final accessToken = uri.queryParameters['accessToken'];
      final refreshToken = uri.queryParameters['refreshToken'];

      if (accessToken == null || refreshToken == null) {
        throw Exception('Thiếu accessToken/refreshToken');
      }

      //  dùng ViewModel provider mới
      await ref
          .read(driverAuthViewModelProvider.notifier)
          .signInWithTokens(
            accessToken: accessToken,
            refreshToken: refreshToken,
          );

      if (!mounted) return;
      context.go('/');
    } catch (_) {
      // TODO: toast/snack nếu muốn
    } finally {
      if (!mounted) return;
      setState(() {
        if (provider == 'google') _loadingGoogle = false;
        if (provider == 'github') _loadingGithub = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColor.primary,
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: 420,
            ), // 👈 chỉnh max width ở đây
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _titlePage(),
                const SizedBox(height: 30),
                _SocialFullButton(
                  label: 'Đăng nhập bằng Google',
                  icon: Image.asset(AppIcon.googleIcon, width: 20, height: 20),
                  loading: _loadingGoogle,

                  onPressed: () => _oauthLogin(
                    UrlConfig.driverGoogleOAuth(),
                    provider: 'google',
                  ),
                ),
                const SizedBox(height: 12),
                _SocialFullButton(
                  label: 'Đăng nhập bằng GitHub',
                  icon: Image.asset(AppIcon.githubIcon, width: 20, height: 20),
                  loading: _loadingGithub,
                  onPressed: () => _oauthLogin(
                    UrlConfig.driverGithubOAuth(),
                    provider: 'github',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _titlePage() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 30),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Let’s Sign In.!',
            style: TextStyle(
              color: AppColor.primaryLight,
              fontWeight: FontWeight.w700,
              fontSize: 20,
            ),
          ),
          SizedBox(height: 10),
          Text(
            'Login to Your Account to Continue your Courses',
            style: TextStyle(
              color: AppColor.primaryLight,
              fontWeight: FontWeight.w500,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

class _SocialFullButton extends StatelessWidget {
  const _SocialFullButton({
    required this.label,
    required this.icon,
    required this.loading,
    required this.onPressed,
  });

  final String label;
  final Widget icon;
  final bool loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      width: double.infinity,
      child: ElevatedButton(
        onPressed: loading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.black.withOpacity(.08)),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (loading) ...[
              const SizedBox(
                width: 18,
                height: 18,
                child: CupertinoActivityIndicator(),
              ),
              const SizedBox(width: 12),
            ] else ...[
              icon,
              const SizedBox(width: 10),
            ],
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}
