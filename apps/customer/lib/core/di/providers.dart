import 'package:customer/core/push/fcm_service.dart';
import 'package:customer/core/push/local_notification_service.dart';
import 'package:customer/core/realtime/socket_bootstrap_controller.dart';
import 'package:customer/core/realtime/socket_provider.dart';
import 'package:customer/core/shared/contants/url_config.dart';
import 'package:customer/core/network/dio_client.dart';
import 'package:customer/core/storage/token_storage.dart';
import 'package:customer/core/storage/device_id_storage.dart';
import 'package:customer/features/addresses/data/repository/address_repository.dart';
import 'package:customer/features/addresses/presentation/viewmodels/address_controller.dart';
import 'package:customer/features/addresses/presentation/viewmodels/address_state.dart';
import 'package:customer/features/addresses/presentation/viewmodels/choose_address_controller.dart';
import 'package:customer/features/addresses/presentation/viewmodels/choose_address_state.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:customer/features/cart/data/repositories/cart_repository.dart';
import 'package:customer/features/cart/presentation/viewmodels/cart_controller.dart';
import 'package:customer/features/cart/presentation/viewmodels/cart_state.dart';
import 'package:customer/features/dinein/data/repositories/dine_in_repository.dart';
import 'package:customer/features/dinein/presentation/viewmodels/dine_in_session_controller.dart';
import 'package:customer/features/dinein/presentation/viewmodels/dine_in_session_state.dart';
import 'package:customer/features/favorites/data/repository/favorite_merchant_repository.dart';
import 'package:customer/features/favorites/presentation/viewmodels/farvorite_merchant_controller.dart';
import 'package:customer/features/favorites/presentation/viewmodels/favorite_merchant_state.dart';
import 'package:customer/features/home/data/repository/banner_repository.dart';
import 'package:customer/features/home/data/repository/feed_repository.dart';
import 'package:customer/features/home/presentation/viewmodels/banner_controller.dart';
import 'package:customer/features/home/presentation/viewmodels/banner_state.dart';
import 'package:customer/features/home/presentation/viewmodels/feed_controller.dart';
import 'package:customer/features/home/presentation/viewmodels/feed_state.dart';
import 'package:customer/features/merchant/data/models/product_config_model.dart';
import 'package:customer/features/merchant/data/repository/merchant_detail_repository.dart';
import 'package:customer/features/merchant/presentation/viewmodels/food_detail_controller.dart';
import 'package:customer/features/merchant/presentation/viewmodels/food_detail_state.dart';
import 'package:customer/features/merchant/presentation/viewmodels/merchant_detail_state.dart';
import 'package:customer/features/merchant/presentation/viewmodels/merchant_detail_controller.dart';
import 'package:customer/features/merchant/presentation/viewmodels/merchant_review_submit_controller.dart';
import 'package:customer/features/merchant/presentation/viewmodels/merchant_reviews_controller.dart';
import 'package:customer/features/merchant/presentation/viewmodels/merchant_reviews_state.dart';
import 'package:customer/features/merchant/presentation/viewmodels/product_review_submit_controller.dart';
import 'package:customer/features/merchant/presentation/viewmodels/product_review_submit_state.dart';
import 'package:customer/features/notifications/data/repository/notification_repository.dart';
import 'package:customer/features/notifications/presentation/viewmodels/notication_state.dart';
import 'package:customer/features/notifications/presentation/viewmodels/notification_controller.dart';
import 'package:customer/features/orders/data/models/checkout_models.dart';
import 'package:customer/features/orders/data/repository/checkout_repository.dart';
import 'package:customer/features/orders/data/repository/my_orders_repository.dart';
import 'package:customer/features/orders/data/repository/order_tracking_repository.dart';
import 'package:customer/features/orders/presentation/viewmodels/checkout_controller.dart';
import 'package:customer/features/orders/presentation/viewmodels/checkout_state.dart';
import 'package:customer/features/orders/presentation/viewmodels/my_orders_controller.dart';
import 'package:customer/features/orders/presentation/viewmodels/my_orders_state.dart';
import 'package:customer/features/orders/presentation/viewmodels/order_tracking_controller.dart';
import 'package:customer/features/profile/data/repository/user_profile_repository.dart';
import 'package:customer/features/profile/presentation/viewmodels/user_profile_controller.dart';
import 'package:customer/features/profile/presentation/viewmodels/user_profile_state.dart';
import 'package:customer/features/promotion/data/models/promotion_models.dart';
import 'package:customer/features/promotion/data/repository/promotion_repository.dart';
import 'package:customer/features/promotion/presentation/viewmodels/promotion_detail_controller.dart';
import 'package:customer/features/promotion/presentation/viewmodels/promotion_detail_state.dart';
import 'package:customer/features/search/data/repository/search_history_repository.dart';
import 'package:customer/features/search/data/repository/search_repository.dart';
import 'package:customer/features/search/presentation/viewmodels/search_state.dart' show SearchState;
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:customer/features/search/presentation/viewmodels/search_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';
import 'package:dio/dio.dart';

// ====== NEW IMPORTS (address + home/catalog) ======
import 'package:customer/core/services/location_service.dart';

class MerchantPromotionListParams {
  final String merchantId;
  final String orderType;

  const MerchantPromotionListParams({
    required this.merchantId,
    required this.orderType,
  });

  @override
  bool operator ==(Object other) {
    return other is MerchantPromotionListParams &&
        other.merchantId == merchantId &&
        other.orderType == orderType;
  }

  @override
  int get hashCode => Object.hash(merchantId, orderType);
}

// Giữ nguyên 2 provider bạn đang có
final dioClientProvider = Provider<DioClient>((ref) {
  throw UnimplementedError('dioClientProvider chưa được override');
});

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  throw UnimplementedError('tokenStorageProvider chưa được override');
});

final fcmServiceProvider = Provider((ref) => FcmService());

// =====================
// APP SERVICES/REPOS
// =====================
final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService();
});

// Address repo + controller
final addressRepositoryProvider = Provider<AddressRepository>((ref) {
  final dio = ref.read(dioClientProvider);
  return AddressRepository(dio);
});

final addressControllerProvider =
    StateNotifierProvider<AddressController, AddressState>((ref) {
      final repo = ref.read(addressRepositoryProvider);
      final loc = ref.read(locationServiceProvider);
      final tokenStorage = ref.read(tokenStorageProvider);

      Future<bool> isLoggedIn() async {
        final refresh = await tokenStorage.getRefreshToken();
        return refresh != null && refresh.isNotEmpty;
      }

      // Future<void> refreshMe() async {
      //   // gọi method refreshMe của auth controller (bạn cần có hàm này)
      //   await ref.read(authViewModelProvider.notifier).refreshMe();
      // }

      return AddressController(repo: repo, loc: loc, isLoggedIn: isLoggedIn);
    });
final chooseAddressControllerProvider =
    StateNotifierProvider.autoDispose<
      ChooseAddressController,
      ChooseAddressState
    >((ref) {
      final repo = ref.read(addressRepositoryProvider);
      return ChooseAddressController(repo: repo);
    });
final bannerRepositoryProvider = Provider<BannerRepository>((ref) {
  final dio = ref.read(dioClientProvider);
  return BannerRepository(dio);
});

final bannerControllerProvider =
    StateNotifierProvider<BannerController, BannerState>((ref) {
      final repo = ref.read(bannerRepositoryProvider);
      final c = BannerController(repo: repo);
      // auto fetch 1 lần
      c.fetch();
      return c;
    });

final feedRepositoryProvider = Provider<FeedRepository>((ref) {
  final dio = ref.read(dioClientProvider);
  return FeedRepository(dio);
});

final feedControllerProvider = StateNotifierProvider<FeedController, FeedState>(
  (ref) {
    final repo = ref.read(feedRepositoryProvider);
    return FeedController(repo: repo);
  },
);
final merchantDetailRepositoryProvider = Provider<MerchantDetailRepository>((
  ref,
) {
  final dio = ref.watch(dioClientProvider);
  return MerchantDetailRepository(dio);
});

final merchantDetailProvider = StateNotifierProvider.autoDispose
    .family<
      MerchantDetailController,
      MerchantDetailState,
      MerchantDetailParams
    >((ref, params) {
      final repo = ref.watch(merchantDetailRepositoryProvider);
      return MerchantDetailController(repo, params);
    });

class ProductConfigParams {
  final String merchantId;
  final String productId;
  const ProductConfigParams(this.merchantId, this.productId);

  @override
  bool operator ==(Object other) =>
      other is ProductConfigParams &&
      other.merchantId == merchantId &&
      other.productId == productId;

  @override
  int get hashCode => Object.hash(merchantId, productId);
}

final localNotificationServiceProvider = Provider<LocalNotificationService>((
  ref,
) {
  throw UnimplementedError(
    'localNotificationServiceProvider chưa được override',
  );
});
final productConfigProvider = FutureProvider.autoDispose
    .family<ProductConfigResponse, ProductConfigParams>((ref, p) async {
      final repo = ref.read(merchantDetailRepositoryProvider);
      return repo.getProductConfig(
        merchantId: p.merchantId,
        productId: p.productId,
      );
    });

final cartRepositoryProvider = Provider<CartRepository>((ref) {
  final dio = ref.read(dioClientProvider);
  return CartRepository(dio);
});

final cartProvider = StateNotifierProvider.autoDispose
    .family<CartController, CartState, CartParams>((ref, p) {
      final repo = ref.read(cartRepositoryProvider);
      return CartController(repo, p);
    });

final favoriteMerchantRepositoryProvider = Provider<FavoriteMerchantRepository>(
  (ref) {
    final dio = ref.read(dioClientProvider);
    return FavoriteMerchantRepository(dio);
  },
);

// toggle theo merchantId
final favoriteMerchantToggleProvider = StateNotifierProvider.autoDispose
    .family<
      FavoriteMerchantToggleController,
      FavoriteMerchantToggleState,
      String
    >((ref, merchantId) {
      final repo = ref.read(favoriteMerchantRepositoryProvider);
      return FavoriteMerchantToggleController(repo, merchantId);
    });

// list favorites của tôi
final favoriteMerchantsProvider =
    StateNotifierProvider.autoDispose<
      FavoriteMerchantsController,
      FavoriteMerchantsState
    >((ref) {
      final repo = ref.read(favoriteMerchantRepositoryProvider);
      return FavoriteMerchantsController(repo);
    });

final foodDetailProvider = StateNotifierProvider.autoDispose
    .family<FoodDetailController, FoodDetailState, FoodDetailParams>((ref, p) {
      final repo = ref.watch(merchantDetailRepositoryProvider);
      return FoodDetailController(repo: repo, params: p);
    });

final checkoutRepositoryProvider = Provider<CheckoutRepository>((ref) {
  final dio = ref.read(dioClientProvider);
  return CheckoutRepository(dio);
});

final checkoutProvider = StateNotifierProvider.autoDispose
    .family<CheckoutController, CheckoutState, CheckoutParams>((ref, params) {
      final repo = ref.read(checkoutRepositoryProvider);
      return CheckoutController(repo, params);
    });

// final localNotificationServiceProvider = Provider<LocalNotificationService>((
//   ref,
// ) {
//   return LocalNotificationService();
// });
final productReviewSubmitControllerProvider =
    StateNotifierProvider.family<
      ProductReviewSubmitController,
      ProductReviewSubmitState,
      String
    >((ref, productId) {
      final repo = ref.read(merchantDetailRepositoryProvider);
      return ProductReviewSubmitController(repo);
    });

final customerSocketServiceProvider = Provider<CustomerSocketService>((ref) {
  final tokenStorage = ref.read(tokenStorageProvider);
  final service = CustomerSocketService(tokenStorage);

  ref.onDispose(() {
    service.dispose();
  });

  return service;
});

final customerSocketBootstrapControllerProvider =
    Provider<CustomerSocketBootstrapController>((ref) {
      final socketService = ref.read(customerSocketServiceProvider);
      final notificationService = ref.read(localNotificationServiceProvider);

      return CustomerSocketBootstrapController(
        ref: ref,
        socketService: socketService,
        notificationService: notificationService,
      );
    });

final orderTrackingRepositoryProvider = Provider<OrderTrackingRepository>((
  ref,
) {
  final dio = ref.read(dioClientProvider).dio;
  return OrderTrackingRepository(dio);
});

final orderTrackingControllerProvider =
    StateNotifierProvider<OrderTrackingController, OrderTrackingState>((ref) {
      final repo = ref.read(orderTrackingRepositoryProvider);
      final socket = ref.read(customerSocketServiceProvider);

      return OrderTrackingController(repository: repo, socketService: socket);
    });

final myOrdersRepositoryProvider = Provider<MyOrdersRepository>((ref) {
  final dio = ref.watch(dioClientProvider);
  return MyOrdersRepository(dio);
});

final myOrdersControllerProvider =
    StateNotifierProvider<MyOrdersController, MyOrdersState>((ref) {
      final repo = ref.watch(myOrdersRepositoryProvider);
      return MyOrdersController(repo);
    });

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  final dio = ref.read(dioClientProvider);
  return NotificationRepository(dio);
});

final notificationControllerProvider =
    StateNotifierProvider<NotificationController, NotificationState>((ref) {
      final repo = ref.read(notificationRepositoryProvider);
      return NotificationController(repo);
    });

final merchantReviewsProvider = StateNotifierProvider.autoDispose
    .family<MerchantReviewsController, MerchantReviewsState, String>((
      ref,
      merchantId,
    ) {
      final repo = ref.read(merchantDetailRepositoryProvider);
      final isLoggedIn = ref.watch(authViewModelProvider).valueOrNull != null;

      return MerchantReviewsController(
        repo: repo,
        merchantId: merchantId,
        viewerEnabled: isLoggedIn,
      );
    });

final merchantReviewSubmitControllerProvider =
    StateNotifierProvider.family<
      MerchantReviewSubmitController,
      ProductReviewSubmitState,
      String
    >((ref, merchantId) {
      final repo = ref.read(merchantDetailRepositoryProvider);
      return MerchantReviewSubmitController(repo);
    });

final dineInRepositoryProvider = Provider<DineInRepository>((ref) {
  final dio = ref.watch(dioClientProvider);
  return DineInRepository(dio);
});

final dineInSessionProvider =
    StateNotifierProvider<DineInSessionController, DineInSessionState>((ref) {
      final repo = ref.watch(dineInRepositoryProvider);
      return DineInSessionController(repo);
    });
final promotionRepositoryProvider = Provider<PromotionRepository>((ref) {
  return PromotionRepository(ref.watch(dioClientProvider));
});

final promotionDetailProvider =
    StateNotifierProvider.family<
      PromotionDetailController,
      PromotionDetailState,
      String
    >((ref, promotionId) {
      return PromotionDetailController(
        ref.watch(promotionRepositoryProvider),
        promotionId,
      );
    });

final myVouchersProvider =
    StateNotifierProvider<MyVouchersController, MyVouchersState>((ref) {
      return MyVouchersController(ref.watch(promotionRepositoryProvider));
    });

final merchantPromotionSummariesProvider =
    FutureProvider.family<
      List<MerchantPromotionSummaryItem>,
      MerchantPromotionListParams
    >((ref, params) async {
      return ref
          .read(promotionRepositoryProvider)
          .listMerchantPromotions(
            merchantId: params.merchantId,
            orderType: params.orderType,
          );
    });

final promotionDetailControllerProvider =
    StateNotifierProvider.family<
      PromotionDetailController,
      PromotionDetailState,
      String
    >((ref, promotionId) {
      return PromotionDetailController(
        ref.read(promotionRepositoryProvider),
        promotionId,
      );
    });

final myVouchersControllerProvider =
    StateNotifierProvider<MyVouchersController, MyVouchersState>((ref) {
      return MyVouchersController(ref.read(promotionRepositoryProvider));
    });

final userProfileRepositoryProvider = Provider<UserProfileRepository>((ref) {
  return UserProfileRepository(ref.watch(dioClientProvider));
});

final userProfileControllerProvider =
    StateNotifierProvider<UserProfileController, UserProfileState>((ref) {
      return UserProfileController(
        ref,
        ref.watch(userProfileRepositoryProvider),
      );
    });


final searchHistoryRepositoryProvider = Provider<SearchHistoryRepository>((ref) {
  return SearchHistoryRepository();
});

final searchRepositoryProvider = Provider<SearchRepository>((ref) {
  return SearchRepository(ref.read(dioClientProvider).dio);
});

final searchControllerProvider =
    StateNotifierProvider.autoDispose<SearchProductController, SearchState>((ref) {
  return SearchProductController(
    ref.read(searchRepositoryProvider),
    ref.read(searchHistoryRepositoryProvider),
    ref,
  );
});
//===================================================================================
//===================================================================================
/// Bootstrap theo kiểu DI chuẩn:
/// main chỉ gọi await bootstrapOverrides() rồi runApp(ProviderScope(overrides: ...))
Future<List<Override>> bootstrapOverrides() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Phần UI overlay y như bạn đang làm trong main
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      systemNavigationBarColor: Colors.transparent,
      statusBarColor: Colors.transparent,
    ),
  );

  // Hive init (bạn đang làm trong main)
  await Hive.initFlutter();

  // Token storage init
  final tokenStorage = TokenStorage();
  await tokenStorage.init();
  final localNotificationService = LocalNotificationService();
  await localNotificationService.init();
  await localNotificationService.requestPermission();
  // DeviceId init
  final deviceId = await DeviceIdStorage().getDeviceId();

  // Tạo DioClient + refreshTokens wiring (không để ở main nữa)
  late final DioClient dioClient;

  Future<(String accessToken, String refreshToken)> refreshTokensFromApi(
    String refreshToken,
  ) async {
    // Quan trọng: call refresh bằng chính dioClient nhưng có extra để:
    // - không attach Authorization (skip auth)
    // - không trigger refresh lại nếu refresh 401 (skip auth refresh)
    final res = await dioClient.post<Map<String, dynamic>>(
      UrlConfig.refreshToken,
      data: {'refreshToken': refreshToken},
      options: Options(
        extra: const {'__skipAuth': true, '__skipAuthRefresh': true},
      ),
    );

    final body = res.data ?? {};
    final payload = (body['data'] as Map).cast<String, dynamic>();
    final access = payload['accessToken'] as String;
    final refresh = payload['refreshToken'] as String;
    return (access, refresh);
  }

  dioClient = await DioClient.create(
    tokenStorage: tokenStorage,
    baseUrl: UrlConfig.backendBaseUrl,
    deviceId: deviceId,
    refreshTokens: refreshTokensFromApi,
  );

  return [
    tokenStorageProvider.overrideWithValue(tokenStorage),
    dioClientProvider.overrideWithValue(dioClient),
    localNotificationServiceProvider.overrideWithValue(
      localNotificationService,
    ),
  ];
}
