import 'package:flutter/material.dart';

import 'package:customer/app/theme/app_color.dart';
import '../../data/models/search_models.dart';

class SearchProductCard extends StatelessWidget {
  const SearchProductCard({super.key, required this.item, required this.onTap});

  final SearchProductItem item;
  final VoidCallback onTap;

  String _formatPrice(int value) {
    final raw = value.toString();
    final chars = raw.split('').reversed.toList();
    final buffer = StringBuffer();

    for (var i = 0; i < chars.length; i++) {
      if (i > 0 && i % 3 == 0) buffer.write('.');
      buffer.write(chars[i]);
    }

    return '${buffer.toString().split('').reversed.join()}đ';
  }

  String _distanceText(double? km) {
    if (km == null) return '';
    if (km < 1) return '${(km * 1000).round()} m';
    return '${km.toStringAsFixed(km >= 10 ? 0 : 1)} km';
  }

  @override
  Widget build(BuildContext context) {
    final distance = _distanceText(item.distanceKm);

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
                  child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                      ? Image.network(
                          item.imageUrl!,
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
                            color: AppColor.primary,
                            size: 40,
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
                      item.name,
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
                      item.merchant.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColor.textSecondary,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (item.discountAmount > 0) ...[
                      Text(
                        _formatPrice(item.basePrice),
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
                      _formatPrice(item.finalPrice),
                      style: const TextStyle(
                        color: AppColor.primaryDark,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        const Icon(
                          Icons.star_rounded,
                          color: AppColor.ratingGold,
                          size: 15,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          item.averageRating.toStringAsFixed(1),
                          style: const TextStyle(
                            color: AppColor.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Đã bán ${item.totalSold}',
                          style: const TextStyle(
                            color: AppColor.textSecondary,
                            fontWeight: FontWeight.w600,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (distance.isNotEmpty) ...[
                          const Icon(
                            Icons.location_on_outlined,
                            size: 14,
                            color: AppColor.textMuted,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            distance,
                            style: const TextStyle(
                              color: AppColor.textSecondary,
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                            ),
                          ),
                        ],
                        if (item.etaMin != null) ...[
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.schedule_rounded,
                            size: 13,
                            color: AppColor.textMuted,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            '~${item.etaMin} phút',
                            style: const TextStyle(
                              color: AppColor.textSecondary,
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
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
