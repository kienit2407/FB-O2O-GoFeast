import '../../data/models/search_models.dart';

class SearchState {
  final String query;
  final SearchTabType tab;

  final bool isLoadingInitial;
  final bool merchantLoadingMore;
  final bool productLoadingMore;
  final String? error;

  final List<SearchMerchantItem> merchants;
  final List<SearchProductItem> products;

  final int merchantPage;
  final bool merchantHasMore;

  final int productPage;
  final bool productHasMore;

  final List<String> recentKeywords;

  const SearchState({
    this.query = '',
    this.tab = SearchTabType.all,
    this.isLoadingInitial = false,
    this.merchantLoadingMore = false,
    this.productLoadingMore = false,
    this.error,
    this.merchants = const [],
    this.products = const [],
    this.merchantPage = 1,
    this.merchantHasMore = false,
    this.productPage = 1,
    this.productHasMore = false,
    this.recentKeywords = const [],
  });

  SearchState copyWith({
    String? query,
    SearchTabType? tab,
    bool? isLoadingInitial,
    bool? merchantLoadingMore,
    bool? productLoadingMore,
    String? error,
    bool clearError = false,
    List<SearchMerchantItem>? merchants,
    List<SearchProductItem>? products,
    int? merchantPage,
    bool? merchantHasMore,
    int? productPage,
    bool? productHasMore,
    List<String>? recentKeywords,
  }) {
    return SearchState(
      query: query ?? this.query,
      tab: tab ?? this.tab,
      isLoadingInitial: isLoadingInitial ?? this.isLoadingInitial,
      merchantLoadingMore: merchantLoadingMore ?? this.merchantLoadingMore,
      productLoadingMore: productLoadingMore ?? this.productLoadingMore,
      error: clearError ? null : (error ?? this.error),
      merchants: merchants ?? this.merchants,
      products: products ?? this.products,
      merchantPage: merchantPage ?? this.merchantPage,
      merchantHasMore: merchantHasMore ?? this.merchantHasMore,
      productPage: productPage ?? this.productPage,
      productHasMore: productHasMore ?? this.productHasMore,
      recentKeywords: recentKeywords ?? this.recentKeywords,
    );
  }
}
