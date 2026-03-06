import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repository/banner_repository.dart';
import 'banner_state.dart';

class BannerController extends StateNotifier<BannerState> {
  BannerController({required BannerRepository repo})
    : _repo = repo,
      super(const BannerState.initial());

  final BannerRepository _repo;

  Future<void> fetch() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await _repo.fetchCarouselBanners();
      state = state.copyWith(isLoading: false, items: items);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> refresh() => fetch();
}
