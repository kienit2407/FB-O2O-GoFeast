import 'package:flutter/material.dart';

import 'package:customer/app/theme/app_color.dart';
import '../../data/models/search_models.dart';

class SearchMerchantCard extends StatelessWidget {
  const SearchMerchantCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  final SearchMerchantItem item;
  final VoidCallback onTap;

  String _distanceText(double? km) {
    if (km == null) return '';
    if (km < 1) return '${(km * 1000).round()} m';
    return '${km.toStringAsFixed(km >= 10 ? 0 : 1)} km';
  }

  @override
  Widget build(BuildContext context) {
    final cover = item.coverImageUrl;
    final logo = item.logoUrl;
    final distance = _distanceText(item.distanceKm);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
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
              child: cover != null && cover.isNotEmpty
                  ? Image.network(
                      cover,
                      width: 96,
                      height: 96,
                      fit: BoxFit.cover,
                    )
                  : Container(
                      width: 96,
                      height: 96,
                      color: AppColor.surfaceWarm,
                      alignment: Alignment.center,
                      child: logo != null && logo.isNotEmpty
                          ? Image.network(
                              logo,
                              width: 42,
                              height: 42,
                              fit: BoxFit.cover,
                            )
                          : const Icon(
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
                      item.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColor.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        height: 1.15,
                      ),
                    ),
                    const SizedBox(height: 5),
                    if ((item.category ?? '').isNotEmpty)
                      Text(
                        item.category!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColor.textSecondary,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
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
                          item.averageRating.toStringAsFixed(1),
                          style: const TextStyle(
                            color: AppColor.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '(${item.totalReviews})',
                          style: const TextStyle(
                            color: AppColor.textSecondary,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
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
                          Text(
                            distance,
                            style: const TextStyle(
                              color: AppColor.textSecondary,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
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
                        if (item.etaMin != null) _chip('~${item.etaMin} phút'),
                        if (item.canDeliver)
                          _chip(
                            'Giao được',
                            textColor: AppColor.success,
                            bg: AppColor.success.withOpacity(0.08),
                          ),
                        if (!item.canDeliver && item.distanceKm != null)
                          _chip(
                            'Ngoài vùng giao',
                            textColor: AppColor.warning,
                            bg: AppColor.warning.withOpacity(0.12),
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
    Color textColor = AppColor.primary,
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
          fontWeight: FontWeight.w700,
          fontSize: 11,
        ),
      ),
    );
  }
}
