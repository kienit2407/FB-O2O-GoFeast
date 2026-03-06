import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/core/utils/formatters.dart';
import 'package:customer/features/home/data/models/feed_home_model.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomeFeedSections extends StatelessWidget {
  const HomeFeedSections({
    super.key,
    required this.sections,
    required this.isLoading,
    this.error,
    required this.onRetry,
    required this.userLat,
    required this.userLng,
  });

  final List<FeedSection> sections;
  final bool isLoading;
  final String? error;
  final VoidCallback onRetry;
  final double? userLat;
  final double? userLng;
  @override
  Widget build(BuildContext context) {
    if (isLoading && sections.isEmpty) {
      return _skeleton();
    }

    if (sections.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          children: [
            if (error != null) ...[
              Text(
                'Không tải được feed: $error',
                style: const TextStyle(color: Colors.black54),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              ElevatedButton(onPressed: onRetry, child: const Text('Thử lại')),
            ] else
              const SizedBox.shrink(),
          ],
        ),
      );
    }

    final map = {for (final s in sections) s.key: s};

    return Column(
      children: [
        if ((map['food_for_you']?.items ?? const []).isNotEmpty)
          _ProductSection(section: map['food_for_you']!),
        if ((map['people_love']?.items ?? const []).isNotEmpty)
          _MerchantSection(
            section: map['people_love']!,
            userLat: userLat,
            userLng: userLng,
          ),
        if ((map['restaurants_you_may_like']?.items ?? const []).isNotEmpty)
          _MerchantSection(
            section: map['restaurants_you_may_like']!,
            userLat: userLat,
            userLng: userLng,
          ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _skeleton() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
      child: Column(
        children: [
          _skeletonRow(),
          const SizedBox(height: 10),
          SizedBox(
            height: 210,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 3,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, __) => ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Container(width: 160, color: Colors.black12),
              ),
            ),
          ),
          const SizedBox(height: 18),
          _skeletonRow(),
          const SizedBox(height: 10),
          SizedBox(
            height: 220,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 3,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, __) => ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Container(width: 180, color: Colors.black12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _skeletonRow() {
    return Row(
      children: [
        Container(width: 180, height: 18, color: Colors.black12),
        const Spacer(),
        Container(
          width: 36,
          height: 36,
          decoration: const BoxDecoration(
            color: Colors.black12,
            shape: BoxShape.circle,
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.onTap});

  final String title;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
          ),
          InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(99),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFE9F7F2),
                borderRadius: BorderRadius.circular(99),
              ),
              child: const Icon(Icons.arrow_forward, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}

// class _ProductSection extends StatelessWidget {
//   const _ProductSection({required this.section});
//   final FeedSection section;

//   @override
//   Widget build(BuildContext context) {
//     final items = section.items
//         .where((e) => e.type == FeedItemType.product)
//         .toList();
//     if (items.isEmpty) return const SizedBox.shrink();

//     return Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         _SectionHeader(title: section.title),
//         SizedBox(
//           height: 250,
//           child: ListView.separated(
//             padding: const EdgeInsets.symmetric(horizontal: 16),
//             scrollDirection: Axis.horizontal,
//             itemCount: items.length,
//             separatorBuilder: (_, __) => const SizedBox(width: 12),
//             itemBuilder: (_, i) => _ProductCard(item: items[i]),
//           ),
//         ),
//       ],
//     );
//   }
// }

class _MerchantSection extends StatelessWidget {
  const _MerchantSection({
    required this.section,
    required this.userLat,
    required this.userLng,
  });

  final FeedSection section;
  final double? userLat;
  final double? userLng;

  @override
  Widget build(BuildContext context) {
    final items = section.items
        .where((e) => e.type == FeedItemType.merchant)
        .toList();
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(title: section.title),
        SizedBox(
          height: 255,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) => _MerchantCard(
              item: items[i],
              onTap: () {
                final id = items[i].merchantId;
                if (id == null) return;

                context.push(
                  '/merchant/$id',
                  extra: {'lat': userLat, 'lng': userLng},
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.item});
  final FeedItem item;

  String _money(num v) => '${v.toStringAsFixed(0)}đ'.replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
    (m) => '${m[1]}.',
  );

  @override
  Widget build(BuildContext context) {
    final sale = item.displayPrice;
    final base = item.basePrice ?? 0;
    final percent = item.discountPercent;
    final distText = formatDistance(
      (item.merchant?.distanceKm ?? item.distanceKm) as double?,
    );
    return Container(
      width: 150, // Thu nhỏ chiều rộng để thấy nhiều item hơn
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ẢNH VÀ BADGE GIẢM GIÁ
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(12),
                ),
                child: AspectRatio(
                  aspectRatio: 1,
                  child: item.imageUrl == null
                      ? Container(color: Colors.grey[200])
                      : CachedNetworkImage(
                          imageUrl: item.imageUrl!,
                          fit: BoxFit.cover,
                        ),
                ),
              ),
              // Badge Giảm Giá (Góc phải trên cùng)
              if (percent > 0)
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 4,
                      vertical: 2,
                    ),
                    decoration: const BoxDecoration(
                      color: Color(0xFFFFD524), // Màu vàng Shopee
                      borderRadius: BorderRadius.only(
                        topRight: Radius.circular(12),
                        bottomLeft: Radius.circular(4),
                      ),
                    ),
                    child: Text(
                      '-$percent%',
                      style: const TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
            ],
          ),

          // INFO
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Merchant Name (Màu xám, nhỏ)
                Text(
                  item.merchant?.name ?? '',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.grey, fontSize: 11),
                ),
                const SizedBox(height: 2),
                // Product Name (Bold, 2 dòng)
                Text(
                  item.productName?.toUpperCase() ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                // Price - Màu cam đỏ đặc trưng
                Text(
                  _money(sale),
                  style: const TextStyle(
                    color: Color(0xFFEE4D2D),
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                // Base Price - Gạch ngang
                if (base > sale)
                  Text(
                    _money(base),
                    style: const TextStyle(
                      color: Colors.grey,
                      fontSize: 11,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductSection extends StatelessWidget {
  const _ProductSection({required this.section});
  final FeedSection section;

  @override
  Widget build(BuildContext context) {
    final items = section.items
        .where((e) => e.type == FeedItemType.product)
        .toList();
    if (items.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF6F6F6), // Màu nền nhẹ phía sau các card
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          // HEADER - Giống 100% ShopeeFood
          Stack(
            children: [
              Container(
                height: 54,
                width: double.infinity,
                decoration: const BoxDecoration(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                  gradient: LinearGradient(
                    colors: [Color(0xFF0036A3), Color(0xFF1369D8)],
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                alignment: Alignment.centerLeft,
                child: Text(
                  section.title.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              // Icon Mascot bên phải
              Positioned(
                right: 0,
                top: 0,
                bottom: 0,
                child: Row(
                  children: [
                    // Thay bằng Image.asset nếu có file mascot
                    const Icon(
                      Icons.support_agent,
                      color: Colors.white24,
                      size: 40,
                    ),
                    InkWell(
                      onTap: () {},
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Row(
                          children: const [
                            Text(
                              'Xem thêm',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                              ),
                            ),
                            Icon(
                              Icons.chevron_right,
                              color: Colors.white70,
                              size: 18,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // LIST SẢN PHẨM
          SizedBox(
            height: 270, // Tăng nhẹ để tránh overflow text
            child: ListView.separated(
              padding: const EdgeInsets.all(12),
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, i) => _ProductCard(item: items[i]),
            ),
          ),
        ],
      ),
    );
  }
}

class _MerchantCard extends StatelessWidget {
  const _MerchantCard({required this.item, this.onTap});
  final FeedItem item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final img = (item.merchantLogoUrl?.isNotEmpty == true)
        ? item.merchantLogoUrl
        : item.merchantCoverUrl;

    final distText = formatDistance(
      (item.merchant?.distanceKm ?? item.distanceKm) as double?,
    );

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: 210,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 14,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(18),
              ),
              child: SizedBox(
                height: 140,
                width: double.infinity,
                child: (img == null || img.isEmpty)
                    ? Container(color: Colors.black12)
                    : CachedNetworkImage(imageUrl: img, fit: BoxFit.cover),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
              child: Text(
                item.merchantName ?? '—',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  const Icon(Icons.star, size: 16, color: Colors.amber),
                  const SizedBox(width: 4),
                  Text(
                    '${(item.merchantRating ?? 0).toStringAsFixed(1)}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(width: 10),
                  if ((item.merchant?.distanceKm ?? item.distanceKm) != null)
                    Text(
                      distText,
                      style: const TextStyle(
                        color: Colors.black54,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Text(
                item.merchantCategory ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.black54,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
