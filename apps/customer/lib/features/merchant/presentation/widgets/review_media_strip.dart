import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/features/merchant/data/models/product_reviews_model.dart';
import 'package:customer/features/merchant/presentation/pages/review_media_viewer_page.dart';
import 'package:flutter/material.dart';

class ReviewMediaStrip extends StatelessWidget {
  const ReviewMediaStrip({super.key, required this.images, this.videoUrl});

  final List<ReviewImage> images;
  final String? videoUrl;

  List<ReviewMediaEntry> _buildItems() {
    final list = <ReviewMediaEntry>[
      ...images.map((e) => ReviewMediaEntry(url: e.url, isVideo: false)),
    ];

    if (videoUrl != null && videoUrl!.trim().isNotEmpty) {
      list.add(ReviewMediaEntry(url: videoUrl!, isVideo: true));
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final items = _buildItems();
    if (items.isEmpty) return const SizedBox.shrink();

    final visibleCount = items.length >= 3 ? 3 : items.length;
    final hiddenCount = items.length > 3 ? items.length - 3 : 0;

    return SizedBox(
      height: 104,
      child: Row(
        children: List.generate(visibleCount, (index) {
          final item = items[index];
          final showMoreOverlay = index == 2 && items.length > 3;

          return Expanded(
            child: Padding(
              padding: EdgeInsets.only(
                right: index == visibleCount - 1 ? 0 : 8,
              ),
              child: GestureDetector(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ReviewMediaViewerPage(
                        items: items,
                        initialIndex: index,
                      ),
                    ),
                  );
                },
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: item.isVideo
                          ? Container(
                              color: Colors.black87,
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  Container(color: Colors.black87),
                                  const Center(
                                    child: Icon(
                                      Icons.play_circle_fill_rounded,
                                      color: Colors.white,
                                      size: 32,
                                    ),
                                  ),
                                  const Positioned(
                                    left: 8,
                                    bottom: 8,
                                    child: Text(
                                      'Video',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : CachedNetworkImage(
                              imageUrl: item.url,
                              fit: BoxFit.cover,
                              placeholder: (_, __) =>
                                  Container(color: AppColor.surfaceWarm),
                              errorWidget: (_, __, ___) =>
                                  Container(color: AppColor.surfaceWarm),
                            ),
                    ),

                    if (showMoreOverlay)
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.black45,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '+$hiddenCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}
