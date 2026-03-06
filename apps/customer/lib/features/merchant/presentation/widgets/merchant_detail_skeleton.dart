import 'package:customer/core/shared/widgets/skeleton_temeplate.dart';
import 'package:flutter/material.dart';
import 'package:customer/app/theme/app_color.dart';

class MerchantDetailSkeleton extends StatelessWidget {
  const MerchantDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.paddingOf(context).top;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      body: Skeleton(
        // bạn có thể đổi base/highlight cho hợp theme
        baseColor: const Color(0xFFE8E8E8),
        highlightColor: const Color(0xFFF6F6F6),
        child: CustomScrollView(
          slivers: [
            // ===== cover + top bar =====
            SliverAppBar(
              pinned: true,
              automaticallyImplyLeading: false,
              expandedHeight: 210,
              backgroundColor: Colors.transparent,
              surfaceTintColor: Colors.transparent,
              elevation: 0,
              flexibleSpace: Stack(
                fit: StackFit.expand,
                children: [
                  const SkeletonBox(radius: 0), // cover
                  // top bar area
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: topPad + kToolbarHeight,
                    child: Container(
                      padding: EdgeInsets.only(top: topPad),
                      child: Row(
                        children: const [
                          SizedBox(width: 8),
                          SkeletonCircle(size: 40),
                          SizedBox(width: 10),
                          Expanded(child: SkeletonLine(height: 14)),
                          SizedBox(width: 10),
                          SkeletonCircle(size: 40),
                          SizedBox(width: 8),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ===== merchant info =====
            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    SkeletonLine(height: 20, width: 220),
                    SizedBox(height: 10),
                    Row(
                      children: [
                        SkeletonLine(height: 14, width: 90),
                        SizedBox(width: 10),
                        SkeletonLine(height: 14, width: 120),
                        Spacer(),
                        SkeletonCircle(size: 34),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // ===== delivery + promos =====
            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Column(
                  children: [
                    Row(
                      children: const [
                        SkeletonCircle(size: 36),
                        SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SkeletonLine(height: 12, width: 90),
                              SizedBox(height: 6),
                              SkeletonLine(height: 12, width: 180),
                            ],
                          ),
                        ),
                        SkeletonLine(height: 14, width: 72),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Row(children: [SkeletonLine(height: 12, width: 260)]),
                    const SizedBox(height: 10),
                    const Row(
                      children: [
                        SkeletonLine(height: 12, width: 220),
                        Spacer(),
                        SkeletonLine(height: 12, width: 70),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // ===== popular =====
            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.only(top: 12, bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: SkeletonLine(height: 18, width: 140),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 110,
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        scrollDirection: Axis.horizontal,
                        itemCount: 4,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (_, __) => const _PopularSkeletonCard(),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ===== tabs header =====
            SliverPersistentHeader(
              pinned: true,
              delegate: _SkeletonTabHeaderDelegate(),
            ),

            // ===== menu list =====
            SliverPadding(
              padding: const EdgeInsets.only(bottom: 24),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  // pattern: header every 7 items
                  if (index % 7 == 0) return const _SectionHeaderSkeleton();
                  return const _MenuItemSkeletonRow();
                }, childCount: 28),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PopularSkeletonCard extends StatelessWidget {
  const _PopularSkeletonCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withOpacity(0.06)),
      ),
      child: const Row(
        children: [
          SkeletonBox(width: 70, height: 70, radius: 12),
          SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonLine(height: 12, width: 140),
                SizedBox(height: 8),
                SkeletonLine(height: 12, width: 100),
                Spacer(),
                SkeletonLine(height: 16, width: 90),
              ],
            ),
          ),
          SizedBox(width: 8),
          SkeletonBox(width: 34, height: 34, radius: 10),
        ],
      ),
    );
  }
}

class _SectionHeaderSkeleton extends StatelessWidget {
  const _SectionHeaderSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: const SkeletonLine(height: 18, width: 180),
    );
  }
}

class _MenuItemSkeletonRow extends StatelessWidget {
  const _MenuItemSkeletonRow();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonBox(width: 78, height: 78, radius: 12),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonLine(height: 14, width: 220),
                SizedBox(height: 8),
                SkeletonLine(height: 12, width: 180),
                SizedBox(height: 10),
                SkeletonLine(height: 12, width: 140),
                SizedBox(height: 10),
                SkeletonLine(height: 16, width: 110),
              ],
            ),
          ),
          SizedBox(width: 10),
          SkeletonBox(width: 38, height: 38, radius: 10),
        ],
      ),
    );
  }
}

class _SkeletonTabHeaderDelegate extends SliverPersistentHeaderDelegate {
  @override
  double get maxExtent => 52;

  @override
  double get minExtent => 52;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      color: Colors.white,
      elevation: overlapsContent ? 2 : 0,
      child: Row(
        children: [
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              scrollDirection: Axis.horizontal,
              itemCount: 5,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, __) =>
                  const SkeletonBox(width: 90, height: 30, radius: 999),
            ),
          ),
          Container(
            width: 1,
            height: 22,
            color: Colors.black.withOpacity(0.10),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.keyboard_arrow_down_rounded),
            color: Colors.black26,
          ),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) =>
      false;
}
