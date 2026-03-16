import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:customer/core/di/providers.dart';
import 'package:customer/features/addresses/presentation/viewmodels/address_state.dart';

import '../../data/models/search_models.dart';
import '../../data/repository/search_history_repository.dart';
import '../../data/repository/search_repository.dart';
import 'search_state.dart';

class SearchProductController extends StateNotifier<SearchState> {
  SearchProductController(this._repo, this._historyRepo, this._ref)
    : super(const SearchState());

  final SearchRepository _repo;
  final SearchHistoryRepository _historyRepo;
  final Ref _ref;

  Timer? _debounce;
  int _requestId = 0;

  Future<void> bootstrap() async {
    final recent = await _historyRepo.getRecent();
    state = state.copyWith(recentKeywords: recent);
  }

  void setQuery(String value) {
    state = state.copyWith(query: value, clearError: true);
  }

  void clearQuery() {
    _debounce?.cancel();
    state = state.copyWith(
      query: '',
      merchants: const [],
      products: const [],
      merchantPage: 1,
      merchantHasMore: false,
      productPage: 1,
      productHasMore: false,
      clearError: true,
      isLoadingInitial: false,
    );
  }

  void onQueryChanged(String value) {
    state = state.copyWith(query: value, clearError: true);

    _debounce?.cancel();

    final q = value.trim();
    if (q.length < 2) {
      state = state.copyWith(
        merchants: const [],
        products: const [],
        merchantPage: 1,
        merchantHasMore: false,
        productPage: 1,
        productHasMore: false,
        isLoadingInitial: false,
      );
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 400), () {
      search(resetPage: true, saveHistory: false);
    });
  }

  Future<void> submitSearch() async {
    final q = state.query.trim();
    if (q.length < 2) return;

    await _historyRepo.push(q);
    final recent = await _historyRepo.getRecent();

    state = state.copyWith(recentKeywords: recent);
    await search(resetPage: true, saveHistory: false);
  }

  Future<void> selectRecentKeyword(String keyword) async {
    state = state.copyWith(query: keyword, clearError: true);

    await _historyRepo.push(keyword);
    final recent = await _historyRepo.getRecent();
    state = state.copyWith(recentKeywords: recent);

    await search(resetPage: true, saveHistory: false);
  }

  Future<void> removeRecentKeyword(String keyword) async {
    await _historyRepo.remove(keyword);
    final recent = await _historyRepo.getRecent();
    state = state.copyWith(recentKeywords: recent);
  }

  Future<void> clearRecentKeywords() async {
    await _historyRepo.clear();
    state = state.copyWith(recentKeywords: const []);
  }

  Future<void> changeTab(SearchTabType tab) async {
    if (tab == state.tab) return;
    state = state.copyWith(tab: tab, clearError: true);

    final q = state.query.trim();
    if (q.length >= 2) {
      await search(resetPage: true, saveHistory: false);
    }
  }

  Future<void> search({
    required bool resetPage,
    bool saveHistory = false,
  }) async {
    final q = state.query.trim();
    if (q.length < 2) return;

    final address = _ref.read(addressControllerProvider);
    if (state.tab == SearchTabType.nearMe && !_hasUsableLocation(address)) {
      state = state.copyWith(
        merchants: const [],
        products: const [],
        merchantPage: 1,
        merchantHasMore: false,
        productPage: 1,
        productHasMore: false,
        isLoadingInitial: false,
        clearError: true,
      );
      return;
    }

    if (saveHistory) {
      await _historyRepo.push(q);
      final recent = await _historyRepo.getRecent();
      state = state.copyWith(recentKeywords: recent);
    }

    final requestId = ++_requestId;
    final lat = address.current?.lat;
    final lng = address.current?.lng;

    state = state.copyWith(
      isLoadingInitial: true,
      clearError: true,
      merchants: resetPage ? const [] : state.merchants,
      products: resetPage ? const [] : state.products,
    );

    try {
      final res = await _repo.overview(
        q: q,
        tab: state.tab,
        lat: lat,
        lng: lng,
        merchantPage: 1,
        productPage: 1,
      );

      if (requestId != _requestId) return;

      state = state.copyWith(
        isLoadingInitial: false,
        merchants: res.merchants.items,
        products: res.products.items,
        merchantPage: res.merchants.page,
        merchantHasMore: res.merchants.hasMore,
        productPage: res.products.page,
        productHasMore: res.products.hasMore,
      );
    } catch (e) {
      if (requestId != _requestId) return;
      state = state.copyWith(isLoadingInitial: false, error: e.toString());
    }
  }

  Future<void> loadMoreMerchants() async {
    if (state.merchantLoadingMore || !state.merchantHasMore) return;

    final q = state.query.trim();
    if (q.length < 2) return;

    final address = _ref.read(addressControllerProvider);
    if (state.tab == SearchTabType.nearMe && !_hasUsableLocation(address)) {
      return;
    }

    state = state.copyWith(merchantLoadingMore: true, clearError: true);

    try {
      final res = await _repo.merchants(
        q: q,
        tab: state.tab,
        lat: address.current?.lat,
        lng: address.current?.lng,
        page: state.merchantPage + 1,
      );

      state = state.copyWith(
        merchantLoadingMore: false,
        merchants: [...state.merchants, ...res.items],
        merchantPage: res.page,
        merchantHasMore: res.hasMore,
      );
    } catch (e) {
      state = state.copyWith(merchantLoadingMore: false, error: e.toString());
    }
  }

  Future<void> loadMoreProducts() async {
    if (state.productLoadingMore || !state.productHasMore) return;

    final q = state.query.trim();
    if (q.length < 2) return;

    final address = _ref.read(addressControllerProvider);
    if (state.tab == SearchTabType.nearMe && !_hasUsableLocation(address)) {
      return;
    }

    state = state.copyWith(productLoadingMore: true, clearError: true);

    try {
      final res = await _repo.products(
        q: q,
        tab: state.tab,
        lat: address.current?.lat,
        lng: address.current?.lng,
        page: state.productPage + 1,
      );

      state = state.copyWith(
        productLoadingMore: false,
        products: [...state.products, ...res.items],
        productPage: res.page,
        productHasMore: res.hasMore,
      );
    } catch (e) {
      state = state.copyWith(productLoadingMore: false, error: e.toString());
    }
  }

  bool _hasUsableLocation(AddressState state) {
    return state.current?.lat != null && state.current?.lng != null;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}
