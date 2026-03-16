import 'package:customer/app/theme/app_color.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class MerchantDetailSkeleton extends StatelessWidget {
  const MerchantDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.paddingOf(context).top;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      body: _Shimmer(
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              automaticallyImplyLeading: false,
              expandedHeight: 220,
              backgroundColor: Colors.transparent,
              surfaceTintColor: Colors.transparent,
              elevation: 0,
              flexibleSpace: Stack(
                fit: StackFit.expand,
                children: [
                  const _SkBox(radius: 0),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withOpacity(.08),
                            Colors.transparent,
                            Colors.black.withOpacity(.04),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: topPad + kToolbarHeight,
                    child: Padding(
                      padding: EdgeInsets.only(top: topPad, left: 8, right: 8),
                      child: Row(
                        children: const [
                          _SkCircle(size: 40),
                          SizedBox(width: 10),
                          Expanded(child: _SkBox(height: 38, radius: 10)),
                          SizedBox(width: 10),
                          _SkCircle(size: 40),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    _SkLine(width: 210, height: 22),
                    SizedBox(height: 10),
                    Row(
                      children: [
                        _SkLine(width: 70, height: 14),
                        SizedBox(width: 10),
                        _SkLine(width: 120, height: 14),
                        Spacer(),
                        _SkCircle(size: 34),
                      ],
                    ),
                    SizedBox(height: 10),
                    _SkLine(width: 110, height: 14),
                  ],
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Column(
                  children: const [
                    Row(
                      children: [
                        _SkCircle(size: 36),
                        SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _SkLine(width: 120, height: 13),
                              SizedBox(height: 6),
                              _SkLine(width: 180, height: 12),
                            ],
                          ),
                        ),
                        SizedBox(width: 10),
                        _SkLine(width: 62, height: 13),
                      ],
                    ),
                    SizedBox(height: 14),
                    _PromoLineSkeleton(showTrailing: false),
                    SizedBox(height: 10),
                    _PromoLineSkeleton(showTrailing: true),
                  ],
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.only(top: 12, bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: _SkLine(width: 120, height: 18),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 126,
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        scrollDirection: Axis.horizontal,
                        itemCount: 3,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (_, __) => const _PopularCardSkeleton(),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SliverPersistentHeader(
              pinned: true,
              delegate: _SkeletonTabHeaderDelegate(),
            ),

            SliverList(
              delegate: SliverChildListDelegate([
                const _MenuSectionHeaderSkeleton(),
                ...List.generate(4, (_) => const _MenuItemSkeletonRow()),
                const _MenuSectionHeaderSkeleton(width: 150),
                ...List.generate(5, (_) => const _MenuItemSkeletonRow()),
                const _MenuSectionHeaderSkeleton(width: 170),
                ...List.generate(4, (_) => const _MenuItemSkeletonRow()),
                const SizedBox(height: 24),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

class _Shimmer extends StatelessWidget {
  const _Shimmer({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: const Color(0xFFE6E6E6),
      highlightColor: const Color(0xFFF5F5F5),
      period: const Duration(milliseconds: 1300),
      child: child,
    );
  }
}

class _SkBox extends StatelessWidget {
  const _SkBox({this.width, this.height, this.radius = 12});

  final double? width;
  final double? height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class _SkLine extends StatelessWidget {
  const _SkLine({this.width, this.height = 12, this.radius = 999});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return _SkBox(width: width, height: height, radius: radius);
  }
}

class _SkCircle extends StatelessWidget {
  const _SkCircle({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return _SkBox(width: size, height: size, radius: size);
  }
}

class _PromoLineSkeleton extends StatelessWidget {
  const _PromoLineSkeleton({required this.showTrailing});

  final bool showTrailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const _SkBox(width: 18, height: 18, radius: 6),
        const SizedBox(width: 8),
        const Expanded(child: _SkLine(height: 12)),
        if (showTrailing) ...[
          const SizedBox(width: 10),
          const _SkLine(width: 66, height: 12),
        ],
      ],
    );
  }
}

class _PopularCardSkeleton extends StatelessWidget {
  const _PopularCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: MediaQuery.sizeOf(context).width * 0.84,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: AppColor.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black.withOpacity(.05), width: .5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Stack(
            children: [
              _SkBox(width: 78, height: 78, radius: 12),
              Positioned(
                left: 0,
                top: 0,
                child: _SkBox(width: 34, height: 18, radius: 8),
              ),
            ],
          ),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SkLine(width: double.infinity, height: 14, radius: 8),
                SizedBox(height: 8),
                _SkLine(width: 150, height: 12, radius: 8),
                SizedBox(height: 8),
                _SkLine(width: 120, height: 10, radius: 8),
                SizedBox(height: 10),
                _SkLine(width: 90, height: 15, radius: 8),
              ],
            ),
          ),
          SizedBox(width: 10),
          _SkBox(width: 25, height: 25, radius: 5),
        ],
      ),
    );
  }
}

class _MenuSectionHeaderSkeleton extends StatelessWidget {
  const _MenuSectionHeaderSkeleton({this.width = 180});

  final double width;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: _SkLine(width: width, height: 14, radius: 8),
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
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Stack(
            children: [
              _SkBox(width: 78, height: 78, radius: 12),
              Positioned(
                left: 0,
                top: 0,
                child: _SkBox(width: 34, height: 18, radius: 8),
              ),
            ],
          ),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SkLine(height: 14, radius: 8),
                SizedBox(height: 8),
                _SkLine(width: 180, height: 12, radius: 8),
                SizedBox(height: 8),
                _SkLine(width: 130, height: 10, radius: 8),
                SizedBox(height: 10),
                _SkLine(width: 90, height: 15, radius: 8),
              ],
            ),
          ),
          SizedBox(width: 10),
          _SkBox(width: 25, height: 25, radius: 5),
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
              itemBuilder: (_, index) {
                final widths = [84.0, 96.0, 78.0, 108.0, 88.0];
                return _SkBox(width: widths[index], height: 30, radius: 999);
              },
            ),
          ),
          Container(
            width: 1,
            height: 22,
            color: Colors.black.withOpacity(0.08),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) {
    return false;
  }
}
