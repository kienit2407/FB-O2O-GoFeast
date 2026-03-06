GoRoute(
  path: '/address/search',
  pageBuilder: (context, state) {
    return CustomTransitionPage(
      key: state.pageKey,
      child: const SearchAddressPage(),
      transitionDuration: const Duration(milliseconds: 280),
      reverseTransitionDuration: const Duration(milliseconds: 240),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final tween = Tween<Offset>(
          begin: const Offset(0, 1), // từ dưới
          end: Offset.zero,
        ).chain(CurveTween(curve: Curves.easeOutCubic));

        // (Tuỳ thích) thêm fade cho mượt
        final fade = Tween<double>(begin: 0.0, end: 1.0)
            .chain(CurveTween(curve: Curves.easeOut));

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