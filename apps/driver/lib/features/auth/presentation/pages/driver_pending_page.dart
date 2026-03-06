import 'package:driver/features/auth/presentation/viewmodels/auth_provider.dart';
import 'package:driver/features/auth/presentation/viewmodels/driver_auth_viewmodel.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:driver/features/auth/data/models/driver_models.dart';

class DriverPendingPage extends ConsumerWidget {
  const DriverPendingPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(driverAuthViewModelProvider).valueOrNull;
    final p = me?.driverProfile;
    final status = me?.status;

    final rejectedText = () {
      final note = (p?.verificationNote ?? '').trim();
      final reasons = (p?.verificationReasons ?? const []).join(', ').trim();
      if (note.isNotEmpty) return note;
      if (reasons.isNotEmpty) return reasons;
      return 'Không có ghi chú cụ thể';
    }();

    return WillPopScope(
      onWillPop: () async => false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Trạng thái hồ sơ'),
          automaticallyImplyLeading: false,
          actions: [
            IconButton(
              tooltip: 'Tải lại',
              onPressed: () =>
                  ref.read(driverAuthViewModelProvider.notifier).refreshMe(),
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const SizedBox(height: 10),

              if (status == DriverVerificationStatus.pending) ...[
                const Icon(Icons.hourglass_top, size: 56),
                const SizedBox(height: 12),
                const Text(
                  'Hồ sơ của bạn đang chờ duyệt',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Trong thời gian chờ, bạn không thể sử dụng các chức năng khác.',
                  textAlign: TextAlign.center,
                ),
              ] else if (status == DriverVerificationStatus.rejected) ...[
                const Icon(Icons.error_outline, size: 56, color: Colors.red),
                const SizedBox(height: 12),
                const Text(
                  'Hồ sơ bị từ chối',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.red,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withOpacity(.2)),
                  ),
                  child: Text(
                    'Lý do: $rejectedText',
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => context.go('/onboarding'),
                    child: const Text('Chỉnh sửa hồ sơ'),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Bạn có thể chỉnh sửa và nộp lại hồ sơ.',
                  textAlign: TextAlign.center,
                ),
              ] else ...[
                const Icon(Icons.info_outline, size: 56),
                const SizedBox(height: 12),
                Text(
                  'Trạng thái hiện tại: ${status?.name ?? 'unknown'}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],

              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: () async {
                    await ref
                        .read(driverAuthViewModelProvider.notifier)
                        .logout();
                    if (context.mounted) context.go('/signin');
                  },
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  child: const Text('Đăng xuất'),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}
