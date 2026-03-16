import 'package:flutter/material.dart';

import 'package:customer/app/theme/app_color.dart';
import '../../data/models/search_models.dart';

class SearchTabSwitcher extends StatelessWidget {
  const SearchTabSwitcher({
    super.key,
    required this.current,
    required this.onChanged,
  });

  final SearchTabType current;
  final ValueChanged<SearchTabType> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget buildItem(SearchTabType tab, String label) {
      final selected = current == tab;
      return Expanded(
        child: GestureDetector(
          onTap: () => onChanged(tab),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: selected ? AppColor.primary : Colors.transparent,
              borderRadius: BorderRadius.circular(999),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: AppColor.primary.withOpacity(0.18),
                        blurRadius: 14,
                        offset: const Offset(0, 6),
                      ),
                    ]
                  : null,
            ),
            child: Center(
              child: Text(
                label,
                style: TextStyle(
                  color: selected ? Colors.white : AppColor.textSecondary,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColor.surfaceWarm,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColor.border),
      ),
      child: Row(
        children: [
          buildItem(SearchTabType.all, 'Tất cả'),
          const SizedBox(width: 6),
          buildItem(SearchTabType.nearMe, 'Gần tôi'),
        ],
      ),
    );
  }
}
