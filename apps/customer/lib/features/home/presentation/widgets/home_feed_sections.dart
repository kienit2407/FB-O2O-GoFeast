import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
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
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColor.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColor.border),
          ),
          child: Column(
            children: [
              const Icon(
                Icons.inbox_outlined,
                color: AppColor.primary,
                size: 34,
              ),
              const SizedBox(height: 10),
              Text(
                error != null
                    ? 'Không tải được feed'
                    : 'Chưa có nội dung hiển thị',
                style: const TextStyle(
                  color: AppColor.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (error != null) ...[
                const SizedBox(height: 8),
                Text(
                  error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColor.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  height: 42,
                  child: ElevatedButton(
                    onPressed: onRetry,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColor.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Thử lại',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    final map = {for (final s in sections) s.key: s};

    return Column(
      children: [
        if ((map['food_for_you']?.items ?? const []).isNotEmpty)
          _ProductSection(
            section: map['food_for_you']!,
            userLat: userLat,
            userLng: userLng,
          ),
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
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Column(
        children: [
          const _SkeletonHeader(),
          const SizedBox(height: 12),
          SizedBox(
            height: 314,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 3,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, __) => Container(
                width: 212,
                decoration: BoxDecoration(
                  color: AppColor.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColor.border),
                ),
                child: Column(
                  children: [
                    Container(
                      height: 132,
                      decoration: const BoxDecoration(
                        color: AppColor.divider,
                        borderRadius: BorderRadius.vertical(
                          top: Radius.circular(18),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: List.generate(
                            4,
                            (index) => Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              height: index == 0 ? 14 : 10,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: AppColor.divider,
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const _SkeletonHeader(),
          const SizedBox(height: 12),
          SizedBox(
            height: 132,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 2,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, __) => Container(
                width: 320,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColor.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColor.border),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: AppColor.divider,
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        children: List.generate(
                          4,
                          (index) => Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            height: index == 0 ? 14 : 10,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: AppColor.divider,
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SkeletonHeader extends StatelessWidget {
  const _SkeletonHeader();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 160,
          height: 18,
          decoration: BoxDecoration(
            color: AppColor.divider,
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        const Spacer(),
        Container(
          width: 70,
          height: 28,
          decoration: BoxDecoration(
            color: AppColor.divider,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.subtitle, this.onTap});

  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final clickable = onTap != null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColor.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if ((subtitle ?? '').isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      color: AppColor.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (clickable)
            InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(999),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppColor.primaryLight,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Row(
                  children: [
                    Text(
                      'Xem thêm',
                      style: TextStyle(
                        color: AppColor.primaryDark,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 16,
                      color: AppColor.primaryDark,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

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
        _SectionHeader(
          title: section.title,
          subtitle: 'Khám phá quán nổi bật gần bạn',
        ),
        SizedBox(
          height: 132,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) => _MerchantCard(
              item: items[i],
              onTap: () {
                final id = items[i].merchantId;
                if (id == null || id.isEmpty) return;

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

class _ProductSection extends StatelessWidget {
  const _ProductSection({
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
        .where((e) => e.type == FeedItemType.product)
        .toList();
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          title: section.title,
          subtitle: 'Món ngon được gợi ý cho bạn',
        ),
        SizedBox(
          height: 314,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) {
              final it = items[i];
              final productId = it.productId;

              return _ProductCard(
                item: it,
                onTap: () {
                  if (productId == null || productId.isEmpty) return;

                  context.push(
                    '/product/$productId',
                    extra: {
                      'lat': userLat,
                      'lng': userLng,
                      'merchantId': it.merchant?.id,
                    },
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.item, this.onTap});

  final FeedItem item;
  final VoidCallback? onTap;

  String _money(num value) {
    final raw = value.toStringAsFixed(0);
    final chars = raw.split('').reversed.toList();
    final buffer = StringBuffer();

    for (var i = 0; i < chars.length; i++) {
      if (i > 0 && i % 3 == 0) buffer.write('.');
      buffer.write(chars[i]);
    }

    return '${buffer.toString().split('').reversed.join()}đ';
  }

  double? _distanceValue() {
    final value = item.merchant?.distanceKm ?? item.distanceKm;
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  @override
  Widget build(BuildContext context) {
    final image = item.primaryImageUrl;
    final merchantName = item.merchant?.name ?? '';
    final basePrice = (item.basePrice ?? 0).toDouble();
    final finalPrice = item.displayPrice.toDouble();
    final distance = formatDistance(_distanceValue());
    final rating = (item.rating ?? 0).toDouble();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: 212,
        decoration: BoxDecoration(
          color: AppColor.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColor.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(18),
                  ),
                  child: image != null && image.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: image,
                          height: 132,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        )
                      : Container(
                          height: 132,
                          width: double.infinity,
                          color: AppColor.surfaceWarm,
                          alignment: Alignment.center,
                          child: const Icon(
                            Icons.fastfood_rounded,
                            size: 40,
                            color: AppColor.primary,
                          ),
                        ),
                ),
                if (item.discountPercent > 0)
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColor.primaryDark,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '-${item.discountPercent}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.productName ?? '',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColor.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        height: 1.18,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      merchantName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColor.textSecondary,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (basePrice > finalPrice) ...[
                      Text(
                        _money(basePrice),
                        style: const TextStyle(
                          color: AppColor.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                      const SizedBox(height: 2),
                    ],
                    Text(
                      _money(finalPrice),
                      style: const TextStyle(
                        color: AppColor.primaryDark,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        if (rating > 0) ...[
                          const Icon(
                            Icons.star_rounded,
                            color: AppColor.ratingGold,
                            size: 15,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            rating.toStringAsFixed(1),
                            style: const TextStyle(
                              color: AppColor.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 11,
                            ),
                          ),
                        ],
                        if (distance.isNotEmpty) ...[
                          if (rating > 0) const SizedBox(width: 8),
                          const Icon(
                            Icons.location_on_outlined,
                            size: 14,
                            color: AppColor.textMuted,
                          ),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(
                              distance,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColor.textSecondary,
                                fontWeight: FontWeight.w600,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MerchantCard extends StatelessWidget {
  const _MerchantCard({required this.item, this.onTap});

  final FeedItem item;
  final VoidCallback? onTap;

  double? _distanceValue() {
    final value = item.merchant?.distanceKm ?? item.distanceKm;
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  @override
  Widget build(BuildContext context) {
    final image = (item.merchantCoverUrl?.isNotEmpty == true)
        ? item.merchantCoverUrl
        : item.merchantLogoUrl;
    final distance = formatDistance(_distanceValue());
    final rating = (item.merchantRating ?? 0).toDouble();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: 320,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColor.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColor.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: image != null && image.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: image,
                      width: 96,
                      height: 96,
                      fit: BoxFit.cover,
                    )
                  : Container(
                      width: 96,
                      height: 96,
                      color: AppColor.surfaceWarm,
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.storefront_rounded,
                        color: AppColor.primary,
                        size: 34,
                      ),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: SizedBox(
                height: 96,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.merchantName ?? '—',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColor.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        height: 1.15,
                      ),
                    ),
                    const SizedBox(height: 5),
                    if ((item.merchantCategory ?? '').isNotEmpty)
                      Text(
                        item.merchantCategory!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColor.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(
                          Icons.star_rounded,
                          color: AppColor.ratingGold,
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          rating.toStringAsFixed(1),
                          style: const TextStyle(
                            color: AppColor.textPrimary,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (distance.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.location_on_outlined,
                            color: AppColor.textMuted,
                            size: 14,
                          ),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(
                              distance,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColor.textSecondary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const Spacer(),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _chip('Quán nổi bật'),
                        if (distance.isNotEmpty)
                          _chip(
                            'Gần bạn',
                            textColor: AppColor.success,
                            bg: AppColor.success.withOpacity(0.08),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(
    String text, {
    Color textColor = AppColor.primaryDark,
    Color bg = AppColor.primaryLight,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
