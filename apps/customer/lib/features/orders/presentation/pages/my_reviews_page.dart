import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/features/orders/data/models/customer_my_reviews_models.dart';
import 'package:customer/features/orders/presentation/viewmodels/customer_my_reviews_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';

class MyReviewsPage extends ConsumerStatefulWidget {
  const MyReviewsPage({super.key});

  @override
  ConsumerState<MyReviewsPage> createState() => _MyReviewsPageState();
}

class _MyReviewsPageState extends ConsumerState<MyReviewsPage> {
  late final ScrollController _scrollCtrl;

  @override
  void initState() {
    super.initState();
    _scrollCtrl = ScrollController()..addListener(_onScroll);
    Future.microtask(() {
      ref.read(customerMyReviewsControllerProvider.notifier).bootstrap();
    });
  }

  void _onScroll() {
    if (!_scrollCtrl.hasClients) return;
    final pos = _scrollCtrl.position;
    final nearBottom = pos.pixels >= pos.maxScrollExtent - 220;
    if (!nearBottom) return;

    ref.read(customerMyReviewsControllerProvider.notifier).loadMore();
  }

  @override
  void dispose() {
    _scrollCtrl.removeListener(_onScroll);
    _scrollCtrl.dispose();
    super.dispose();
  }

  String _formatTime(DateTime? dt) {
    if (dt == null) return '';
    final d = dt.toLocal();
    String two(int x) => x < 10 ? '0$x' : '$x';
    return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
  }

  String _typeLabel(CustomerMyReviewType type) {
    switch (type) {
      case CustomerMyReviewType.merchant:
        return 'Đánh giá quán';
      case CustomerMyReviewType.driver:
        return 'Đánh giá tài xế';
      case CustomerMyReviewType.product:
        return 'Đánh giá món ăn';
      case CustomerMyReviewType.all:
        return 'Đánh giá';
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(customerMyReviewsControllerProvider);
    final ctrl = ref.read(customerMyReviewsControllerProvider.notifier);

    return Scaffold(
      backgroundColor: const Color(0xffF5F5F5),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _TypeChip(
                    label: 'Tất cả (${st.summary?.all ?? 0})',
                    active: st.selectedType == CustomerMyReviewType.all,
                    onTap: () => ctrl.setType(CustomerMyReviewType.all),
                  ),
                  _TypeChip(
                    label: 'Quán (${st.summary?.merchant ?? 0})',
                    active: st.selectedType == CustomerMyReviewType.merchant,
                    onTap: () => ctrl.setType(CustomerMyReviewType.merchant),
                  ),
                  _TypeChip(
                    label: 'Tài xế (${st.summary?.driver ?? 0})',
                    active: st.selectedType == CustomerMyReviewType.driver,
                    onTap: () => ctrl.setType(CustomerMyReviewType.driver),
                  ),
                  _TypeChip(
                    label: 'Sản phẩm (${st.summary?.product ?? 0})',
                    active: st.selectedType == CustomerMyReviewType.product,
                    onTap: () => ctrl.setType(CustomerMyReviewType.product),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: ctrl.refresh,
              child: st.loading
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 180),
                        Center(child: CircularProgressIndicator.adaptive()),
                      ],
                    )
                  : st.items.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 120),
                        Icon(
                          Icons.rate_review_outlined,
                          size: 72,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Center(
                          child: Text(
                            'Bạn chưa có đánh giá nào',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.black54,
                            ),
                          ),
                        ),
                      ],
                    )
                  : ListView.separated(
                      controller: _scrollCtrl,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(12),
                      itemCount: st.items.length + (st.loadingMore ? 1 : 0),
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (_, index) {
                        if (index >= st.items.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: CircularProgressIndicator.adaptive(),
                            ),
                          );
                        }

                        final item = st.items[index];

                        return _ReviewSlidableCard(
                          item: item,
                          deleting: st.deletingIds.contains(item.id),
                          typeLabel: _typeLabel(item.type),
                          timeText: _formatTime(item.createdAt),
                          onTapHeader: () {
                            switch (item.type) {
                              case CustomerMyReviewType.merchant:
                                if (item.merchant != null &&
                                    item.merchant!.id.isNotEmpty) {
                                  context.push(
                                    '/merchant/${item.merchant!.id}',
                                  );
                                  return;
                                }
                                break;

                              case CustomerMyReviewType.product:
                                if (item.product != null &&
                                    item.product!.id.isNotEmpty) {
                                  context.push(
                                    '/product/${item.product!.id}',
                                    extra: {
                                      'merchantId': item.product!.merchantId,
                                    },
                                  );
                                  return;
                                }
                                break;

                              case CustomerMyReviewType.driver:
                                if (item.order.id.isNotEmpty) {
                                  context.push('/orders/${item.order.id}');
                                  return;
                                }
                                break;

                              case CustomerMyReviewType.all:
                                break;
                            }

                            if (item.order.id.isNotEmpty) {
                              context.push('/orders/${item.order.id}');
                            }
                          },
                          onTapOrder: () {
                            if (item.order.id.isNotEmpty) {
                              context.push('/orders/${item.order.id}');
                            }
                          },
                          onTapProduct:
                              (item.type == CustomerMyReviewType.product &&
                                  item.product != null &&
                                  item.product!.id.isNotEmpty)
                              ? () {
                                  context.push(
                                    '/product/${item.product!.id}',
                                    extra: {
                                      'merchantId': item.product!.merchantId,
                                    },
                                  );
                                }
                              : null,
                          onDelete: () async {
                            final ok = await ctrl.deleteReview(item);
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  ok
                                      ? 'Đã xoá đánh giá'
                                      : 'Xoá đánh giá thất bại',
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewSlidableCard extends StatelessWidget {
  const _ReviewSlidableCard({
    required this.item,
    required this.deleting,
    required this.typeLabel,
    required this.timeText,
    required this.onTapHeader,
    required this.onTapOrder,
    required this.onTapProduct,
    required this.onDelete,
  });

  final CustomerMyReviewItem item;
  final bool deleting;
  final String typeLabel;
  final String timeText;
  final VoidCallback onTapHeader;
  final VoidCallback onTapOrder;
  final VoidCallback? onTapProduct;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Slidable(
      key: ValueKey(item.id),
      endActionPane: ActionPane(
        motion: const StretchMotion(),
        extentRatio: 0.24,
        children: [
          SlidableAction(
            onPressed: (_) => onDelete(),
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
            icon: Icons.delete_outline,
            label: 'Xoá',
            borderRadius: BorderRadius.circular(14),
          ),
        ],
      ),
      child: _ReviewCard(
        item: item,
        deleting: deleting,
        typeLabel: typeLabel,
        timeText: timeText,
        onTapHeader: onTapHeader,
        onTapOrder: onTapOrder,
        onTapProduct: onTapProduct,
      ),
    );
  }
}

class _MyReviewMediaStrip extends StatelessWidget {
  const _MyReviewMediaStrip({
    required this.images,
    required this.videoUrl,
    required this.onTapImage,
  });

  final List<CustomerMyReviewImage> images;
  final String? videoUrl;
  final void Function(int index) onTapImage;

  @override
  Widget build(BuildContext context) {
    final hasVideo = videoUrl != null && videoUrl!.trim().isNotEmpty;

    if (images.isEmpty && !hasVideo) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      height: 84,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: images.length + (hasVideo ? 1 : 0),
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, index) {
          if (index < images.length) {
            final img = images[index];
            return GestureDetector(
              onTap: () => onTapImage(index),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: CachedNetworkImage(
                  imageUrl: img.url,
                  width: 84,
                  height: 84,
                  fit: BoxFit.cover,
                  placeholder: (_, __) =>
                      Container(width: 84, height: 84, color: Colors.black12),
                  errorWidget: (_, __, ___) => Container(
                    width: 84,
                    height: 84,
                    color: Colors.black12,
                    alignment: Alignment.center,
                    child: const Icon(Icons.broken_image_outlined),
                  ),
                ),
              ),
            );
          }

          return Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              color: Colors.black12,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.videocam_rounded),
          );
        },
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  const _TypeChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: active ? AppColor.primary : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: active ? AppColor.primary : Colors.black12,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: active ? Colors.white : Colors.black87,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({
    required this.item,
    required this.deleting,
    required this.typeLabel,
    required this.timeText,
    required this.onTapHeader,
    required this.onTapOrder,
    required this.onTapProduct,
  });

  final CustomerMyReviewItem item;
  final bool deleting;
  final String typeLabel;
  final String timeText;
  final VoidCallback onTapHeader;
  final VoidCallback onTapOrder;
  final VoidCallback? onTapProduct;

  String _title() {
    switch (item.type) {
      case CustomerMyReviewType.merchant:
        return item.merchant?.name ?? 'Quán';
      case CustomerMyReviewType.product:
        return item.product?.name ?? 'Sản phẩm';
      case CustomerMyReviewType.driver:
        return item.driver?.name ?? 'Tài xế';
      case CustomerMyReviewType.all:
        return item.product?.name ??
            item.merchant?.name ??
            item.driver?.name ??
            'Đánh giá';
    }
  }

  String? _thumb() {
    switch (item.type) {
      case CustomerMyReviewType.merchant:
        return item.merchant?.logoUrl;
      case CustomerMyReviewType.product:
        return item.product?.imageUrl ?? item.merchant?.logoUrl;
      case CustomerMyReviewType.driver:
        return item.driver?.avatarUrl;
      case CustomerMyReviewType.all:
        return item.product?.imageUrl ??
            item.merchant?.logoUrl ??
            item.driver?.avatarUrl;
    }
  }

  @override
  Widget build(BuildContext context) {
    final thumb = _thumb();

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTapHeader,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                typeLabel,
                style: const TextStyle(
                  color: Colors.black54,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SizedBox(
                      width: 56,
                      height: 56,
                      child: (thumb == null || thumb.isEmpty)
                          ? Container(
                              color: Colors.black12,
                              child: const Icon(Icons.image_not_supported),
                            )
                          : CachedNetworkImage(
                              imageUrl: thumb,
                              fit: BoxFit.cover,
                              placeholder: (_, __) =>
                                  Container(color: Colors.black12),
                              errorWidget: (_, __, ___) =>
                                  Container(color: Colors.black12),
                            ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _title(),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          timeText,
                          style: const TextStyle(
                            color: Colors.black54,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 6),
                        _StarsRow(stars: item.rating),
                      ],
                    ),
                  ),
                ],
              ),

              if (item.comment.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  item.comment,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Colors.black87,
                    height: 1.35,
                  ),
                ),
              ],

              if (item.merchant != null) ...[
                const SizedBox(height: 10),
                InkWell(
                  onTap: onTapHeader,
                  child: Text(
                    'Quán: ${item.merchant!.name}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColor.primary,
                    ),
                  ),
                ),
              ],

              if (item.product != null) ...[
                const SizedBox(height: 6),
                InkWell(
                  onTap: onTapProduct,
                  child: Text(
                    'Sản phẩm: ${item.product!.name}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColor.primary,
                    ),
                  ),
                ),
              ],

              if (item.images.isNotEmpty ||
                  (item.videoUrl?.isNotEmpty ?? false)) ...[
                const SizedBox(height: 12),
                _MyReviewMediaStrip(
                  images: item.images,
                  videoUrl: item.videoUrl,
                  onTapImage: (initialIndex) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => _MyReviewImageViewerPage(
                          images: item.images,
                          initialIndex: initialIndex,
                        ),
                      ),
                    );
                  },
                ),
              ],

              if (item.merchantReply != null &&
                  item.merchantReply!.content.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xffF7F7F7),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Phản hồi từ quán',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          color: AppColor.primary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        item.merchantReply!.content,
                        style: const TextStyle(fontSize: 13, height: 1.35),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 12),
              Row(
                children: [
                  TextButton(
                    onPressed: onTapOrder,
                    child: Text(
                      'Đơn #${item.order.orderNumber}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  const Spacer(),
                  if (deleting)
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
            ],
          ),
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

class _MyReviewImageViewerPage extends StatefulWidget {
  const _MyReviewImageViewerPage({
    required this.images,
    required this.initialIndex,
  });

  final List<CustomerMyReviewImage> images;
  final int initialIndex;

  @override
  State<_MyReviewImageViewerPage> createState() =>
      _MyReviewImageViewerPageState();
}

class _MyReviewImageViewerPageState extends State<_MyReviewImageViewerPage> {
  late final PageController _pageController;
  late int _current;

  @override
  void initState() {
    super.initState();
    _current = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          '${_current + 1}/${widget.images.length}',
          style: const TextStyle(color: Colors.white),
        ),
      ),
      body: PageView.builder(
        controller: _pageController,
        itemCount: widget.images.length,
        onPageChanged: (i) => setState(() => _current = i),
        itemBuilder: (_, index) {
          final img = widget.images[index];
          return InteractiveViewer(
            minScale: 1,
            maxScale: 4,
            child: Center(
              child: CachedNetworkImage(imageUrl: img.url, fit: BoxFit.contain),
            ),
          );
        },
      ),
    );
  }
}
