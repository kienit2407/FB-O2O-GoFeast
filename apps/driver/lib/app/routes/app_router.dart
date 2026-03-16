import 'package:driver/app/routes/bottom_navigation_bar.dart';
import 'package:driver/core/di/providers.dart';
import 'package:driver/features/auth/presentation/pages/driver_onboarding_page.dart';
import 'package:driver/features/auth/presentation/pages/driver_pending_page.dart';
import 'package:driver/features/auth/presentation/viewmodels/driver_auth_state.dart';
import 'package:driver/features/drivers/presentation/pages/current_order_page.dart';
import 'package:driver/features/home/presentation/pages/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:driver/features/auth/data/models/driver_models.dart';
import 'package:driver/features/auth/presentation/pages/signin_page.dart';
import 'package:driver/features/auth/presentation/pages/splash_page.dart';

class RouterRefreshNotifier extends ChangeNotifier {
  RouterRefreshNotifier(Ref ref) {
    ref.listen(driverAuthControllerProvider, (_, __) => notifyListeners());
  }
}

final _appStart = DateTime.now();

final routerRefreshProvider = Provider<RouterRefreshNotifier>((ref) {
  final notifier = RouterRefreshNotifier(ref);
  ref.onDispose(notifier.dispose);
  return notifier;
});

String? _driverRedirectGuard(DriverAuthState auth, GoRouterState state) {
  final loc = state.matchedLocation;

  final isSplash = loc == '/splash';
  final isSignin = loc == '/signin';
  final isOnboarding = loc == '/onboarding';
  final isPending = loc == '/pending';
  final isHome = loc == '/';
  final isCurrentOrder = loc == '/current-order';

  final splashDone =
      DateTime.now().difference(_appStart) >= const Duration(milliseconds: 700);

  if (isSplash && !splashDone) return null;

  if (auth.isLoading) {
    return isSplash ? null : '/splash';
  }

  final me = auth.me;

  if (me == null) {
    return isSignin ? null : '/signin';
  }

  switch (me.status) {
    case DriverVerificationStatus.draft:
      return isOnboarding ? null : '/onboarding';

    case DriverVerificationStatus.pending:
      return isPending ? null : '/pending';

    case DriverVerificationStatus.rejected:
      return isPending ? null : '/pending';

    case DriverVerificationStatus.approved:
      if (isSplash || isSignin || isOnboarding || isPending) return '/';
      return (isHome || isCurrentOrder) ? null : '/';
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(routerRefreshProvider);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(driverAuthControllerProvider);
      return _driverRedirectGuard(auth, state);
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const MainShell()),
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
      GoRoute(
        path: '/current-order',
        builder: (context, state) {
          final extra = (state.extra as Map?) ?? {};

          return CurrentOrderPage(
            orderId: extra['orderId']?.toString() ?? '',
            orderNumber: extra['orderNumber']?.toString(),
            initialStatus:
                extra['initialStatus']?.toString() ?? 'driver_assigned',
            merchantName: extra['merchantName']?.toString() ?? '',
            merchantAddress: extra['merchantAddress']?.toString() ?? '',
            customerName: extra['customerName']?.toString() ?? '',
            customerPhone: extra['customerPhone']?.toString() ?? '',
            customerAddress: extra['customerAddress']?.toString() ?? '',
          );
        },
      ),
    ],
  );
});
