import 'package:flutter/material.dart';

import 'package:customer/app/theme/app_color.dart';

class SearchRecentKeywordsSection extends StatelessWidget {
  const SearchRecentKeywordsSection({
    super.key,
    required this.items,
    required this.onTapItem,
    required this.onRemoveItem,
    required this.onClearAll,
  });

  final List<String> items;
  final ValueChanged<String> onTapItem;
  final ValueChanged<String> onRemoveItem;
  final VoidCallback onClearAll;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColor.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColor.border),
        ),
        child: const Text(
          'Chưa có lịch sử tìm kiếm',
          style: TextStyle(
            color: AppColor.textSecondary,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColor.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Tìm kiếm gần đây',
                  style: TextStyle(
                    color: AppColor.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
              TextButton(
                onPressed: onClearAll,
                child: const Text(
                  'Xóa tất cả',
                  style: TextStyle(
                    color: AppColor.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ...items.map(
            (item) => InkWell(
              onTap: () => onTapItem(item),
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    const Icon(
                      Icons.history_rounded,
                      color: AppColor.textMuted,
                      size: 18,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        item,
                        style: const TextStyle(
                          color: AppColor.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () => onRemoveItem(item),
                      borderRadius: BorderRadius.circular(999),
                      child: const Padding(
                        padding: EdgeInsets.all(4),
                        child: Icon(
                          Icons.close_rounded,
                          size: 18,
                          color: AppColor.textMuted,
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
