import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/home/presentation/viewmodels/banner_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeCarousel extends ConsumerStatefulWidget {
  const HomeCarousel({super.key, this.height = 150});

  final double height;

  @override
  ConsumerState<HomeCarousel> createState() => _HomeCarouselState();
}

class _HomeCarouselState extends ConsumerState<HomeCarousel> {
  int currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(bannerControllerProvider);
    final banners = st.items;

    // Loading skeleton (lần đầu)
    if (st.isLoading && banners.isEmpty) {
      return _skeleton(height: widget.height);
    }

    // Không có banner -> ẩn luôn cho gọn
    if (banners.isEmpty) return const SizedBox.shrink();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CarouselSlider.builder(
          options: CarouselOptions(
            height: widget.height,
            autoPlay: banners.length > 1,
            autoPlayInterval: const Duration(seconds: 4),
            viewportFraction: 1.0,
            enlargeCenterPage: true,
            padEnds: false,
            autoPlayCurve: Curves.fastOutSlowIn,
            enableInfiniteScroll: banners.length > 1,
            onPageChanged: (index, reason) {
              setState(() => currentIndex = index);
            },
          ),
          itemCount: banners.length,
          itemBuilder: (context, index, realIndex) {
            final b = banners[index];
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: CachedNetworkImage(
                  imageUrl: b.carouselUrl,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  placeholder: (_, __) => Container(color: Colors.black12),
                  errorWidget: (_, __, ___) => Container(
                    color: Colors.black12,
                    alignment: Alignment.center,
                    child: const Icon(Icons.broken_image_outlined),
                  ),
                ),
              ),
            );
          },
        ),

        const SizedBox(height: 8),

        // Dots indicator kiểu ShopeeFood (gọn)
        if (banners.length > 1)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.black12,
              borderRadius: BorderRadius.circular(99),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(banners.length, (i) {
                final active = i == currentIndex;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 14 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: active ? AppColor.primary : Colors.black26,
                    borderRadius: BorderRadius.circular(99),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }

  Widget _skeleton({required double height}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Container(height: height, color: Colors.black12),
      ),
    );
  }
}
