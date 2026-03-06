import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/core/utils/formatters.dart';
import 'package:customer/core/utils/map_category.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:customer/features/cart/data/repositories/cart_repository.dart';
import 'package:customer/features/cart/presentation/viewmodels/cart_controller.dart';
import 'package:customer/features/cart/presentation/viewmodels/cart_state.dart';
import 'package:customer/features/cart/presentation/widgets/cart_bottom_sheet.dart';
import 'package:customer/features/merchant/data/models/product_config_model.dart';
import 'package:customer/features/merchant/presentation/viewmodels/search_item.dart';
import 'package:customer/features/merchant/presentation/widgets/merchant_detail_skeleton.dart';
import 'package:customer/features/merchant/presentation/widgets/product_option_bottom_sheet.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:scrollable_positioned_list/scrollable_positioned_list.dart';

import '../../data/models/merchant_detail_model.dart';
import '../viewmodels/merchant_detail_controller.dart';

String formatDistance(num? km) {
  if (km == null) return '';
  final v = km.toDouble();
  if (v < 1) return '${(v * 1000).round()} m';
  return '${v.toStringAsFixed(v < 10 ? 1 : 0)} km';
}

String money(num v) {
  final s = v.toStringAsFixed(0);
  return '${s.replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}đ';
}

class MerchantDetailPage extends ConsumerStatefulWidget {
  const MerchantDetailPage({
    super.key,
    required this.merchantId,
    required this.lat,
    required this.lng,
  });

  final String merchantId;
  final double lat;
  final double lng;

  @override
  ConsumerState<MerchantDetailPage> createState() => _MerchantDetailPageState();
}

class _MerchantDetailPageState extends ConsumerState<MerchantDetailPage>
    with TickerProviderStateMixin {
  TabController? _tabCtrl;

  final List<_MenuEntry> _entries = [];
  final List<int> _headerIndexBySection = [];
  final ScrollController _scrollCtrl = ScrollController();

  final List<GlobalKey> _sectionHeaderKeys = [];

  Timer? _tabSyncDebounce;
  bool _syncingFromTab = false;
  Timer? _syncTimer;

  MerchantDetailParams get _params => MerchantDetailParams(
    merchantId: widget.merchantId,
    lat: widget.lat,
    lng: widget.lng,
  );

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScrollSyncTab);
  }

  @override
  void dispose() {
    _tabSyncDebounce?.cancel();
    _syncTimer?.cancel();
    _scrollCtrl.removeListener(_onScrollSyncTab);
    _scrollCtrl.dispose();
    _tabCtrl?.dispose();
    super.dispose();
  }

  CartParams get _cartParams =>
      CartParams.delivery(merchantId: widget.merchantId);

  CartController get _cartCtrl => ref.read(cartProvider(_cartParams).notifier);

  CartState get _cartState => ref.read(cartProvider(_cartParams));

  void _onScrollSyncTab() {
    if (_syncingFromTab) return;
    final ctrl = _tabCtrl;
    if (ctrl == null) return;

    _tabSyncDebounce?.cancel();
    _tabSyncDebounce = Timer(const Duration(milliseconds: 60), () {
      final pinned = _pinnedTop(context);
      int current = 0;

      for (int i = 0; i < _sectionHeaderKeys.length; i++) {
        final ctx = _sectionHeaderKeys[i].currentContext;
        if (ctx == null) continue;

        final box = ctx.findRenderObject() as RenderBox;
        final dy = box.localToGlobal(Offset.zero).dy;

        if (dy <= pinned + 6) current = i;
      }

      if (ctrl.index != current) ctrl.animateTo(current);
    });
  }

  void _rebuildForData(MerchantDetailResponse d) {
    _entries.clear();
    _sectionHeaderKeys
      ..clear()
      ..addAll(List.generate(d.sections.length, (_) => GlobalKey()));

    for (int s = 0; s < d.sections.length; s++) {
      final sec = d.sections[s];
      _entries.add(_MenuEntry.header(sectionIndex: s));
      for (final it in sec.items) {
        _entries.add(_MenuEntry.item(sectionIndex: s, item: it));
      }
    }

    _tabCtrl?.dispose();
    _tabCtrl = TabController(length: d.sections.length, vsync: this);
  }

  double _pinnedTop(BuildContext context) {
    final topPad = MediaQuery.paddingOf(context).top;
    const tabH = 52.0; // đúng với _TabHeaderDelegate height
    return topPad + kToolbarHeight + tabH;
  }

  void _showSectionPicker(
    BuildContext context,
    List<MerchantDetailMenuSection> sections,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: AppColor.iconInactive,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              Expanded(
                child: ListView.separated(
                  itemCount: sections.length,
                  separatorBuilder: (_, __) => const Divider(height: .6),
                  itemBuilder: (_, i) {
                    return ListTile(
                      title: Text(
                        ' ${sections[i].title} (${sections[i].items.length})',
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        _onTapTab(i);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _onAddPressed(MerchantDetailProductItem p) async {
    //  nếu chưa login -> mở signin và dừng
    if (!await _ensureLoggedIn()) return;

    if (!p.hasOptions) {
      await _cartCtrl.addProduct(
        productId: p.id,
        quantity: 1,
        selectedOptions: const [],
        selectedToppings: const [],
        note: '',
      );

      final err = _cartState.error;
      if (err != null && mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(err)));
      } else {
        HapticFeedback.lightImpact();
      }
      return;
    }

    //  2) product có option => mở bottom sheet lấy draft rồi add
    final draft = await showModalBottomSheet<CartItemDraft>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withOpacity(0.35),
      builder: (_) =>
          ProductOptionBottomSheet(merchantId: widget.merchantId, product: p),
    );

    if (draft == null) return;

    final selectedOptions = draft.selectedOptions
        .map<Map<String, String>>(
          (x) => {
            'option_id': x.optionId.toString(), // hoặc x.option_id tuỳ class
            'choice_id': x.choiceId.toString(), // hoặc x.choice_id
          },
        )
        .toList();

    final selectedToppings = draft.selectedToppings
        .map<Map<String, dynamic>>(
          (x) => {
            'topping_id': x.toppingId.toString(), // hoặc x.topping_id
            'quantity': x.quantity, // int
          },
        )
        .toList();

    await _cartCtrl.addProduct(
      productId: p.id,
      quantity: draft.quantity,
      selectedOptions: selectedOptions,
      selectedToppings: selectedToppings,
      note: draft.note ?? '',
    );

    final err = _cartState.error;
    if (err != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    } else {
      HapticFeedback.lightImpact();
    }
  }

  Future<void> _onAddToppingStandalone(MerchantDetailToppingItem t) async {
    if (!await _ensureLoggedIn()) return;

    await _cartCtrl.addToppingStandalone(toppingId: t.id, quantity: 1);

    final err = _cartState.error;
    if (err != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    } else {
      HapticFeedback.lightImpact();
    }
  }

  void _onTapTab(int tabIndex) {
    if (tabIndex < 0 || tabIndex >= _sectionHeaderKeys.length) return;
    final ctx = _sectionHeaderKeys[tabIndex].currentContext;
    if (ctx == null) return;

    _syncingFromTab = true;

    final box = ctx.findRenderObject() as RenderBox;
    final dy = box.localToGlobal(Offset.zero).dy;

    final target = (_scrollCtrl.offset + dy - _pinnedTop(context)).clamp(
      0.0,
      _scrollCtrl.position.maxScrollExtent,
    );

    _scrollCtrl.animateTo(
      target,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );

    _syncTimer?.cancel();
    _syncTimer = Timer(const Duration(milliseconds: 350), () {
      _syncingFromTab = false;
    });
  }

  Future<bool> _ensureLoggedIn() async {
    final auth = ref.read(authViewModelProvider);
    final user = auth.valueOrNull; // null = guest

    if (user == null) {
      if (!mounted) return false;
      // mở màn đăng nhập
      context.push('/signin');
      return false;
    }
    return true;
  }

  void _showBenefitsSheet(BuildContext context, MerchantDetailResponse d) {
    final entries = _buildBenefitEntries(d);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return DraggableScrollableSheet(
          initialChildSize: 0.86,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (context, scrollCtrl) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  Container(
                    width: 44,
                    height: 5,
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Header giống ảnh: title giữa
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_ios_new_rounded),
                        color: AppColor.primary,
                      ),
                      const Expanded(
                        child: Text(
                          'Dành cho bạn',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      const SizedBox(width: 48), // giữ cân giữa
                    ],
                  ),
                  const Divider(height: 1),

                  Expanded(
                    child: ListView.separated(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                      itemCount: entries.length,
                      separatorBuilder: (_, __) => const Divider(height: 24),
                      itemBuilder: (_, i) => _BenefitTile(entry: entries[i]),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _openSearchSheet(MerchantDetailResponse d) {
    final items = _buildSearchItems(d);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withOpacity(0.35),
      builder: (_) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.7,
          maxChildSize: 0.90,
          expand: false,
          builder: (context, scrollCtrl) {
            return _MerchantSearchSheet(
              merchantName: d.merchant.name,
              items: items,
              listController: scrollCtrl, //  truyền controller cho list
              onClose: () => Navigator.pop(context),
              onTapItem: (it) {
                Navigator.pop(context);
                _onTapTab(it.sectionIndex);
              },
            );
          },
        );
      },
    );
  }

  List<SearchItem> _buildSearchItems(MerchantDetailResponse d) {
    final out = <SearchItem>[];

    // _entries của bạn đang là header + item, nên mình map theo entries cho dễ scroll
    for (int i = 0; i < _entries.length; i++) {
      final e = _entries[i];
      if (e.isHeader) continue;
      final secKey = d.sections[e.sectionIndex].key;
      if (secKey == 'on_sale') continue;

      final it = e.item!;
      if (it is MerchantDetailProductItem) {
        out.add(
          SearchItem(
            kind: SearchKind.product,
            id: it.id,
            name: it.name,
            desc: it.description,
            imageUrl: it.cover,
            price: it.price,
            basePrice: it.basePrice,
            isAvailable: it.isAvailable,
            sectionIndex: e.sectionIndex,
            entryIndex: i,
          ),
        );
      } else {
        final t = it as MerchantDetailToppingItem;
        out.add(
          SearchItem(
            kind: SearchKind.topping,
            id: t.id,
            name: t.name,
            desc: (t.description ?? ''),
            imageUrl: t.image_url, // nullable
            price: t.price,
            basePrice: null,
            isAvailable: t.isAvailable,
            sectionIndex: e.sectionIndex,
            entryIndex: i,
          ),
        );
      }
    }

    return out;
  }

  void _showMerchantInfoSheet(BuildContext context, MerchantDetailResponse d) {
    final m = d.merchant;
    final biz = d.business;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return DraggableScrollableSheet(
          initialChildSize: 0.72,
          minChildSize: 0.45,
          maxChildSize: 0.95,
          builder: (context, scrollCtrl) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  Container(
                    width: 44,
                    height: 5,
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Header
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_ios_new_rounded),
                        color: AppColor.primary,
                      ),
                      const Expanded(
                        child: Text(
                          'Thông tin',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: 48),
                    ],
                  ),
                  const Divider(height: 1),

                  Expanded(
                    child: ListView(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                      children: [
                        _InfoRow(
                          icon: Icons.location_on_outlined,
                          title: formatDistance(m.distanceKm),
                        ),
                        _InfoRow(
                          icon: Icons.near_me_outlined,
                          title: m.address,
                          trailing: const Icon(
                            Icons.chevron_right,
                            color: Colors.black26,
                          ),
                          onTap: () {
                            openGoogleMaps(m.address);
                          },
                        ),
                        const Divider(height: 1),

                        _InfoRow(
                          icon: Icons.restaurant_outlined,
                          title: 'Phân loại: ${categoryLabel(m.category)}',
                        ),
                        const Divider(height: 1),

                        // ===== Business hours =====
                        _HoursBlock(now: biz.now, weekly: biz.weeklyHours),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(merchantDetailProvider(_params));
    final ctrl = ref.read(merchantDetailProvider(_params).notifier);

    //  watch cart summary (trigger auto loadSummary trong CartController)
    final cartParams = CartParams.delivery(merchantId: widget.merchantId);

    final d = st.data;
    if (d != null &&
        (_tabCtrl == null || _tabCtrl!.length != d.sections.length)) {
      _rebuildForData(d);
    }

    return Scaffold(
      bottomNavigationBar: _MerchantCartBar(params: cartParams),
      backgroundColor: Colors.white,
      body: st.isLoading && d == null
          ? const MerchantDetailSkeleton()
          : d == null
          ? _ErrorView(
              message: st.error ?? 'Không tải được dữ liệu',
              onRetry: ctrl.retry,
            )
          : _buildBody(context, d, ctrl),
    );
  }

  Widget _buildBody(
    BuildContext context,
    MerchantDetailResponse d,
    MerchantDetailController ctrl,
  ) {
    final tabCtrl = _tabCtrl!;
    final merchant = d.merchant;

    final coverList = merchant.coverUrls.isNotEmpty
        ? merchant.coverUrls
        : (merchant.logoUrl != null && merchant.logoUrl!.isNotEmpty
              ? [merchant.logoUrl!]
              : const <String>[]);

    return RefreshIndicator.adaptive(
      onRefresh: () => ctrl.retry(),
      child: CustomScrollView(
        controller: _scrollCtrl,
        slivers: [
          _buildSliverAppBar(context, coverList, merchant, d),

          SliverToBoxAdapter(
            child: _buildMerchantInfo(
              d.business.now,
              merchant,
              isFavorited: d.viewer.isFavorited,
            ),
          ),
          SliverToBoxAdapter(child: _buildDeliveryAndPromos(d)),
          SliverToBoxAdapter(child: _buildPopular(d.popular)),

          SliverPersistentHeader(
            pinned: true,
            delegate: _TabHeaderDelegate(
              tabBar: TabBar(
                controller: tabCtrl,
                tabAlignment: TabAlignment.start,
                isScrollable: true,
                labelColor: AppColor.primary,
                unselectedLabelColor: Colors.black54,
                indicatorColor: AppColor.primary,
                indicatorWeight: 2.5,
                labelStyle: const TextStyle(
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                ),
                onTap: _onTapTab,
                tabs: [for (final s in d.sections) Tab(text: s.title)],
              ),
              trailing: IconButton(
                onPressed: () => _showSectionPicker(context, d.sections),
                icon: const Icon(Icons.keyboard_arrow_down_rounded),
                color: Colors.black54,
              ),
            ),
          ),

          SliverPadding(
            //  chừa đáy để không bị bottom bar che
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).padding.bottom,
            ),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final e = _entries[index];
                if (e.isHeader) {
                  final sec = d.sections[e.sectionIndex];
                  return _MenuSectionHeader(
                    key: _sectionHeaderKeys[e.sectionIndex],
                    title: sec.title,
                    count: sec.items.length,
                  );
                }
                return _MenuItemRow(
                  item: e.item!,
                  onAdd: (it) {
                    if (it is MerchantDetailProductItem) {
                      unawaited(_onAddPressed(it));
                    } else if (it is MerchantDetailToppingItem) {
                      unawaited(_onAddToppingStandalone(it));
                    }
                  },
                );
              }, childCount: _entries.length),
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).padding.bottom,
            ),
            sliver: SliverToBoxAdapter(
              child: Center(
                child: Text(
                  'Đã xem hết',
                  style: TextStyle(fontSize: 12, color: Colors.black38),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  SliverAppBar _buildSliverAppBar(
    BuildContext context,
    List<String> covers,
    MerchantDetailMerchant merchant,
    MerchantDetailResponse d,
  ) {
    final topPad = MediaQuery.paddingOf(context).top;
    const expandedH = 210.0; // ngắn lại xíu, giống bạn muốn

    return SliverAppBar(
      pinned: true,
      automaticallyImplyLeading: false,
      expandedHeight: expandedH,
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      flexibleSpace: LayoutBuilder(
        builder: (context, constraints) {
          final minH = topPad + kToolbarHeight;
          final maxH = expandedH + topPad;

          // t: 0 (expanded) -> 1 (collapsed)
          final t = ((maxH - constraints.biggest.height) / (maxH - minH)).clamp(
            0.0,
            1.0,
          );

          // Search xuất hiện từ giữa chặng (giống IMG_1444)
          final searchT = ((t - 0.33) / 0.27).clamp(0.0, 1.0);

          // Nền topbar chuyển sang trắng khi gần collapse (IMG_1445/1446)
          final bgT = ((t - 0.62) / 0.38).clamp(0.0, 1.0);

          final topBarColor = Color.lerp(
            Colors.transparent,
            Colors.white,
            bgT,
          )!;
          final iconColor = Color.lerp(Colors.white, AppColor.primary, bgT)!;

          final searchBg = Color.lerp(
            Colors.white.withOpacity(0.20),
            const Color(0xFFF3F4F6),
            bgT,
          )!;

          return Stack(
            fit: StackFit.expand,
            children: [
              // Cover
              if (covers.isEmpty)
                Container(color: Colors.black12)
              else
                PageView.builder(
                  itemCount: covers.length,
                  itemBuilder: (context, i) => CachedNetworkImage(
                    imageUrl: covers[i],
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: Colors.black12),
                    errorWidget: (_, __, ___) =>
                        Container(color: Colors.black12),
                  ),
                ),

              // Overlay gradient (đẹp lúc expanded)
              Positioned.fill(
                child: IgnorePointer(
                  child: Opacity(
                    opacity: (1 - bgT) * 0.9,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withOpacity(0.35),
                            Colors.transparent,
                            Colors.black.withOpacity(0.08),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              //  Top bar (luôn tồn tại, chỉ đổi màu)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: minH,
                child: Container(
                  color: topBarColor,
                  padding: EdgeInsets.only(top: topPad),
                  child: Row(
                    children: [
                      IconButton(
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.black12,
                        ),
                        icon: Icon(Iconsax.arrow_left_copy, color: iconColor),
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),

                      // Cross-fade: icon search -> search field
                      Expanded(
                        child: Stack(
                          alignment: Alignment.centerLeft,
                          children: [
                            // Search icon mode

                            // Search field mode (fade in từ giữa chặng)
                            Opacity(
                              opacity: searchT,
                              child: Transform.translate(
                                offset: Offset(0, (1 - searchT) * -6),
                                child: InkWell(
                                  onTap: () => _openSearchSheet(d),
                                  child: Container(
                                    height: 38,
                                    margin: const EdgeInsets.only(right: 8),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: searchBg,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: Colors.black.withOpacity(0.06),
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.search,
                                          size: 18,
                                          color: Colors.black38,
                                        ),
                                        SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            'Tìm món tại ${merchant.name}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              color: Colors.black38,
                                              fontSize: 13,
                                              fontWeight: FontWeight.w400,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      Opacity(
                        opacity: 1 - searchT,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: IconButton(
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.black12,
                            ),
                            onPressed: () => _openSearchSheet(d),
                            icon: Icon(
                              Iconsax.search_normal_1_copy,
                              color: iconColor,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMerchantInfo(
    MerchantBusinessNow now,

    MerchantDetailMerchant m, {
    required bool isFavorited,
  }) {
    final ratingText = m.rating.toDouble().toStringAsFixed(1);
    final reviewsInt = m.reviews.toInt();

    final statusChip = _buildOpenStatusChip(now);
    final favSt = ref.watch(favoriteMerchantToggleProvider(widget.merchantId));
    final favCtrl = ref.read(
      favoriteMerchantToggleProvider(widget.merchantId).notifier,
    );

    // set initial từ API detail (chỉ 1 lần nhờ _inited)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      favCtrl.setInitial(isFavorited);
    });

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            m.name,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.star, size: 18, color: Colors.amber),
              const SizedBox(width: 4),
              Text(
                ratingText,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              const SizedBox(width: 8),
              Text(
                '(${reviewsInt}+ Bình luận)',
                style: const TextStyle(
                  color: Colors.black54,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 10),
              const Icon(Icons.access_time, size: 18, color: Colors.black54),
              const SizedBox(width: 4),
              Text(
                '${m.etaMin} phút',
                style: const TextStyle(
                  color: Colors.black54,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: favSt.isToggling
                    ? null
                    : () async {
                        if (!await _ensureLoggedIn()) return;
                        await favCtrl.toggle();
                      },
                icon: Icon(
                  favSt.isFavorited ? Icons.favorite : Icons.favorite_border,
                ),
                color: AppColor.primary,
              ),
            ],
          ),

          //  status (chỉ hiện khi closed / closing soon)
          if (statusChip != null) ...[const SizedBox(height: 10), statusChip],
        ],
      ),
    );
  }

  Widget? _buildOpenStatusChip(MerchantBusinessNow now) {
    final closeIn = now.closeInMin; // int? (nullable)

    // OPEN: không hiện gì
    if (now.status == 'open' && (closeIn == null || closeIn > 30)) return null;

    // CLOSING SOON: status=closing_soon HOẶC open nhưng close_in_min <= 30
    final isClosingSoon =
        now.status == 'closing_soon' ||
        (now.status == 'open' && (closeIn ?? 999) <= 30);

    if (isClosingSoon) {
      final m = closeIn ?? 0;
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            size: 16,
            color: Color(0xFFF59E0B),
          ),
          const SizedBox(width: 6),
          Text(
            'Sắp đóng cửa (${m} phút)',
            style: const TextStyle(
              fontWeight: FontWeight.w400,
              color: AppColor.primary,
            ),
          ),
        ],
      );
    }

    // CLOSED: hiện “đang đóng cửa”
    if (now.status == 'closed' || now.isOpen == false) {
      return Row(
        spacing: 5,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(Icons.lock_outline, color: AppColor.primary, size: 18),
          Text(
            'Đang đóng cửa',
            style: TextStyle(
              fontWeight: FontWeight.w400,
              color: AppColor.primary,
            ),
          ),
        ],
      );
    }

    return null;
  }

  Widget _buildDeliveryAndPromos(MerchantDetailResponse d) {
    final etaAt = DateTime.now().add(Duration(minutes: d.merchant.etaMin));
    final etaText = 'Dự kiến giao lúc ${hhmm(etaAt)}';
    final entries = _buildBenefitEntries(d);

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        children: [
          Row(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: const Color(0xFFFFF1EE),
                    child: ClipOval(
                      child: SizedBox(
                        width: 36,
                        height: 36,
                        child: (d.merchant.logoUrl?.isNotEmpty ?? false)
                            ? CachedNetworkImage(
                                imageUrl: d.merchant.logoUrl!,
                                fit: BoxFit.cover,
                                placeholder: (_, __) => const Center(
                                  child: SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                                ),
                                errorWidget: (_, __, ___) => const Icon(
                                  Icons.store,
                                  color: Color(0xFFEE4D2D),
                                  size: 20,
                                ),
                              )
                            : const Icon(
                                Icons.store,
                                color: Color(0xFFEE4D2D),
                                size: 20,
                              ),
                      ),
                    ),
                  ),
                  Positioned(
                    right: -1,
                    bottom: -1,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                      ),
                      alignment: Alignment.center,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: d.merchant.isAcceptingOrders
                              ? const Color(0xFF22C55E)
                              : Colors.grey,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      d.merchant.name,
                      style: TextStyle(fontWeight: FontWeight.w500),
                    ),
                    Text(
                      etaText,
                      style: const TextStyle(
                        color: Colors.black54,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => _showMerchantInfoSheet(context, d),
                child: Text(
                  'Thông tin',
                  style: TextStyle(
                    color: AppColor.primary,
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          if (entries.isNotEmpty) ...[
            const SizedBox(height: 10),

            // preview tối đa 2 dòng
            for (int i = 0; i < (entries.length >= 2 ? 2 : 1); i++) ...[
              InkWell(
                onTap: () => _showBenefitsSheet(context, d),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.local_shipping,
                        color: Color(0xFF10B981),
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          entries[i].title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.black87,
                            fontWeight: FontWeight.w500,
                            fontSize: 12,
                          ),
                        ),
                      ),

                      // nếu nhiều hơn 2 dòng: chỉ dòng thứ 2 mới hiện "Xem thêm"
                      if (entries.length > 2 && i == 1) ...[
                        const SizedBox(width: 8),
                        Text(
                          'Xem thêm',
                          style: TextStyle(
                            color: Colors.black.withOpacity(0.45),
                            fontWeight: FontWeight.w500,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 2),
                        const Icon(Icons.chevron_right, color: Colors.black26),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildPopular(List<MerchantDetailProductItem> popular) {
    if (popular.isEmpty) return const SizedBox.shrink();

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.only(top: 12, bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Món phổ biến',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFFEE4D2D),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 125,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: popular.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, i) => _PopularCard(
                item: popular[i],
                onAdd: (it) {
                  if (it is MerchantDetailProductItem) {
                    _onAddPressed(it); //  truyền đúng product
                  } else if (it is MerchantDetailToppingItem) {
                    unawaited(_onAddToppingStandalone(it));
                  }
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MerchantCartBar extends ConsumerWidget {
  const _MerchantCartBar({required this.params});

  final CartParams params;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final st = ref.watch(cartProvider(params));
    final s = st.summary;
    final paddingBottom = MediaQuery.paddingOf(context).bottom;
    final visible = s.itemCount > 0;
    final hasDiscount = s.discountEstimated > 0;

    if (!visible) return const SizedBox.shrink();

    Future<void> openCartSheet() async {
      final cartCtrl = ref.read(cartProvider(params).notifier);
      await cartCtrl.ensureCurrentLoaded();
      if (!context.mounted) return;
      final bottomGap = 53 + MediaQuery.paddingOf(context).bottom;
      showModalBottomSheet(
        context: context,

        useRootNavigator: false,
        isScrollControlled: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
        barrierColor: Colors.transparent,
        builder: (_) {
          //  nếu CartBottomSheet của bạn nhận merchantId:
          return Padding(
            padding: EdgeInsets.only(bottom: bottomGap),
            child: CartBottomSheet(merchantId: params.merchantId),
          );
        },
      );
    }

    return Material(
      color: Colors.white,
      elevation: 10,
      child: InkWell(
        onTap: openCartSheet,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.10),
                blurRadius: 18,
                offset: const Offset(0, -6),
              ),
            ],
            // (tuỳ chọn) viền mỏng phía trên cho giống ShopeeFood hơn
            border: Border(
              top: BorderSide(color: Colors.black.withOpacity(0.06), width: 1),
            ),
          ),
          padding: EdgeInsets.fromLTRB(14, 10, 14, paddingBottom),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(Iconsax.bag, size: 26, color: AppColor.primary),
                  Positioned(
                    right: -10,
                    top: -10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColor.primary,
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        s.itemCount.toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const Spacer(), //  đẩy cụm tiền+button sang phải
              // RIGHT: price + button (cùng 1 cụm)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // price block
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.end, //  canh phải
                    children: [
                      if (hasDiscount)
                        Text(
                          money(s.originalEstimated),
                          style: const TextStyle(
                            color: Colors.black38,
                            decoration: TextDecoration.lineThrough,
                            fontWeight: FontWeight.w400,
                            fontSize: 12,
                          ),
                        ),
                      Text(
                        money(s.totalEstimated),
                        style: const TextStyle(
                          color: AppColor.primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(width: 12),

                  SizedBox(
                    height: 44,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColor.primary,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                      ),
                      onPressed: () {},
                      child: const Text(
                        'Giao hàng', // hoặc 'Giao hàng'
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuEntry {
  final int sectionIndex;
  final bool isHeader;
  final MerchantDetailSectionItem? item;

  const _MenuEntry._(this.sectionIndex, this.isHeader, this.item);

  factory _MenuEntry.header({required int sectionIndex}) =>
      _MenuEntry._(sectionIndex, true, null);

  factory _MenuEntry.item({
    required int sectionIndex,
    required MerchantDetailSectionItem item,
  }) => _MenuEntry._(sectionIndex, false, item);
}

class _BenefitTile extends StatelessWidget {
  const _BenefitTile({required this.entry});
  final _BenefitEntry entry;

  String _fmtDate(DateTime? d) {
    if (d == null) return '';
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    final yyyy = d.year.toString();
    return '$dd/$mm/$yyyy';
  }

  @override
  Widget build(BuildContext context) {
    final title = entry.title;

    // details (basic, vì voucher schema bạn chưa chốt full)
    String? redLine;
    String? minLine;
    String? timeLine;

    if (entry.promo != null) {
      final p = entry.promo!;
      redLine = (p.type == 'percentage')
          ? 'Giảm giá: ${p.discountValue.toStringAsFixed(0)}% – Tự động áp dụng'
          : 'Giảm giá: ${money(p.discountValue)} – Tự động áp dụng';

      if (p.minOrderAmount > 0)
        minLine = 'Đặt tối thiểu: ${money(p.minOrderAmount)}';

      final from = _fmtDate(p.validFrom);
      final to = _fmtDate(p.validTo);
      if (from.isNotEmpty || to.isNotEmpty) {
        timeLine = 'Thời gian áp dụng: $from - $to';
      }
    } else {
      final v = entry.voucher!;
      if ((v.discountValue ?? 0) > 0) {
        redLine = (v.code ?? '').isNotEmpty
            ? 'Giảm giá: ${money(v.discountValue!)} – Mã: ${v.code}'
            : 'Giảm giá: ${money(v.discountValue!)}';
      }
      if ((v.minOrderAmount ?? 0) > 0)
        minLine = 'Đặt tối thiểu: ${money(v.minOrderAmount!)}';

      final from = _fmtDate(v.validFrom);
      final to = _fmtDate(v.validTo);
      if (from.isNotEmpty || to.isNotEmpty) {
        timeLine = 'Thời gian áp dụng: $from - $to';
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(
              Icons.local_shipping,
              color: Color(0xFF10B981),
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        if (redLine != null)
          Text(
            redLine,
            style: TextStyle(
              color: AppColor.primary,
              fontWeight: FontWeight.w800,
            ),
          ),
        if (minLine != null) ...[
          const SizedBox(height: 6),
          Text(minLine, style: const TextStyle(color: Colors.black54)),
        ],
        if (timeLine != null) ...[
          const SizedBox(height: 6),
          Text(timeLine, style: const TextStyle(color: Colors.black54)),
        ],
        const SizedBox(height: 4),
        const Text(
          'Số lượng ưu đãi có hạn',
          style: TextStyle(color: Colors.black38),
        ),
      ],
    );
  }
}

class _TabHeaderDelegate extends SliverPersistentHeaderDelegate {
  _TabHeaderDelegate({required this.tabBar, required this.trailing});

  final TabBar tabBar;
  final Widget trailing;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      color: Colors.white,
      elevation: overlapsContent ? 2 : 0,
      child: Row(
        children: [
          Expanded(child: tabBar),
          Container(
            width: 1,
            height: 22,
            color: Colors.black.withOpacity(0.10),
          ),
          trailing,
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _TabHeaderDelegate oldDelegate) =>
      oldDelegate.tabBar != tabBar || oldDelegate.trailing != trailing;
}

class _MenuSectionHeader extends StatelessWidget {
  const _MenuSectionHeader({
    super.key,
    required this.title,
    required this.count,
  });
  final String title;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Text(
        '$title ($count)',
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: AppColor.iconInactive,
        ),
      ),
    );
  }
}

class _BenefitEntry {
  final AutoPromotion? promo;
  final VoucherItem? voucher;

  const _BenefitEntry.promo(this.promo) : voucher = null;
  const _BenefitEntry.voucher(this.voucher) : promo = null;

  bool get isPromo => promo != null;

  String get title {
    if (promo != null) return promotionText(promo!);
    final v = voucher!;
    if ((v.code ?? '').isNotEmpty) {
      // ví dụ như ShopeeFood: Nhập "CODE": Giảm ...
      final disc = (v.discountValue == null) ? '' : money(v.discountValue!);
      return 'Nhập "${v.code}": Giảm $disc';
    }
    final disc = (v.discountValue == null) ? '' : money(v.discountValue!);
    return 'Voucher: Giảm $disc';
  }
}

List<_BenefitEntry> _buildBenefitEntries(MerchantDetailResponse d) {
  return [
    ...d.benefits.autoPromotions.map((p) => _BenefitEntry.promo(p)),
    ...d.benefits.vouchers.map((v) => _BenefitEntry.voucher(v)),
  ];
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.title,
    this.trailing,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppColor.info),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,

                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                ),
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
      ),
    );
  }
}

/// Hiện "Giờ mở cửa" giống ảnh + list tuần
class _HoursBlock extends StatelessWidget {
  const _HoursBlock({required this.now, required this.weekly});

  final MerchantBusinessNow now;
  final List<MerchantWeeklyHour> weekly;

  @override
  Widget build(BuildContext context) {
    final MerchantWeeklyHour? today = () {
      for (final w in weekly) {
        if (w.day == now.day) return w;
      }
      return weekly.isNotEmpty ? weekly.first : null;
    }();
    final todayText = (today == null)
        ? 'Hôm nay: —'
        : (today.isClosed
              ? 'Hôm nay: Đóng cửa'
              : 'Hôm nay: ${today.openTime}–${today.closeTime}');

    final statusText = _statusText(now);

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.access_time, color: AppColor.info),
              SizedBox(width: 10),
              Text(
                'Giờ mở cửa:',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // status line
          Row(
            children: [
              Expanded(
                child: Text(
                  '$statusText • $todayText',
                  style: const TextStyle(
                    color: Colors.black54,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // weekly list
          ...weekly.map((w) {
            final isToday = w.day == now.day;
            final line = w.isClosed
                ? 'Đóng cửa'
                : '${w.openTime}–${w.closeTime}';
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  SizedBox(
                    width: 110,
                    child: Text(
                      w.label,
                      style: TextStyle(
                        fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                        color: isToday ? AppColor.info : Colors.black54,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  Text(
                    line,
                    style: TextStyle(
                      fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                      color: isToday ? AppColor.info : Colors.black54,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  String _statusText(MerchantBusinessNow n) {
    switch (n.status) {
      case 'open':
        if ((n.closeInMin ?? 999) <= 30)
          return 'Sắp đóng cửa (${n.closeInMin} phút)';
        return 'Đang mở';
      case 'closing_soon':
        return 'Sắp đóng cửa (${n.closeInMin ?? ''} phút)';
      default:
        return 'Đang đóng';
    }
  }
}

class _MenuItemRow extends StatelessWidget {
  const _MenuItemRow({required this.item, required this.onAdd});
  final MerchantDetailSectionItem item;
  final void Function(MerchantDetailSectionItem item) onAdd;

  @override
  Widget build(BuildContext context) {
    if (item is MerchantDetailProductItem) {
      final p = item as MerchantDetailProductItem;
      final hasSale = (p.basePrice != null && p.basePrice! > p.price);
      final percent = p.discountPercent;
      final reviews = p.reviews;

      final enabled = p.isAvailable;

      return Opacity(
        opacity: enabled ? 1 : 0.45,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(
              bottom: BorderSide(color: Colors.black.withOpacity(0.08)),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 78,
                      height: 78,
                      child: (p.cover == null)
                          ? Container(color: Colors.black12)
                          : CachedNetworkImage(
                              imageUrl: p.cover!,
                              fit: BoxFit.cover,
                              placeholder: (_, __) =>
                                  Container(color: Colors.black12),
                              errorWidget: (_, __, ___) =>
                                  Container(color: Colors.black12),
                            ),
                    ),
                  ),
                  if (hasSale && percent > 0)
                    Positioned(
                      child: Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: Color(0xffF8EA78),
                          borderRadius: BorderRadius.only(
                            topLeft: Radius.circular(12),
                            bottomRight: Radius.circular(12),
                          ),
                        ),
                        child: Text(
                          '-$percent%',
                          style: TextStyle(
                            color: AppColor.primary,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    if (p.description.trim().isNotEmpty)
                      Text(
                        p.description.trim(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.black54,
                          fontWeight: FontWeight.w500,
                          fontSize: 12,
                        ),
                      ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        if (p.sold > 0)
                          Text(
                            '${p.sold}+ đã bán',
                            style: const TextStyle(
                              color: Colors.black45,
                              fontWeight: FontWeight.w500,
                              fontSize: 10,
                            ),
                          ),
                        if (p.sold > 0 && p.reviews > 0)
                          const Text(
                            '  |  ',
                            style: TextStyle(color: Colors.black26),
                          ),
                        if (p.reviews > 0)
                          Text(
                            '${p.reviews} đánh giá',
                            style: const TextStyle(
                              color: Colors.black45,
                              fontWeight: FontWeight.w500,
                              fontSize: 10,
                            ),
                          ),
                        if (hasSale && percent > 0) ...[
                          const Text(
                            '  |  ',
                            style: TextStyle(color: Colors.black26),
                          ),

                          Text(
                            reviews == 0
                                ? 'Chưa có đánh giá '
                                : '$reviews lượt thích',
                            style: TextStyle(
                              color: AppColor.primary,
                              fontWeight: FontWeight.w500,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          money(p.price),
                          style: TextStyle(
                            color: AppColor.primary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (hasSale)
                          Text(
                            money(p.basePrice!),
                            style: const TextStyle(
                              color: Colors.black38,
                              decoration: TextDecoration.lineThrough,
                              fontWeight: FontWeight.w400,
                              fontSize: 12,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              InkWell(
                onTap: enabled ? () => onAdd(item) : null,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 25,
                  height: 25,
                  decoration: BoxDecoration(
                    color: enabled ? AppColor.primary : Colors.black12,
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: const Icon(Icons.add, color: Colors.white, size: 15),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // TOPPING ITEM
    final t = item as MerchantDetailToppingItem;
    final enabled = t.isAvailable;
    final qtyLabel = (t.maxQuantity <= 1)
        ? '1 phần/đơn'
        : 'Tối đa ${t.maxQuantity}/đơn';

    return Opacity(
      opacity: enabled ? 1 : 0.45,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            bottom: BorderSide(color: Colors.black.withOpacity(0.08)),
          ),
        ),

        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: CachedNetworkImage(
                imageUrl: t.image_url!, // Tránh lỗi dùng dấu !
                width: 78,
                height: 78,
                fit: BoxFit.cover,
                // Dùng placeholder làm background "sạch" hơn
                placeholder: (_, __) => Container(color: Colors.black12),
                // Tránh đỏ màn hình nếu URL sai/null
                errorWidget: (_, __, ___) => Container(
                  color: Colors.black12,
                  child: const Icon(Icons.broken_image, color: Colors.grey),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if ((t.description ?? '').trim().isNotEmpty)
                    Text(
                      (t.description ?? '').trim(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.black54,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  const SizedBox(height: 6),
                  Text(
                    qtyLabel,
                    style: TextStyle(
                      color: (t.maxQuantity <= 1)
                          ? AppColor.primary
                          : Colors.black45,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    money(t.price),
                    style: TextStyle(
                      color: AppColor.primary,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            InkWell(
              onTap: enabled ? () => onAdd(item) : null,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 25,
                height: 25,
                decoration: BoxDecoration(
                  color: enabled ? AppColor.primary : Colors.black12,
                  borderRadius: BorderRadius.circular(5),
                ),
                child: const Icon(Icons.add, color: Colors.white, size: 15),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PopularCard extends StatelessWidget {
  const _PopularCard({required this.item, required this.onAdd});
  final MerchantDetailProductItem item;
  final void Function(MerchantDetailSectionItem item) onAdd;
  @override
  Widget build(BuildContext context) {
    final hasSale = item.basePrice != null && item.basePrice! > item.price;

    final p = item;
    final percent = p.discountPercent;
    final reviews = p.reviews;

    final enabled = p.isAvailable;

    return Opacity(
      opacity: enabled ? 1 : 0.45,
      child: Container(
        width: MediaQuery.of(context).size.width * 0.85,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: BoxDecoration(
          color: AppColor.background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.black.withOpacity(0.08), width: .5),  
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 78,
                    height: 78,
                    child: (p.cover == null)
                        ? Container(color: Colors.black12)
                        : CachedNetworkImage(
                            imageUrl: p.cover!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                Container(color: Colors.black12),
                            errorWidget: (_, __, ___) =>
                                Container(color: Colors.black12),
                          ),
                  ),
                ),
                if (hasSale && percent > 0)
                  Positioned(
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 5, vertical: 3),
                      decoration: BoxDecoration(
                        color: Color(0xffF8EA78),
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(12),
                          bottomRight: Radius.circular(12),
                        ),
                      ),
                      child: Text(
                        '-$percent%',
                        style: TextStyle(color: AppColor.primary, fontSize: 10),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (p.description.trim().isNotEmpty)
                    Text(
                      p.description.trim(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.black54,
                        fontWeight: FontWeight.w500,
                        fontSize: 12,
                      ),
                    ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (p.sold > 0)
                        Text(
                          '${p.sold}+ đã bán',
                          style: const TextStyle(
                            color: Colors.black45,
                            fontWeight: FontWeight.w500,
                            fontSize: 10,
                          ),
                        ),
                      if (p.sold > 0 && p.reviews > 0)
                        const Text(
                          '  |  ',
                          style: TextStyle(color: Colors.black26),
                        ),
                      if (p.reviews > 0)
                        Text(
                          '${p.reviews} đánh giá',
                          style: const TextStyle(
                            color: Colors.black45,
                            fontWeight: FontWeight.w500,
                            fontSize: 10,
                          ),
                        ),
                      if (hasSale && percent > 0) ...[
                        const Text(
                          '  |  ',
                          style: TextStyle(color: Colors.black26),
                        ),

                        Text(
                          reviews == 0
                              ? 'Chưa có đánh giá '
                              : '$reviews lượt thích',
                          style: TextStyle(
                            color: AppColor.primary,
                            fontWeight: FontWeight.w500,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        money(p.price),
                        style: TextStyle(
                          color: AppColor.primary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (hasSale)
                        Text(
                          money(p.basePrice!),
                          style: const TextStyle(
                            color: Colors.black38,
                            decoration: TextDecoration.lineThrough,
                            fontWeight: FontWeight.w400,
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            InkWell(
              onTap: enabled ? () => onAdd(item) : null,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 25,
                height: 25,
                decoration: BoxDecoration(
                  color: enabled ? AppColor.primary : Colors.black12,
                  borderRadius: BorderRadius.circular(5),
                ),
                child: const Icon(Icons.add, color: Colors.white, size: 15),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MerchantSearchSheet extends StatefulWidget {
  const _MerchantSearchSheet({
    required this.merchantName,
    required this.items,
    required this.onClose,
    required this.onTapItem,
    required this.listController,
  });

  final String merchantName;
  final List<SearchItem> items;
  final ScrollController listController;
  final VoidCallback onClose;
  final void Function(SearchItem it) onTapItem;

  @override
  State<_MerchantSearchSheet> createState() => _MerchantSearchSheetState();
}

class _MerchantSearchSheetState extends State<_MerchantSearchSheet> {
  final _ctrl = TextEditingController();
  Timer? _debounce;

  String _q = '';
  List<SearchItem> _filtered = const [];
  bool _searching = false; //  linear loading

  @override
  void initState() {
    super.initState();
    _filtered = widget.items; //  show list ngay khi mở
    _ctrl.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _ctrl.removeListener(_onTextChanged);
    _ctrl.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    final v = _ctrl.text; // đừng trim ở đây để icon clear update “mượt”

    // setState ngay để UI (icon clear + linear) update liền
    setState(() {
      _q = v;
      _searching = true;
    });

    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 280), () {
      if (!mounted) return;
      final key = v.trim();
      setState(() {
        _filtered = _filter(widget.items, key);
        _searching = false;
      });
    });
  }

  List<SearchItem> _filter(List<SearchItem> items, String q) {
    if (q.isEmpty) return items;

    final key = vnRemoveDiacritics(q.toLowerCase());
    return items.where((x) {
      final n = vnRemoveDiacritics(x.name.toLowerCase());
      final d = vnRemoveDiacritics(x.desc.toLowerCase());
      return n.contains(key) || d.contains(key);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.paddingOf(context).top;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      child: Column(
        children: [
          SizedBox(height: topPad > 0 ? 8 : 10),

          // ===== Search bar row =====
          Row(
            children: [
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  height: 40,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, size: 18, color: Colors.black38),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          cursorColor: CupertinoColors.activeBlue,
                          controller: _ctrl,
                          autofocus: true,
                          decoration: InputDecoration(
                            hintText: 'Tìm món tại ${widget.merchantName}...',
                            border: InputBorder.none,
                            isDense: true,
                            hintStyle: TextStyle(
                              fontSize: 13,
                              color: CupertinoColors.inactiveGray,
                            ),
                          ),
                        ),
                      ),
                      if (_ctrl.text.isNotEmpty)
                        GestureDetector(
                          onTap: () {
                            _ctrl.clear();
                            setState(() {
                              _q = '';
                              _filtered = widget.items;
                              _searching = false;
                            });
                          },
                          child: const Icon(
                            Icons.cancel,
                            size: 18,
                            color: Colors.black38,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              TextButton(
                onPressed: widget.onClose,
                child: Text(
                  'Huỷ',
                  style: TextStyle(
                    color: AppColor.primary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 6),
            ],
          ),

          // linear loading khi đang debounce/filter
          if (_searching)
            const LinearProgressIndicator(
              minHeight: 2,
              color: AppColor.primary,
            ),
          if (!_searching) const SizedBox(height: 2),

          // ===== Results =====
          Expanded(
            child: _filtered.isEmpty
                ? const Center(child: Text('Không có kết quả'))
                : ListView.separated(
                    controller: widget.listController,
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 16),
                    itemCount: _filtered.length,
                    separatorBuilder: (_, __) => const Divider(height: 18),
                    itemBuilder: (_, i) {
                      final it = _filtered[i];
                      return _SearchRow(
                        item: it,
                        query: _q.trim(),
                        onTap: () => widget.onTapItem(it),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _SearchRow extends StatelessWidget {
  const _SearchRow({
    required this.item,
    required this.query,
    required this.onTap,
  });

  final SearchItem item;
  final String query;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final enabled = item.isAvailable;

    final normalName = const TextStyle(
      fontWeight: FontWeight.w500,
      fontSize: 13,
      color: Colors.black,
    );
    final normalDesc = const TextStyle(
      fontSize: 13,
      color: Colors.black54,
      fontWeight: FontWeight.w500,
    );

    final hiName = normalName.copyWith(color: AppColor.primary);
    final hiDesc = normalDesc.copyWith(color: AppColor.primary);

    return Opacity(
      opacity: enabled ? 1 : 0.45,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                width: 62,
                height: 62,
                child: (item.imageUrl == null || item.imageUrl!.isEmpty)
                    ? Container(color: Colors.black12)
                    : CachedNetworkImage(
                        imageUrl: item.imageUrl!,
                        fit: BoxFit.cover,
                        placeholder: (_, __) =>
                            Container(color: Colors.black12),
                        errorWidget: (_, __, ___) =>
                            Container(color: Colors.black12),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RichText(
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    text: TextSpan(
                      children: buildHighlightedSpans(
                        text: item.name,
                        query: query,
                        normal: normalName,
                        highlight: hiName,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (item.desc.trim().isNotEmpty)
                    RichText(
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      text: TextSpan(
                        style: const TextStyle(
                          color: Colors.black54,
                          fontWeight: FontWeight.w500,
                        ),
                        children: buildHighlightedSpans(
                          text: item.desc.trim(),
                          query: query,
                          normal: normalDesc,
                          highlight: hiDesc,
                        ),
                      ),
                    ),
                  const SizedBox(height: 5),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        money(item.price),
                        style: TextStyle(
                          color: AppColor.primary,
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (item.basePrice != null &&
                          item.basePrice! > item.price)
                        Text(
                          money(item.basePrice!),
                          style: const TextStyle(
                            color: Colors.black38,
                            decoration: TextDecoration.lineThrough,
                            fontWeight: FontWeight.w400,
                            fontSize: 10,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              width: 25,
              height: 25,
              decoration: BoxDecoration(
                color: enabled ? AppColor.primary : Colors.black12,
                borderRadius: BorderRadius.circular(5),
              ),
              child: const Icon(Icons.add, color: Colors.white, size: 14),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 10),
            ElevatedButton(onPressed: onRetry, child: const Text('Thử lại')),
          ],
        ),
      ),
    );
  }
}
