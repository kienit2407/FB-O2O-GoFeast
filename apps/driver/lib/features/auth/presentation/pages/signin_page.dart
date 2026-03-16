import 'package:driver/app/theme/app_color.dart';
import 'package:driver/core/assets/app_icon.dart';
import 'package:driver/core/di/providers.dart';
import 'package:driver/core/shared/contants/url_config.dart';
import 'package:driver/core/storage/device_id_storage.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

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

      await ref
          .read(driverAuthControllerProvider.notifier)
          .signInWithTokens(
            accessToken: accessToken,
            refreshToken: refreshToken,
          );
    } catch (_) {
      // giữ nguyên logic hiện tại
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
    final topPadding = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: AppColor.background,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColor.headerGradStart,
              AppColor.headerGradEnd,
              AppColor.primary,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  16,
                  topPadding > 0 ? 8 : 16,
                  16,
                  24,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - 24,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 430),
                      child: Column(
                        children: [
                          const SizedBox(height: 10),
                          _buildTopHero(),
                          const SizedBox(height: 22),
                          _buildLoginCard(),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildTopHero() {
    return Column(
      children: [
        Container(
          height: 86,
          width: 86,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(.18),
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.white.withOpacity(.22),
              width: 1.2,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1A000000),
                blurRadius: 18,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Container(
            margin: const EdgeInsets.all(10),
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.delivery_dining_rounded,
              size: 38,
              color: AppColor.primary,
            ),
          ),
        ),
        const SizedBox(height: 18),
        const Text(
          'Đăng nhập tài xế',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: 28,
            height: 1.15,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Truy cập tài khoản để nhận đơn, theo dõi thu nhập và quản lý hành trình giao hàng mỗi ngày.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withOpacity(.92),
            fontWeight: FontWeight.w500,
            fontSize: 14,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: const [
            _HeroChip(
              icon: Icons.verified_user_outlined,
              label: 'Đăng nhập an toàn',
            ),
            _HeroChip(icon: Icons.flash_on_outlined, label: 'Kết nối nhanh'),
            _HeroChip(icon: Icons.wallet_outlined, label: 'Quản lý thu nhập'),
          ],
        ),
      ],
    );
  }

  Widget _buildLoginCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 26,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Chào mừng bạn',
            style: TextStyle(
              color: AppColor.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 22,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Chọn phương thức đăng nhập để tiếp tục. Tài khoản sẽ được liên kết với hồ sơ tài xế của bạn.',
            style: TextStyle(
              color: AppColor.textSecondary,
              fontWeight: FontWeight.w500,
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColor.primaryLight,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColor.border),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.info_outline_rounded,
                  color: AppColor.primary,
                  size: 20,
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Sau khi đăng nhập, bạn có thể cần hoàn tất hồ sơ onboarding trước khi bắt đầu nhận đơn.',
                    style: TextStyle(
                      color: AppColor.textSecondary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      height: 1.45,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _SocialFullButton(
            label: 'Tiếp tục với Google',
            sublabel: 'Phù hợp nếu bạn dùng Gmail thường xuyên',
            icon: Image.asset(AppIcon.googleIcon, width: 22, height: 22),
            loading: _loadingGoogle,
            onPressed: () =>
                _oauthLogin(UrlConfig.driverGoogleOAuth(), provider: 'google'),
          ),
          const SizedBox(height: 12),
          _SocialFullButton(
            label: 'Tiếp tục với GitHub',
            sublabel: 'Dành cho tài khoản đã liên kết GitHub',
            icon: Image.asset(AppIcon.githubIcon, width: 22, height: 22),
            loading: _loadingGithub,
            onPressed: () =>
                _oauthLogin(UrlConfig.driverGithubOAuth(), provider: 'github'),
          ),
          const SizedBox(height: 18),
          const Divider(color: AppColor.divider, height: 1),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _SmallInfoCard(
                  icon: Icons.assignment_turned_in_outlined,
                  title: 'Duyệt hồ sơ',
                  subtitle: 'Theo dõi trạng thái nhanh',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _SmallInfoCard(
                  icon: Icons.support_agent_outlined,
                  title: 'Hỗ trợ',
                  subtitle: 'Xử lý vấn đề dễ hơn',
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            'Bằng việc tiếp tục, bạn đồng ý đăng nhập và sử dụng hệ thống tài xế theo chính sách của nền tảng.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColor.textMuted,
              fontWeight: FontWeight.w500,
              fontSize: 12,
              height: 1.5,
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
    required this.sublabel,
    required this.icon,
    required this.loading,
    required this.onPressed,
  });

  final String label;
  final String sublabel;
  final Widget icon;
  final bool loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: loading ? null : onPressed,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          height: 72,
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColor.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColor.border),
            boxShadow: const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 12,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Container(
                  height: 42,
                  width: 42,
                  decoration: BoxDecoration(
                    color: AppColor.surfaceWarm,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CupertinoActivityIndicator(),
                          )
                        : icon,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColor.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        sublabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColor.textSecondary,
                          fontWeight: FontWeight.w500,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  loading
                      ? Icons.more_horiz_rounded
                      : Icons.arrow_forward_ios_rounded,
                  size: 16,
                  color: loading ? AppColor.textMuted : AppColor.primary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withOpacity(.14)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 15),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _SmallInfoCard extends StatelessWidget {
  const _SmallInfoCard({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColor.surfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColor.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 34,
            width: 34,
            decoration: BoxDecoration(
              color: AppColor.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppColor.primary, size: 18),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(
              color: AppColor.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              color: AppColor.textSecondary,
              fontWeight: FontWeight.w500,
              fontSize: 12,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
