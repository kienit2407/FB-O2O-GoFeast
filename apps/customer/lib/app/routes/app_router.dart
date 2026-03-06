import 'package:customer/app/routes/bottom_navigation_bar.dart';
import 'package:customer/features/addresses/data/models/saved_address_models.dart';
import 'package:customer/features/addresses/presentation/pages/add_adress_page.dart';
import 'package:customer/features/addresses/presentation/pages/adress_page.dart';
import 'package:customer/features/addresses/presentation/pages/choose_address_page.dart';
import 'package:customer/features/addresses/presentation/pages/search_address_page.dart';
import 'package:customer/features/auth/domain/entities/auth_user.dart'
    show AuthUser;
import 'package:customer/features/auth/presentation/pages/enter_phone_page.dart';
import 'package:customer/features/favorites/presentation/pages/my_favorite_merchant_page.dart';
import 'package:customer/features/merchant/presentation/pages/merchant_detail_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Pages
import 'package:customer/features/auth/presentation/pages/splash_page.dart';
import 'package:customer/features/auth/presentation/pages/signin_page.dart';
import 'package:customer/features/home/presentation/pages/home_page.dart';

// // Auth
// import 'package:customer/features/auth/domain/entities/auth_user.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';

/// Router refresh khi auth đổi
class RouterRefreshNotifier extends ChangeNotifier {
  RouterRefreshNotifier(Ref ref) {
    ref.listen<AsyncValue<AuthUser?>>(authViewModelProvider, (_, __) {
      notifyListeners();
    });
  }
}

final routerRefreshProvider = Provider<RouterRefreshNotifier>((ref) {
  final n = RouterRefreshNotifier(ref);
  ref.onDispose(n.dispose);
  return n;
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authViewModelProvider);
  final refresh = ref.watch(routerRefreshProvider); // ✅ add

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh, // ✅ quan trọng
    redirect: (context, state) {
      final loc = state.matchedLocation;

      // Khi auth đang loading -> giữ ở splash (đỡ nhảy loạn)
      if (auth.isLoading) {
        return loc == '/splash' ? null : '/splash';
      }

      final user = auth.valueOrNull; // null = guest
      final isAuthed = user != null;
      final needsPhone = isAuthed && ((user.phone ?? '').trim().isEmpty);

      final goingSplash = loc == '/splash';
      final goingEnterPhone = loc == '/enter-phone';
      final goingSignin = loc == '/signin';

      // ✅ Splash xong thì đi tiếp:
      if (goingSplash) {
        return needsPhone ? '/enter-phone' : '/';
      }

      // ✅ CHỈ khi đã login mà thiếu phone thì ép vào enter-phone
      if (needsPhone) {
        return goingEnterPhone ? null : '/enter-phone';
      }

      // ✅ Đã có phone rồi: không cho ở enter-phone nữa
      if (isAuthed && goingEnterPhone) return '/';

      // ✅ Đã login rồi: optional, chặn vào signin
      if (isAuthed && goingSignin) return '/';

      // ✅ Guest: không ép signin, cứ để vào main shell bình thường
      // (Nếu guest cố mở enter-phone thì đá về signin hoặc home tuỳ bạn)
      if (!isAuthed && goingEnterPhone) return '/signin'; // hoặc return '/';

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashPage()),
      GoRoute(
        path: '/signin',
        pageBuilder: (context, state) {
          return CustomTransitionPage(
            key: state.pageKey,
            child: const SigninPage(),
            transitionDuration: const Duration(milliseconds: 280),
            reverseTransitionDuration: const Duration(milliseconds: 240),
            transitionsBuilder:
                (context, animation, secondaryAnimation, child) {
                  final tween = Tween<Offset>(
                    begin: const Offset(0, 1), // từ dưới
                    end: Offset.zero,
                  ).chain(CurveTween(curve: Curves.easeOutCubic));

                  // (Tuỳ thích) thêm fade cho mượt
                  final fade = Tween<double>(
                    begin: 0.0,
                    end: 1.0,
                  ).chain(CurveTween(curve: Curves.easeOut));

                  return SlideTransition(
                    position: animation.drive(tween),
                    child: FadeTransition(
                      opacity: animation.drive(fade),
                      child: child,
                    ),
                  );
                },
          );
        },
      ),

      //  add route enter phone
      GoRoute(path: '/enter-phone', builder: (_, __) => const EnterPhonePage()),

      GoRoute(path: '/', builder: (_, __) => const MainShell()),
      GoRoute(path: '/address', builder: (_, __) => const AddressPage()),
      GoRoute(
        path: '/address/add',
        builder: (context, state) {
          final editing = state.extra as SavedAddress?;
          return AddAddressPage(editing: editing);
        },
      ),
      GoRoute(
        path: '/address/choose',
        builder: (_, __) => const ChooseAddressPage(),
      ),

      GoRoute(
        path: '/address/search',
        builder: (_, __) => const SearchAddressPage(),
      ),
      GoRoute(
        path: '/merchant/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          final extra = state.extra;

          // bạn pass lat/lng từ Home qua extra
          final lat =
              (extra is Map ? (extra['lat'] as num?) : null)?.toDouble() ?? 0;
          final lng =
              (extra is Map ? (extra['lng'] as num?) : null)?.toDouble() ?? 0;

          return MerchantDetailPage(merchantId: id, lat: lat, lng: lng);
        },
      ),
      GoRoute(
        path: '/favorites',
        builder: (_, __) => const MyFavoriteMerchantPage(),
      ),
    ],
  );
});
