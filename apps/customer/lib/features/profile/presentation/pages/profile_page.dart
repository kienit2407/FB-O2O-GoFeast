import 'package:customer/app/theme/app_color.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'user_info_page.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  static Future<void> _confirmLogout(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final ok = await showCupertinoDialog<bool>(
      context: context,
      builder: (_) => CupertinoAlertDialog(
        title: const Text('Đăng xuất'),
        content: const Padding(
          padding: EdgeInsets.only(top: 8),
          child: Text('Bạn có chắc muốn đăng xuất khỏi tài khoản này không?'),
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(
              'Huỷ',
              style: TextStyle(
                color: CupertinoColors.activeBlue.resolveFrom(context),
              ),
            ),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(
              'Đăng xuất',
              style: TextStyle(
                color: CupertinoColors.destructiveRed.resolveFrom(context),
              ),
            ),
          ),
        ],
      ),
    );

    if (ok == true) {
      await ref.read(authViewModelProvider.notifier).logout();
    }
  }

  static Future<void> _openMerchantWeb(BuildContext context) async {
    final uri = Uri.parse('http://localhost:8080');

    final success = await launchUrl(uri, mode: LaunchMode.externalApplication);

    if (!success && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không thể mở trang web cho chủ quán')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authViewModelProvider);
    final user = auth.valueOrNull;

    // đang bootstrap lần đầu
    if (auth.isLoading && user == null) {
      return const Scaffold(
        backgroundColor: AppColor.background,
        body: Center(child: CircularProgressIndicator(color: AppColor.primary)),
      );
    }

    if (user == null) {
      return Scaffold(
        backgroundColor: AppColor.background,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.person_outline_rounded,
                    size: 88,
                    color: AppColor.primary,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Đăng nhập để xem tài khoản',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColor.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Bạn cần đăng nhập để xem thông tin cá nhân, lịch sử chi tiêu và quản lý tài khoản.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: AppColor.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () => context.push('/signin'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColor.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Đăng nhập',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // từ đây user đã non-null
    final fullName = (user.fullName?.trim().isNotEmpty ?? false)
        ? user.fullName!.trim()
        : 'Người dùng';

    final email = user.email?.trim().isNotEmpty == true
        ? user.email!.trim()
        : 'Chưa cập nhật email';

    final avatarUrl = user.avatarUrl;
    final totalOrders = user.customerProfile?.totalOrders ?? 0;
    final totalSpent = user.customerProfile?.totalSpent ?? 0;
    return Scaffold(
      backgroundColor: AppColor.background,
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(
              16,
              MediaQuery.of(context).padding.top + 18,
              16,
              36,
            ),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColor.headerGradStart, AppColor.headerGradEnd],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                _AvatarView(avatarUrl: avatarUrl, name: fullName, radius: 34),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fullName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.white.withOpacity(.92),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Transform.translate(
              offset: const Offset(0, -22),
              child: RefreshIndicator.adaptive(
                onRefresh: () =>
                    ref.read(authViewModelProvider.notifier).refreshMe(),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 140),
                  child: Column(
                    children: [
                      _StatsCard(
                        totalOrders: totalOrders,
                        totalSpent: totalSpent,
                      ),
                      const SizedBox(height: 14),
                      _SectionCard(
                        children: [
                          _MenuTile(
                            icon: Icons.person_outline_rounded,
                            iconColor: AppColor.primary,
                            title: 'Thông tin người dùng',
                            subtitle: 'Tên, số điện thoại, email',
                            onTap: () async {
                              await Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const UserInfoPage(),
                                ),
                              );

                              if (context.mounted) {
                                await ref
                                    .read(authViewModelProvider.notifier)
                                    .refreshMe();
                              }
                            },
                          ),
                          _MenuTile(
                            icon: Icons.confirmation_number_outlined,
                            iconColor: AppColor.warning,
                            title: 'Ví Voucher',
                            trailingText: 'Voucher đã lưu của bạn',
                            onTap: () => context.push('/my-vouchers'),
                          ),
                          _MenuTile(
                            icon: Icons.location_on_outlined,
                            iconColor: AppColor.accentTeal,
                            title: 'Địa chỉ',
                            onTap: () => _comingSoon(context),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      _SectionCard(
                        children: [
                          _MenuTile(
                            icon: Icons.storefront_outlined,
                            iconColor: AppColor.accentOrange,
                            title: 'Ứng dụng cho chủ quán',
                            onTap: () => _openMerchantWeb(context),
                          ),
                        ],
                      ),

                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: OutlinedButton(
                          onPressed: () => _confirmLogout(context, ref),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColor.danger,
                            side: const BorderSide(color: AppColor.border),
                            backgroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Text(
                            'Đăng xuất',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static void _comingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Tính năng sẽ sớm được cập nhật'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColor.textPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}

class _StatsCard extends StatelessWidget {
  const _StatsCard({required this.totalOrders, required this.totalSpent});

  final int totalOrders;
  final int totalSpent;

  String _formatMoney(int value) {
    final s = value.toString();
    final buffer = StringBuffer();

    for (int i = 0; i < s.length; i++) {
      buffer.write(s[i]);
      final pos = s.length - i - 1;
      if (pos > 0 && pos % 3 == 0) buffer.write('.');
    }
    return '${buffer.toString()}đ';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0B000000),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: _StatItem(
              label: 'Tổng đơn',
              value: '$totalOrders',
              color: AppColor.primary,
              icon: Icons.receipt_long_rounded,
            ),
          ),
          Container(width: 1, height: 46, color: AppColor.divider),
          Expanded(
            child: _StatItem(
              label: 'Đã chi',
              value: _formatMoney(totalSpent),
              color: AppColor.success,
              icon: Icons.payments_outlined,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          height: 42,
          width: 42,
          decoration: BoxDecoration(
            color: color.withOpacity(.10),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: AppColor.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColor.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(children: children),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    this.subtitle,
    this.trailingText,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String? subtitle;
  final String? trailingText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasSubtitle = subtitle != null && subtitle!.trim().isNotEmpty;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: AppColor.divider)),
          ),
          child: Row(
            children: [
              Container(
                height: 40,
                width: 40,
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(.10),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: hasSubtitle
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              color: AppColor.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            subtitle!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColor.textSecondary,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      )
                    : Text(
                        title,
                        style: const TextStyle(
                          color: AppColor.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
              ),
              if (trailingText != null) ...[
                Text(
                  trailingText!,
                  style: const TextStyle(
                    color: AppColor.textMuted,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 8),
              ],
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColor.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AvatarView extends StatelessWidget {
  const _AvatarView({
    required this.avatarUrl,
    required this.name,
    this.radius = 28,
  });

  final String? avatarUrl;
  final String name;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : 'U';

    return Stack(
      clipBehavior: Clip.none,
      children: [
        CircleAvatar(
          radius: radius,
          backgroundColor: Colors.white.withOpacity(.22),
          backgroundImage: (avatarUrl?.trim().isNotEmpty ?? false)
              ? NetworkImage(avatarUrl!)
              : null,
          child: (avatarUrl?.trim().isEmpty ?? true)
              ? Text(
                  initial,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                )
              : null,
        ),
        Positioned(
          right: -2,
          bottom: -2,
          child: Container(
            height: 22,
            width: 22,
            decoration: BoxDecoration(
              color: AppColor.success,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Colors.white, width: 2),
            ),
            child: const Icon(
              Icons.check_rounded,
              size: 14,
              color: Colors.white,
            ),
          ),
        ),
      ],
    );
  }
}
