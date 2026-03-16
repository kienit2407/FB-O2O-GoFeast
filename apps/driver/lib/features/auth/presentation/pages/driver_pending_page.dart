import 'package:driver/app/theme/app_color.dart';
import 'package:driver/core/di/providers.dart';
import 'package:driver/features/auth/data/models/driver_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class DriverPendingPage extends ConsumerWidget {
  const DriverPendingPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(driverAuthControllerProvider);
    final me = auth.me;
    final p = me?.driverProfile;
    final status = me?.status;

    if (status == DriverVerificationStatus.approved) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/');
      });
    }

    final rejectedText = () {
      final note = (p?.verificationNote ?? '').trim();
      final reasons = (p?.verificationReasons ?? const []).join(', ').trim();
      if (note.isNotEmpty) return note;
      if (reasons.isNotEmpty) return reasons;
      return 'Không có ghi chú cụ thể';
    }();

    final bool isPending = status == DriverVerificationStatus.pending;
    final bool isRejected = status == DriverVerificationStatus.rejected;

    final Color accent = isPending
        ? AppColor.warning
        : isRejected
        ? AppColor.danger
        : AppColor.info;

    final IconData icon = isPending
        ? Icons.hourglass_top_rounded
        : isRejected
        ? Icons.highlight_off_rounded
        : Icons.info_outline_rounded;

    final String title = isPending
        ? 'Hồ sơ của bạn đang chờ duyệt'
        : isRejected
        ? 'Hồ sơ bị từ chối'
        : 'Trạng thái hồ sơ';

    final String description = isPending
        ? 'Trong thời gian chờ, bạn chưa thể sử dụng các chức năng khác. Hệ thống sẽ cập nhật ngay khi hồ sơ được duyệt.'
        : isRejected
        ? 'Bạn có thể chỉnh sửa thông tin theo góp ý và nộp lại hồ sơ.'
        : 'Trạng thái hiện tại: ${status?.name ?? 'unknown'}';

    return WillPopScope(
      onWillPop: () async => false,
      child: Scaffold(
        backgroundColor: AppColor.background,
        appBar: AppBar(
          elevation: 0,
          scrolledUnderElevation: 0,
          backgroundColor: AppColor.surface,
          surfaceTintColor: AppColor.surface,
          automaticallyImplyLeading: false,
          title: const Text(
            'Trạng thái hồ sơ',
            style: TextStyle(
              color: AppColor.textPrimary,
              fontWeight: FontWeight.w500,
              fontSize: 16
            ),
          ),
          actions: [
            IconButton(
              tooltip: 'Tải lại',
              onPressed: () =>
                  ref.read(driverAuthControllerProvider.notifier).refreshMe(),
              icon: const Icon(Icons.refresh_rounded, color: AppColor.primary),
            ),
          ],
        ),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColor.headerGradStart.withOpacity(.95),
                      AppColor.headerGradEnd,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Column(
                  children: [
                    Container(
                      height: 72,
                      width: 72,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(.18),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: Colors.white.withOpacity(.22),
                        ),
                      ),
                      child: Icon(icon, size: 36, color: Colors.white),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 22,
                        height: 1.25,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      description,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withOpacity(.94),
                        height: 1.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColor.surface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: AppColor.border),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x08000000),
                      blurRadius: 18,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: accent.withOpacity(.10),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        isPending
                            ? 'Đang xử lý'
                            : isRejected
                            ? 'Cần chỉnh sửa'
                            : 'Thông tin trạng thái',
                        style: TextStyle(
                          color: accent,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Thông tin hồ sơ',
                      style: TextStyle(
                        color: AppColor.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 17,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _InfoTile(
                      icon: Icons.person_outline_rounded,
                      label: 'Tài xế',
                      value: me?.fullName?.trim().isNotEmpty == true
                          ? me!.fullName!
                          : 'Chưa cập nhật',
                    ),
                    const SizedBox(height: 10),
                    _InfoTile(
                      icon: Icons.phone_outlined,
                      label: 'Số điện thoại',
                      value: me?.phone?.trim().isNotEmpty == true
                          ? me!.phone!
                          : 'Chưa cập nhật',
                    ),
                    const SizedBox(height: 10),
                    _InfoTile(
                      icon: Icons.badge_outlined,
                      label: 'Trạng thái',
                      value: status?.name == 'pending' ? 'Đang chờ' : 'Bị từ chối',
                    ),
                    if (isRejected) ...[
                      const SizedBox(height: 14),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColor.danger.withOpacity(.08),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColor.danger.withOpacity(.18),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              Icons.error_outline_rounded,
                              color: AppColor.danger,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Lý do: $rejectedText',
                                style: const TextStyle(
                                  color: AppColor.danger,
                                  fontWeight: FontWeight.w600,
                                  height: 1.45,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const Spacer(),
              if (isRejected) ...[
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => context.go('/onboarding'),
                    style: ElevatedButton.styleFrom(
                      elevation: 0,
                      backgroundColor: AppColor.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Chỉnh sửa hồ sơ',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: () async {
                    await ref
                        .read(driverAuthControllerProvider.notifier)
                        .logout();
                    if (context.mounted) context.go('/signin');
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColor.danger,
                    side: const BorderSide(color: AppColor.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Đăng xuất',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColor.surfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColor.border),
      ),
      child: Row(
        children: [
          Container(
            height: 40,
            width: 40,
            decoration: BoxDecoration(
              color: AppColor.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppColor.primary, size: 20),
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
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    color: AppColor.textPrimary,
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
