import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';

import '../../data/models/search_models.dart';
import '../widgets/search_merchant_card.dart';
import '../widgets/search_product_card.dart';
import '../widgets/search_recent_keywords_section.dart';
import '../widgets/search_tab_switcher.dart';

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final TextEditingController _textCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  final ScrollController _productCtrl = ScrollController();

  bool _suppressListener = false;

  @override
  void initState() {
    super.initState();

    Future.microtask(() {
      ref.read(searchControllerProvider.notifier).bootstrap();
    });

    _textCtrl.addListener(() {
      if (_suppressListener) return;
      ref
          .read(searchControllerProvider.notifier)
          .onQueryChanged(_textCtrl.text);
    });

    _scrollCtrl.addListener(() {
      if (_scrollCtrl.position.pixels >=
          _scrollCtrl.position.maxScrollExtent - 280) {
        ref.read(searchControllerProvider.notifier).loadMoreMerchants();
      }
    });

    _productCtrl.addListener(() {
      if (_productCtrl.position.pixels >=
          _productCtrl.position.maxScrollExtent - 160) {
        ref.read(searchControllerProvider.notifier).loadMoreProducts();
      }
    });
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    _scrollCtrl.dispose();
    _productCtrl.dispose();
    super.dispose();
  }

  void _setTextWithoutTrigger(String value) {
    _suppressListener = true;
    _textCtrl.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
    _suppressListener = false;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(searchControllerProvider);
    final addr = ref.watch(addressControllerProvider);
    final needLocation =
        state.tab == SearchTabType.nearMe &&
        (addr.current?.lat == null || addr.current?.lng == null);

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: AppColor.background,
        body: SafeArea(
          child: Column(
            children: [
              _buildHeader(context, state),
              Expanded(
                child: RefreshIndicator(
                  color: AppColor.primary,
                  onRefresh: () async {
                    await ref
                        .read(searchControllerProvider.notifier)
                        .search(resetPage: true, saveHistory: false);
                  },
                  child: CustomScrollView(
                    controller: _scrollCtrl,
                    physics: const AlwaysScrollableScrollPhysics(
                      parent: BouncingScrollPhysics(),
                    ),
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                          child: SearchTabSwitcher(
                            current: state.tab,
                            onChanged: (tab) {
                              ref
                                  .read(searchControllerProvider.notifier)
                                  .changeTab(tab);
                            },
                          ),
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: _buildBody(
                            context,
                            state,
                            needLocation: needLocation,
                          ),
                        ),
                      ),
                      const SliverToBoxAdapter(child: SizedBox(height: 24)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, state) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColor.headerGradStart, AppColor.headerGradEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColor.primary.withOpacity(0.18),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          InkWell(
            onTap: () => context.pop(),
            borderRadius: BorderRadius.circular(999),
            child: const Padding(
              padding: EdgeInsets.all(8),
              child: Icon(
                Icons.arrow_back_ios_new_rounded,
                color: Colors.white,
                size: 18,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(
              height: 46,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 12),
                  const Icon(
                    Icons.search_rounded,
                    color: AppColor.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _textCtrl,
                      textInputAction: TextInputAction.search,
                      onSubmitted: (_) {
                        ref
                            .read(searchControllerProvider.notifier)
                            .submitSearch();
                      },
                      decoration: const InputDecoration(
                        hintText: 'Tìm quán, món ăn...',
                        hintStyle: TextStyle(
                          color: AppColor.textMuted,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                        isDense: true,
                        border: InputBorder.none,
                      ),
                      style: const TextStyle(
                        color: AppColor.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (_textCtrl.text.trim().isNotEmpty)
                    InkWell(
                      onTap: () {
                        _setTextWithoutTrigger('');
                        ref
                            .read(searchControllerProvider.notifier)
                            .clearQuery();
                        setState(() {});
                      },
                      borderRadius: BorderRadius.circular(999),
                      child: const Padding(
                        padding: EdgeInsets.all(8),
                        child: Icon(
                          Icons.close_rounded,
                          color: AppColor.textMuted,
                          size: 18,
                        ),
                      ),
                    ),
                  const SizedBox(width: 4),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    dynamic state, {
    required bool needLocation,
  }) {
    final query = state.query.trim();
    final hasQuery = query.isNotEmpty;

    if (!hasQuery) {
      return SearchRecentKeywordsSection(
        items: state.recentKeywords,
        onTapItem: (keyword) async {
          _setTextWithoutTrigger(keyword);
          await ref
              .read(searchControllerProvider.notifier)
              .selectRecentKeyword(keyword);
          setState(() {});
        },
        onRemoveItem: (keyword) {
          ref
              .read(searchControllerProvider.notifier)
              .removeRecentKeyword(keyword);
        },
        onClearAll: () {
          ref.read(searchControllerProvider.notifier).clearRecentKeywords();
        },
      );
    }

    if (query.length < 2) {
      return _messageCard('Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm');
    }

    if (needLocation) {
      return _messageCard(
        'Bạn cần bật vị trí hoặc chọn địa chỉ để xem quán gần bạn',
        icon: Icons.location_off_rounded,
      );
    }

    final noData =
        !state.isLoadingInitial &&
        state.merchants.isEmpty &&
        state.products.isEmpty;

    if (noData) {
      return _messageCard(
        'Không tìm thấy kết quả phù hợp',
        icon: Icons.search_off_rounded,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (state.error != null && state.error.toString().trim().isNotEmpty)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColor.danger.withOpacity(0.08),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              state.error.toString(),
              style: const TextStyle(
                color: AppColor.danger,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
        _sectionHeader(title: 'Quán', count: state.merchants.length),
        const SizedBox(height: 10),
        if (state.isLoadingInitial && state.merchants.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: CircularProgressIndicator(color: AppColor.primary),
            ),
          )
        else if (state.merchants.isEmpty)
          _emptySmall('Không có quán phù hợp')
        else
          Column(
            children: [
              ...state.merchants.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: SearchMerchantCard(
                    item: item,
                    onTap: () {
                      context.push('/merchant/${item.id}');
                    },
                  ),
                ),
              ),
              if (state.merchantLoadingMore)
                const Padding(
                  padding: EdgeInsets.only(top: 4, bottom: 10),
                  child: CircularProgressIndicator(color: AppColor.primary),
                ),
            ],
          ),
        const SizedBox(height: 8),
        _sectionHeader(title: 'Món ăn', count: state.products.length),
        const SizedBox(height: 10),
        if (state.isLoadingInitial && state.products.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: CircularProgressIndicator(color: AppColor.primary),
            ),
          )
        else if (state.products.isEmpty)
          _emptySmall('Không có món phù hợp')
        else
          SizedBox(
            height: 320,
            child: ListView.separated(
              controller: _productCtrl,
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount:
                  state.products.length + (state.productLoadingMore ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                if (index >= state.products.length) {
                  return const SizedBox(
                    width: 72,
                    child: Center(
                      child: CircularProgressIndicator(color: AppColor.primary),
                    ),
                  );
                }

                final item = state.products[index];
                return SearchProductCard(
                  item: item,
                  onTap: () {
                    // Đổi route này theo app bạn nếu detail món đang dùng path khác.
                    context.push('/product/${item.id}');
                  },
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _sectionHeader({required String title, required int count}) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            color: AppColor.textPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: AppColor.primaryLight,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            '$count',
            style: const TextStyle(
              color: AppColor.primaryDark,
              fontWeight: FontWeight.w800,
              fontSize: 11,
            ),
          ),
        ),
      ],
    );
  }

  Widget _messageCard(String text, {IconData icon = Icons.search_rounded}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColor.border),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColor.primary, size: 30),
          const SizedBox(height: 10),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColor.textSecondary,
              fontSize: 14,
              fontWeight: FontWeight.w600,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptySmall(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColor.border),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: AppColor.textSecondary,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
