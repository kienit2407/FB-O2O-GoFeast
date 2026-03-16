import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/assets/app_icon.dart';
import 'package:customer/core/shared/contants/url_config.dart';
import 'package:customer/core/storage/device_id_storage.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

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
          .read(authViewModelProvider.notifier)
          .signInWithTokens(
            accessToken: accessToken,
            refreshToken: refreshToken,
          );

      if (context.canPop()) {
        context.pop(true); // báo về là login thành công
      } else {
        context.go('/');
      }
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
      extendBodyBehindAppBar: true,
      backgroundColor: AppColor.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: Padding(
          padding: const EdgeInsets.only(left: 8),
          child: InkWell(
            borderRadius: BorderRadius.circular(999),
            onTap: () {
              if (context.canPop()) {
                context.pop(false); // đóng signin, không login
              } else {
                context.go('/');
              }
            },
            child: Container(
              margin: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(.18),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(.18)),
              ),
              child: const Icon(
                Iconsax.arrow_left_2_copy,
                color: Colors.white,
                size: 20,
              ),
            ),
          ),
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColor.primary, AppColor.primaryDark, AppColor.primary],
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
                    minHeight: constraints.maxHeight - 20,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 430),
                      child: Column(
                        children: [
                          const SizedBox(height: 28),
                          _buildHero(),
                          const SizedBox(height: 24),
                          _buildSigninCard(),
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

  Widget _buildHero() {
    return Column(
      children: [
        Container(
          height: 88,
          width: 88,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(.18),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withOpacity(.22)),
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
              Iconsax.shop_copy,
              color: AppColor.primary,
              size: 34,
            ),
          ),
        ),
        const SizedBox(height: 18),
        const Text(
          'Đăng nhập để đặt món',
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
          'Theo dõi đơn hàng, lưu địa chỉ, nhận ưu đãi và tiếp tục hành trình ăn ngon của bạn.',
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
            _FeatureChip(icon: Iconsax.location_copy, label: 'Lưu địa chỉ'),
            _FeatureChip(
              icon: Iconsax.discount_shape_copy,
              label: 'Nhận ưu đãi',
            ),
            _FeatureChip(icon: Iconsax.box_copy, label: 'Theo dõi đơn'),
          ],
        ),
      ],
    );
  }

  Widget _buildSigninCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      decoration: BoxDecoration(
        color: Colors.white,
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
            'Chào mừng bạn quay lại',
            style: TextStyle(
              color: AppColor.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 22,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Chọn phương thức đăng nhập để tiếp tục đặt món, xem lịch sử đơn hàng và quản lý tài khoản của bạn.',
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
              border: Border.all(color: AppColor.primary.withOpacity(.08)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Iconsax.info_circle_copy,
                  color: AppColor.primary,
                  size: 20,
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Đăng nhập để đồng bộ giỏ hàng, địa chỉ giao hàng yêu thích và các mã giảm giá dành riêng cho bạn.',
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
            sublabel: 'Nhanh chóng với tài khoản Google của bạn',
            icon: Image.asset(AppIcon.googleIcon, width: 22, height: 22),
            loading: _loadingGoogle,
            onPressed: () => _oauthLogin(
              UrlConfig.customerGoogleOAuth(),
              provider: 'google',
            ),
          ),
          const SizedBox(height: 12),
          _SocialFullButton(
            label: 'Tiếp tục với GitHub',
            sublabel: 'Dành cho tài khoản đã liên kết GitHub',
            icon: Image.asset(AppIcon.githubIcon, width: 22, height: 22),
            loading: _loadingGithub,
            onPressed: () => _oauthLogin(
              UrlConfig.customerGithubOAuth(),
              provider: 'github',
            ),
          ),
          const SizedBox(height: 18),
          Divider(color: Colors.grey.withOpacity(.15), height: 1),
          const SizedBox(height: 16),
          Row(
            children: const [
              Expanded(
                child: _SmallBenefitCard(
                  icon: Iconsax.heart_copy,
                  title: 'Yêu thích',
                  subtitle: 'Lưu quán và món bạn thích',
                ),
              ),
              SizedBox(width: 10),
              Expanded(
                child: _SmallBenefitCard(
                  icon: Iconsax.ticket_discount_copy,
                  title: 'Ưu đãi',
                  subtitle: 'Nhận mã giảm giá dễ hơn',
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            'Bằng việc tiếp tục, bạn đồng ý đăng nhập và sử dụng nền tảng theo chính sách hiện hành của ứng dụng.',
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
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.black.withOpacity(.06)),
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
                    color: AppColor.primaryLight,
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
                      : Iconsax.arrow_right_3_copy,
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

class _FeatureChip extends StatelessWidget {
  const _FeatureChip({required this.icon, required this.label});

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

class _SmallBenefitCard extends StatelessWidget {
  const _SmallBenefitCard({
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
        color: AppColor.primaryLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColor.primary.withOpacity(.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 34,
            width: 34,
            decoration: BoxDecoration(
              color: Colors.white,
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
