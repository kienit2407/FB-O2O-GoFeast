import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class FoodDetailData {
  final List<String> imageUrls;
  final String title;
  final String subtitle; // vd: "ShopeeFood Trùm Deal..."
  final int price; // 21000
  final int? originalPrice; // 42000
  final String? savingText; // "Tiết kiệm 21.000đ"
  final int soldCount; // 5000
  final int likeCount; // 110
  final String limitText; // "1 phần/đơn"

  final StoreInfo store;
  final List<ReviewItem> reviews;

  FoodDetailData({
    required this.imageUrls,
    required this.title,
    required this.subtitle,
    required this.price,
    this.originalPrice,
    this.savingText,
    required this.soldCount,
    required this.likeCount,
    required this.limitText,
    required this.store,
    required this.reviews,
  });
}

class StoreInfo {
  final String deliveryAddress;
  final String name;
  final double rating;
  final double distanceKm;
  final int etaMin;
  final String? logoUrl;

  StoreInfo({
    required this.deliveryAddress,
    required this.name,
    required this.rating,
    required this.distanceKm,
    required this.etaMin,
    this.logoUrl,
  });
}

class ReviewItem {
  final String userName;
  final int stars; // 1..5
  final String content;
  final String? imageUrl;
  final String? likedItemsText; // "Cũng được thích: ..."
  final String timeText; // "26-02-2026 23:56"

  ReviewItem({
    required this.userName,
    required this.stars,
    required this.content,
    this.imageUrl,
    this.likedItemsText,
    required this.timeText,
  });
}

class FoodDetailPage extends StatefulWidget {
  const FoodDetailPage({
    super.key,
    required this.data,
    this.onAddPressed,
    this.onOpenCart,
    this.onSchedulePressed,
    this.cartCount = 0,
    this.cartTotalText = '0đ',
  });

  final FoodDetailData data;

  /// Hook chỗ này vào CartController của bạn
  final VoidCallback? onAddPressed;
  final VoidCallback? onOpenCart;
  final VoidCallback? onSchedulePressed;

  final int cartCount;
  final String cartTotalText;

  @override
  State<FoodDetailPage> createState() => _FoodDetailPageState();
}

class _FoodDetailPageState extends State<FoodDetailPage> {
  final _pageCtrl = PageController();
  int _page = 0;

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.data;

    return Scaffold(
      backgroundColor: Colors.white,
      bottomNavigationBar: _BottomCartBar(
        cartCount: widget.cartCount,
        totalText: widget.cartTotalText,
        onOpenCart: widget.onOpenCart,
        onSchedulePressed: widget.onSchedulePressed,
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _TopGallery(
              imageUrls: d.imageUrls,
              pageCtrl: _pageCtrl,
              page: _page,
              onPageChanged: (i) => setState(() => _page = i),
              onBack: () => Navigator.of(context).maybePop(),
              onShare: () {
                // TODO: share
              },
            ),
          ),

          // Card info "đè" lên ảnh (giống ảnh 1)
          SliverToBoxAdapter(
            child: Transform.translate(
              offset: const Offset(0, -24),
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                    const SizedBox(height: 12),

                    _PriceTitleSection(
                      price: d.price,
                      originalPrice: d.originalPrice,
                      savingText: d.savingText,
                      title: d.title,
                      subtitle: d.subtitle,
                      soldCount: d.soldCount,
                      likeCount: d.likeCount,
                      limitText: d.limitText,
                      onAddPressed: widget.onAddPressed,
                    ),

                    const SizedBox(height: 8),
                    const Divider(height: 1),

                    _StoreInfoSection(store: d.store),

                    const SizedBox(height: 8),
                    const Divider(height: 1),

                    _ReviewsHeader(count: d.reviews.length),
                  ],
                ),
              ),
            ),
          ),

          SliverList.separated(
            itemCount: d.reviews.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) => _ReviewTile(item: d.reviews[i]),
          ),

          // chừa khoảng trống dưới cùng để không bị bottom bar che
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

class _TopGallery extends StatelessWidget {
  const _TopGallery({
    required this.imageUrls,
    required this.pageCtrl,
    required this.page,
    required this.onPageChanged,
    required this.onBack,
    required this.onShare,
  });

  final List<String> imageUrls;
  final PageController pageCtrl;
  final int page;
  final ValueChanged<int> onPageChanged;
  final VoidCallback onBack;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.of(context).size.height * 0.46;

    return SizedBox(
      height: h,
      child: Stack(
        children: [
          PageView.builder(
            controller: pageCtrl,
            itemCount: imageUrls.length,
            onPageChanged: onPageChanged,
            itemBuilder: (_, i) => CachedNetworkImage(
              imageUrl: imageUrls[i],
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: Colors.black12),
              errorWidget: (_, __, ___) => Container(color: Colors.black12),
            ),
          ),

          // gradient nhẹ cho dễ đọc icon
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black.withOpacity(0.30), Colors.transparent],
                ),
              ),
            ),
          ),

          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  _CircleIcon(
                    icon: Icons.arrow_back_ios_new_rounded,
                    onTap: onBack,
                  ),
                  const Spacer(),
                  _CircleIcon(icon: Icons.ios_share_rounded, onTap: onShare),
                ],
              ),
            ),
          ),

          // Indicator chấm
          Positioned(
            left: 0,
            right: 0,
            bottom: 18,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                imageUrls.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == page ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(i == page ? 0.95 : 0.55),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PriceTitleSection extends StatelessWidget {
  const _PriceTitleSection({
    required this.price,
    required this.originalPrice,
    required this.savingText,
    required this.title,
    required this.subtitle,
    required this.soldCount,
    required this.likeCount,
    required this.limitText,
    required this.onAddPressed,
  });

  final int price;
  final int? originalPrice;
  final String? savingText;
  final String title;
  final String subtitle;
  final int soldCount;
  final int likeCount;
  final String limitText;
  final VoidCallback? onAddPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Giá + nút +
          Row(
            children: [
              Text(
                _money(price),
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFFEE4D2D),
                ),
              ),
              const SizedBox(width: 10),
              if (savingText != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEE4D2D),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    savingText!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              const Spacer(),
              _AddSquareButton(onTap: onAddPressed),
            ],
          ),

          const SizedBox(height: 4),
          if (originalPrice != null)
            Text(
              _money(originalPrice!),
              style: const TextStyle(
                decoration: TextDecoration.lineThrough,
                color: Colors.black38,
                fontSize: 16,
              ),
            ),

          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(color: Colors.black54, height: 1.25),
          ),

          const SizedBox(height: 10),

          // 5K+ đã bán | 110 lượt thích | 1 phần/đơn
          Row(
            children: [
              Text(
                '${_compactNumber(soldCount)} đã bán',
                style: const TextStyle(color: Colors.black45),
              ),
              const SizedBox(width: 10),
              const Text('|', style: TextStyle(color: Colors.black26)),
              const SizedBox(width: 10),
              Text(
                '$likeCount lượt thích',
                style: const TextStyle(color: Colors.black45),
              ),
              const Spacer(),
              Text(
                limitText,
                style: const TextStyle(
                  color: Color(0xFFEE4D2D),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StoreInfoSection extends StatelessWidget {
  const _StoreInfoSection({required this.store});
  final StoreInfo store;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Thông tin cửa hàng',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.03),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on_rounded, color: Color(0xFFEE4D2D)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Giao đến: ${store.deliveryAddress}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: Colors.black45),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _StoreLogo(url: store.logoUrl),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      store.name,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${store.rating.toStringAsFixed(1)}  |  ${store.distanceKm.toStringAsFixed(1)}km  |  ${store.etaMin}phút',
                      style: const TextStyle(color: Colors.black54),
                    ),
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

class _ReviewsHeader extends StatelessWidget {
  const _ReviewsHeader({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Row(
        children: [
          const Text(
            'Bình luận',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(width: 8),
          Text('($count)', style: const TextStyle(color: Colors.black45)),
        ],
      ),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({required this.item});
  final ReviewItem item;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 16,
                backgroundColor: Color(0xFFEEEEEE),
                child: Icon(Icons.person, color: Colors.black54, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  item.userName,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          _StarsRow(stars: item.stars),
          const SizedBox(height: 8),
          Text(item.content, style: const TextStyle(height: 1.25)),
          if (item.imageUrl != null) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: CachedNetworkImage(
                imageUrl: item.imageUrl!,
                width: 140,
                height: 140,
                fit: BoxFit.cover,
                placeholder: (_, __) =>
                    Container(color: Colors.black12, width: 140, height: 140),
                errorWidget: (_, __, ___) =>
                    Container(color: Colors.black12, width: 140, height: 140),
              ),
            ),
          ],
          if (item.likedItemsText != null) ...[
            const SizedBox(height: 10),
            Text(
              item.likedItemsText!,
              style: const TextStyle(color: Colors.black54),
            ),
          ],
          const SizedBox(height: 8),
          Text(item.timeText, style: const TextStyle(color: Colors.black38)),
        ],
      ),
    );
  }
}

class _BottomCartBar extends StatelessWidget {
  const _BottomCartBar({
    required this.cartCount,
    required this.totalText,
    required this.onOpenCart,
    required this.onSchedulePressed,
  });

  final int cartCount;
  final String totalText;
  final VoidCallback? onOpenCart;
  final VoidCallback? onSchedulePressed;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              blurRadius: 18,
              color: Colors.black.withOpacity(0.08),
              offset: const Offset(0, -6),
            ),
          ],
        ),
        child: Row(
          children: [
            InkWell(
              onTap: onOpenCart,
              borderRadius: BorderRadius.circular(14),
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const Icon(Icons.shopping_bag_outlined, size: 26),
                    if (cartCount > 0)
                      Positioned(
                        right: -6,
                        top: -6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEE4D2D),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '$cartCount',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Center(
                child: Text(
                  totalText,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFFEE4D2D),
                  ),
                ),
              ),
            ),
            SizedBox(
              height: 44,
              child: ElevatedButton(
                onPressed: onSchedulePressed,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEE4D2D),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                ),
                child: const Text(
                  'Hẹn giao',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircleIcon extends StatelessWidget {
  const _CircleIcon({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withOpacity(0.85),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(icon, size: 20),
        ),
      ),
    );
  }
}

class _AddSquareButton extends StatelessWidget {
  const _AddSquareButton({this.onTap});
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFEE4D2D),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: const SizedBox(
          width: 40,
          height: 40,
          child: Icon(Icons.add, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}

class _StarsRow extends StatelessWidget {
  const _StarsRow({required this.stars});
  final int stars;

  @override
  Widget build(BuildContext context) {
    final s = stars.clamp(0, 5);
    return Row(
      children: List.generate(
        5,
        (i) => Icon(
          i < s ? Icons.star_rounded : Icons.star_border_rounded,
          color: const Color(0xFFF5A623),
          size: 18,
        ),
      ),
    );
  }
}

class _StoreLogo extends StatelessWidget {
  const _StoreLogo({required this.url});
  final String? url;

  @override
  Widget build(BuildContext context) {
    final w = 42.0;
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: w,
        height: w,
        color: Colors.black.withOpacity(0.06),
        child: (url == null)
            ? const Icon(Icons.storefront_rounded, color: Colors.black54)
            : CachedNetworkImage(
                imageUrl: url!,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) =>
                    const Icon(Icons.storefront_rounded, color: Colors.black54),
              ),
      ),
    );
  }
}

String _money(int v) {
  final s = v.toString();
  final buf = StringBuffer();
  for (int i = 0; i < s.length; i++) {
    final pos = s.length - i;
    buf.write(s[i]);
    if (pos > 1 && pos % 3 == 1) buf.write('.');
  }
  return '${buf}đ';
}

String _compactNumber(int n) {
  if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M+';
  if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)}K+';
  return '$n';
}
