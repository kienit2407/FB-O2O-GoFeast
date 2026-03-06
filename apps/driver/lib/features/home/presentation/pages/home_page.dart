import 'package:driver/features/auth/presentation/viewmodels/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';


class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(driverAuthViewModelProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: Center(
        child: auth.when(
          loading: () => const Text('Đang kiểm tra phiên...'),
          error: (e, _) => Text('Lỗi: $e'),
          data: (user) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  user == null
                      ? 'Guest (không có người dùng)'
                      : 'Có người dùng: ${user.email ?? user.phone ?? user.id}',
                ),
                const SizedBox(height: 16),
                if (user == null)
                  ElevatedButton(
                    onPressed: () => context.push('/signin'),
                    child: const Text('Đăng nhập'),
                  )
                else
                  ElevatedButton(
                    onPressed: () async {
                      await ref.read(driverAuthViewModelProvider.notifier).logout();
                    },
                    child: const Text('Đăng xuất'),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}