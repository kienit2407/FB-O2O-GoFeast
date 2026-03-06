import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authViewModelProvider);

    return Scaffold(
      body: Center(
        child: auth.value != null
            ? ElevatedButton(
                onPressed: () =>
                    ref.read(authViewModelProvider.notifier).logout(),
                child: const Text('Đăng xuất'),
              )
            : ElevatedButton(
                onPressed: () => context.push('/signin'),
                child: const Text('Đăng nhập'),
              ),
      ),
    );
  }
}
