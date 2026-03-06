import 'package:driver/features/auth/presentation/pages/driver_onboarding_page.dart';
import 'package:driver/features/auth/presentation/pages/driver_pending_page.dart';
import 'package:driver/features/auth/presentation/viewmodels/auth_provider.dart';
import 'package:driver/features/home/presentation/pages/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:driver/features/auth/data/models/driver_models.dart';

// pages
import 'package:driver/features/auth/presentation/pages/splash_page.dart';
import 'package:driver/features/auth/presentation/pages/signin_page.dart';

class RouterRefreshNotifier extends ChangeNotifier {
  RouterRefreshNotifier(Ref ref) {
    ref.listen(driverAuthViewModelProvider, (_, __) => notifyListeners());
  }
}

final _appStart = DateTime.now();

String? _driverRedirectGuard(AsyncValue<DriverMe?> auth, GoRouterState state) {
  final loc = state.matchedLocation;
  final isSplash = loc == '/splash';
  final isSignin = loc == '/signin';
  final isOnboarding = loc == '/onboarding';
  final isPending = loc == '/pending';

  final elapsed = DateTime.now().difference(_appStart);
  final splashDone = elapsed >= const Duration(milliseconds: 700);
  if (isSplash && !splashDone) return null;

  if (auth.isLoading) return null;

  //  1. Bắt thêm case nếu gọi API bị lỗi (ví dụ token hết hạn) thì bắt đăng nhập lại
  if (auth.hasError) {
    return isSignin ? null : '/signin';
  }

  final me = auth.valueOrNull;

  // 2. In log ra console để bạn tự bắt bệnh xem `me` đang chứa cái gì
  print('--- ROUTER GUARD DEBUG ---');
  print('Location: $loc');
  print('Auth Value: $me');
  print('--------------------------');

  // chưa login
  if (me == null) {
    return isSignin ? null : '/signin';
  }

  final status =
      me.driverProfile?.verificationStatus ?? DriverVerificationStatus.draft;

  // pending
  if (status == DriverVerificationStatus.pending) {
    return isPending ? null : '/pending';
  }

  // draft/rejected -> onboarding
  if (status == DriverVerificationStatus.draft ||
      status == DriverVerificationStatus.rejected) {
    return isOnboarding ? null : '/onboarding';
  }

  // approved -> home, cấm quay lại các màn auth
  if (status == DriverVerificationStatus.approved) {
    if (isSignin || isOnboarding || isPending || isSplash) return '/';
    return null;
  }

  return null;
}

final routerRefreshProvider = Provider<RouterRefreshNotifier>((ref) {
  final n = RouterRefreshNotifier(ref);
  ref.onDispose(n.dispose);
  return n;
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(routerRefreshProvider);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(driverAuthViewModelProvider); // ✅ read, không watch
      return _driverRedirectGuard(auth, state);
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const HomePage()),
      GoRoute(path: '/splash', builder: (context, state) => const SplashPage()),
      GoRoute(path: '/signin', builder: (context, state) => const SigninPage()),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const DriverOnboardingPage(),
      ),
      GoRoute(
        path: '/pending',
        builder: (context, state) => const DriverPendingPage(),
      ),
    ],
  );
});
