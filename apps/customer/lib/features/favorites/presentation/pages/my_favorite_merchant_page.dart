import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/favorites/data/model/favorite_merchant_models.dart';
import 'package:customer/features/favorites/presentation/viewmodels/favorite_merchant_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class MyFavoriteMerchantPage extends ConsumerStatefulWidget {
  const MyFavoriteMerchantPage({super.key});

  @override
  ConsumerState<MyFavoriteMerchantPage> createState() =>
      _MyFavoriteMerchantPageState();
}

class _MyFavoriteMerchantPageState extends ConsumerState<MyFavoriteMerchantPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);

    _scrollCtrl.addListener(() {
      final st = ref.read(favoriteMerchantsProvider);
      final ctrl = ref.read(favoriteMerchantsProvider.notifier);

      final nearBottom =
          _scrollCtrl.position.pixels >
          _scrollCtrl.position.maxScrollExtent - 240;

      if (nearBottom) {
        unawaited(ctrl.loadMore());
      }
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(favoriteMerchantsProvider);
    final ctrl = ref.read(favoriteMerchantsProvider.notifier);

    // tab 0: newest (giữ nguyên)
    // tab 1: near (sort theo distanceKm nếu có)
    List<FavoriteMerchantItem> items = st.items;
    if (_tabCtrl.index == 1) {
      final copy = [...items];
      copy.sort((a, b) {
        final da = a.merchant.distanceKm ?? 1e9;
        final db = b.merchant.distanceKm ?? 1e9;
        return da.compareTo(db);
      });
      items = copy;
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF4F5F6),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _TopBar(onBack: () => Navigator.pop(context)),
            TabBar(
              controller: _tabCtrl,
              onTap: (_) => setState(() {}),
              indicatorColor: AppColor.primary,
              labelColor: AppColor.primary,
              unselectedLabelColor: Colors.black87,
              labelStyle: const TextStyle(fontWeight: FontWeight.w800),
              tabs: const [
                Tab(text: 'Mới nhất'),
                Tab(text: 'Gần tôi'),
              ],
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => ctrl.load(),
                child: st.isLoading && items.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : items.isEmpty
                    ? _EmptyView(
                        message: st.error?.isNotEmpty == true
                            ? st.error!
                            : 'Chưa có quán yêu thích',
                        onRetry: ctrl.load,
                      )
                    : ListView.separated(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 18),
                        itemCount: items.length + 1,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) {
                          if (i == items.length) {
                            if (st.isLoadingMore) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 16),
                                child: Center(
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                ),
                              );
                            }
                            return const Padding(
                              padding: EdgeInsets.symmetric(vertical: 22),
                              child: Center(
                                child: Text(
                                  'Đã hiển thị tất cả kết quả',
                                  style: TextStyle(color: Colors.black38),
                                ),
                              ),
                            );
                          }

                          final row = items[i];
                          return _FavoriteMerchantCard(
                            item: row,
                            onUnfavorite: () async {
                              //  bạn có thể làm “optimistic remove” trong controller.
                              // Nếu controller chưa có hàm remove -> tạm reload.
                              // Mình dùng reload cho chắc:
                              // await repo.unfavorite(...) rồi ctrl.load()
                              await ctrl.unfavoriteAndRefresh(row.merchant.id);
                            },
                            onTap: () {
                              context.push('/merchant/${row.merchant.id}');
                            },
                          );
                        },
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ===== UI Widgets =====

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onBack});
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColor.background,
      height: 56,
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back_ios_new_rounded),
            color: AppColor.primary,
          ),
          const Expanded(
            child: Text(
              'Yêu thích',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }
}

class _FilterRow extends StatelessWidget {
  const _FilterRow({required this.title, required this.onTap});
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFEFEFEF),
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.centerLeft,
          child: Row(
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(width: 6),
              const Icon(Icons.keyboard_arrow_down_rounded),
            ],
          ),
        ),
      ),
    );
  }
}

class _FavoriteMerchantCard extends StatelessWidget {
  const _FavoriteMerchantCard({
    required this.item,
    required this.onUnfavorite,
    required this.onTap,
  });

  final FavoriteMerchantItem item;
  final VoidCallback onUnfavorite;
  final VoidCallback onTap;

  String _fmtDistance(double? km) {
    if (km == null) return '';
    if (km < 1) return '${(km * 1000).round()}m';
    return '${km.toStringAsFixed(km < 10 ? 1 : 0)}km';
  }

  @override
  Widget build(BuildContext context) {
    final m = item.merchant;
    final image = (m.coverImageUrl?.isNotEmpty ?? false)
        ? m.coverImageUrl!
        : (m.logoUrl ?? '');

    final meta = <String>[];
    if (m.distanceKm != null) meta.add(_fmtDistance(m.distanceKm));
    if (m.etaMin != null) meta.add('${m.etaMin}phút');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              blurRadius: 14,
              offset: const Offset(0, 8),
              color: Colors.black.withOpacity(0.04),
            ),
          ],
        ),
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // image + label
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Stack(
                children: [
                  SizedBox(
                    width: 78,
                    height: 78,
                    child: image.isEmpty
                        ? Container(color: Colors.black12)
                        : CachedNetworkImage(
                            imageUrl: image,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                Container(color: Colors.black12),
                            errorWidget: (_, __, ___) =>
                                Container(color: Colors.black12),
                          ),
                  ),
                  Positioned(
                    left: 0,
                    top: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: const BoxDecoration(
                        color: Color(0xFFEE4D2D),
                        borderRadius: BorderRadius.only(
                          bottomRight: Radius.circular(10),
                        ),
                      ),
                      child: const Text(
                        'Yêu thích',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),

            // content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    m.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 16, color: Colors.amber),
                      const SizedBox(width: 4),
                      Text(
                        m.rating.toStringAsFixed(1),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      if (meta.isNotEmpty) ...[
                        const SizedBox(width: 10),
                        Text(
                          meta.join('  |  '),
                          style: const TextStyle(
                            color: Colors.black54,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 10),

                  // badges
                  if (m.badges.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: m.badges
                          .map((b) => _BadgeChip(text: b.text))
                          .toList(),
                    ),
                ],
              ),
            ),

            // heart
            IconButton(
              onPressed: onUnfavorite,
              icon: const Icon(Icons.favorite),
              color: AppColor.primary,
            ),
          ],
        ),
      ),
    );
  }
}

class _BadgeChip extends StatelessWidget {
  const _BadgeChip({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        border: Border.all(color: AppColor.primary),
        borderRadius: BorderRadius.circular(8),
        color: Colors.white,
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: AppColor.primary,
          fontWeight: FontWeight.w700,
          fontSize: 10,
        ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView({required this.message, required this.onRetry});
  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        Center(
          child: Text(message, style: const TextStyle(color: Colors.black54)),
        ),
        const SizedBox(height: 12),
        Center(
          child: ElevatedButton(
            onPressed: onRetry,
            child: const Text('Thử lại'),
          ),
        ),
      ],
    );
  }
}
