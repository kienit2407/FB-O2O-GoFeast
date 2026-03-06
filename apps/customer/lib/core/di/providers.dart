import 'package:customer/core/push/fcm_service.dart';
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
import 'package:customer/features/merchant/presentation/viewmodels/merchant_detail_state.dart';
import 'package:customer/features/merchant/presentation/viewmodels/merchant_detail_controller.dart';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';
import 'package:dio/dio.dart';

// ====== NEW IMPORTS (address + home/catalog) ======
import 'package:customer/core/services/location_service.dart';

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


final favoriteMerchantRepositoryProvider = Provider<FavoriteMerchantRepository>((ref) {
  final dio = ref.read(dioClientProvider);
  return FavoriteMerchantRepository(dio);
});

// toggle theo merchantId
final favoriteMerchantToggleProvider = StateNotifierProvider.autoDispose
    .family<FavoriteMerchantToggleController, FavoriteMerchantToggleState, String>((ref, merchantId) {
  final repo = ref.read(favoriteMerchantRepositoryProvider);
  return FavoriteMerchantToggleController(repo, merchantId);
});

// list favorites của tôi
final favoriteMerchantsProvider =
    StateNotifierProvider.autoDispose<FavoriteMerchantsController, FavoriteMerchantsState>((ref) {
  final repo = ref.read(favoriteMerchantRepositoryProvider);
  return FavoriteMerchantsController(repo);
});
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
  ];
}
