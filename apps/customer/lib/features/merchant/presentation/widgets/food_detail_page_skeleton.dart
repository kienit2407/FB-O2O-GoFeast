import 'package:customer/app/theme/app_color.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class FoodDetailPageSkeleton extends StatelessWidget {
  const FoodDetailPageSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final base = Colors.grey.shade300;
    final highlight = Colors.grey.shade100;

    return Shimmer.fromColors(
      baseColor: base,
      highlightColor: highlight,
      child: CustomScrollView(
        physics: const NeverScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: _SkeletonGallery(
              height: MediaQuery.of(context).size.height * 0.46,
            ),
          ),

          SliverToBoxAdapter(
            child: Transform.translate(
              offset: const Offset(0, -24),
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: Column(
                  children: const [
                    SizedBox(height: 12),
                    _SkeletonHandle(),
                    SizedBox(height: 16),

                    _SkeletonPriceTitleSection(),
                    SizedBox(height: 8),
                    Divider(height: 1, color: Colors.black12),

                    _SkeletonStoreInfoSection(),
                    SizedBox(height: 8),
                    Divider(height: 1, color: Colors.black12),

                    _SkeletonReviewsHeader(),
                  ],
                ),
              ),
            ),
          ),

          SliverList(
            delegate: SliverChildBuilderDelegate(
              (_, index) => const Column(
                children: [
                  _SkeletonReviewTile(),
                  Divider(height: 1, color: Colors.black12),
                ],
              ),
              childCount: 4,
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

class _SkeletonGallery extends StatelessWidget {
  const _SkeletonGallery({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: Stack(
        children: [
          _box(width: double.infinity, height: double.infinity, radius: 0),

          Positioned(top: 48, left: 12, child: _circle(size: 38)),

          Positioned(top: 48, right: 12, child: _circle(size: 38)),

          Positioned(
            left: 0,
            right: 0,
            bottom: 18,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                4,
                (i) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  child: _box(width: i == 1 ? 18 : 6, height: 6, radius: 99),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SkeletonHandle extends StatelessWidget {
  const _SkeletonHandle();

  @override
  Widget build(BuildContext context) {
    return _box(width: 40, height: 4, radius: 99);
  }
}

class _SkeletonPriceTitleSection extends StatelessWidget {
  const _SkeletonPriceTitleSection();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _box(width: 110, height: 24, radius: 8),
              const SizedBox(width: 10),
              _box(width: 70, height: 20, radius: 6),
              const Spacer(),
              _box(width: 28, height: 28, radius: 6),
            ],
          ),
          const SizedBox(height: 8),
          _box(width: 72, height: 14, radius: 6),
          const SizedBox(height: 14),
          _box(width: 220, height: 22, radius: 8),
          const SizedBox(height: 8),
          _box(width: 140, height: 14, radius: 6),
          const SizedBox(height: 14),
          Row(
            children: [
              _box(width: 62, height: 12, radius: 6),
              const SizedBox(width: 10),
              _box(width: 8, height: 8, radius: 99),
              const SizedBox(width: 10),
              _box(width: 78, height: 12, radius: 6),
              const Spacer(),
              _box(width: 68, height: 14, radius: 6),
            ],
          ),
        ],
      ),
    );
  }
}

class _SkeletonStoreInfoSection extends StatelessWidget {
  const _SkeletonStoreInfoSection();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _box(width: 120, height: 16, radius: 6),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                _circle(size: 18),
                const SizedBox(width: 8),
                Expanded(child: _box(width: double.infinity, height: 14)),
                const SizedBox(width: 8),
                _circle(size: 18),
              ],
            ),
          ),

          const SizedBox(height: 12),
          const Divider(height: .4, color: Colors.black12),
          const SizedBox(height: 12),

          Row(
            children: [
              _box(width: 42, height: 42, radius: 12),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _box(width: 160, height: 14, radius: 6),
                    const SizedBox(height: 8),
                    _box(width: 140, height: 10, radius: 6),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SkeletonReviewsHeader extends StatelessWidget {
  const _SkeletonReviewsHeader();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Row(
        children: [
          _box(width: 70, height: 14, radius: 6),
          const SizedBox(width: 8),
          _box(width: 28, height: 14, radius: 6),
          const Spacer(),
          _circle(size: 18),
        ],
      ),
    );
  }
}

class _SkeletonReviewTile extends StatelessWidget {
  const _SkeletonReviewTile();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _box(width: 32, height: 32, radius: 99),
              const SizedBox(width: 10),
              _box(width: 110, height: 14, radius: 6),
            ],
          ),
          const SizedBox(height: 8),

          Row(
            children: List.generate(
              5,
              (_) => Padding(
                padding: const EdgeInsets.only(right: 4),
                child: _box(width: 16, height: 16, radius: 99),
              ),
            ),
          ),

          const SizedBox(height: 10),
          _box(width: double.infinity, height: 12, radius: 6),
          const SizedBox(height: 8),
          _box(width: 220, height: 12, radius: 6),

          const SizedBox(height: 12),
          Row(
            children: [
              _box(width: 72, height: 72, radius: 12),
              const SizedBox(width: 10),
              _box(width: 72, height: 72, radius: 12),
              const SizedBox(width: 10),
              _box(width: 72, height: 72, radius: 12),
            ],
          ),

          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColor.surfaceWarm.withOpacity(0.35),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _box(width: 90, height: 12, radius: 6),
                const SizedBox(height: 8),
                _box(width: double.infinity, height: 11, radius: 6),
                const SizedBox(height: 6),
                _box(width: 180, height: 11, radius: 6),
              ],
            ),
          ),

          const SizedBox(height: 10),
          _box(width: 96, height: 11, radius: 6),
        ],
      ),
    );
  }
}

Widget _box({
  required double width,
  required double height,
  double radius = 8,
}) {
  return Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(radius),
    ),
  );
}

Widget _circle({required double size}) {
  return _box(width: size, height: size, radius: 999);
}
