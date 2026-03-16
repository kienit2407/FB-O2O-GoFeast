import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:customer/features/merchant/data/models/product_reviews_model.dart';
import 'package:customer/features/merchant/presentation/viewmodels/merchant_review_submit_controller.dart';
import 'package:customer/features/merchant/presentation/widgets/review_editor_dialog.dart';
import 'package:customer/features/merchant/presentation/widgets/review_media_strip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class MerchantReviewsPreviewSection extends ConsumerWidget {
  const MerchantReviewsPreviewSection({
    super.key,
    required this.merchantId,
    required this.onSeeMore,
  });

  final String merchantId;
  final VoidCallback onSeeMore;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final st = ref.watch(merchantReviewsProvider(merchantId));

    if (st.isLoading && st.reviews.isEmpty) {
      return Container(
        color: Colors.white,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    final displayReviews = <ProductReviewItem>[
      if (st.myReview != null) st.myReview!,
      ...st.reviews.where((e) => e.id != st.myReview?.id),
    ];

    final preview = displayReviews.take(2).toList();

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Đánh giá từ khách hàng',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              TextButton(
                onPressed: onSeeMore,
                child: const Text(
                  'Xem thêm',
                  style: TextStyle(color: AppColor.primary, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(
                Icons.star_rounded,
                color: Color(0xFFF5A623),
                size: 18,
              ),
              const SizedBox(width: 4),
              Text(
                st.avgRating.toStringAsFixed(1),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: 8),
              Text(
                '(${st.totalReviews} bình luận)',
                style: const TextStyle(color: Colors.black54),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (preview.isEmpty)
            InkWell(
              onTap: onSeeMore,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColor.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColor.border),
                ),
                child: const Text(
                  'Chưa có đánh giá nào. Xem thêm để viết đánh giá đầu tiên.',
                  style: TextStyle(color: Colors.black54),
                ),
              ),
            )
          else
            ...preview.asMap().entries.map((entry) {
              final r = entry.value;
              final isLast = entry.key == preview.length - 1;

              return Column(
                children: [
                  _MerchantReviewTile(
                    userName: r.user?.name ?? 'Ẩn danh',
                    userAvatarUrl: r.user?.avatarUrl,
                    stars: r.rating,
                    content: r.comment,
                    images: r.images,
                    videoUrl: r.videoUrl,
                    timeText: _formatTime(r.createdAt),
                    merchantReply: r.merchantReply?.content,
                    isEdited: r.isEdited,
                  ),
                  if (!isLast) const Divider(height: 1, color: Colors.black12),
                ],
              );
            }),
        ],
      ),
    );
  }
}

class MerchantReviewsBottomSheet extends ConsumerStatefulWidget {
  const MerchantReviewsBottomSheet({
    super.key,
    required this.merchantId,
    this.onChanged,
  });

  final String merchantId;
  final Future<void> Function()? onChanged;

  @override
  ConsumerState<MerchantReviewsBottomSheet> createState() =>
      _MerchantReviewsBottomSheetState();
}

class _MerchantReviewsBottomSheetState
    extends ConsumerState<MerchantReviewsBottomSheet> {
  late final ScrollController _scrollCtrl;

  @override
  void initState() {
    super.initState();
    _scrollCtrl = ScrollController()..addListener(_onScrollLoadMore);
  }

  @override
  void dispose() {
    _scrollCtrl.removeListener(_onScrollLoadMore);
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScrollLoadMore() {
    if (!_scrollCtrl.hasClients) return;
    final pos = _scrollCtrl.position;
    if (pos.maxScrollExtent <= 0) return;

    final nearBottom = pos.pixels >= (pos.maxScrollExtent - 240);
    if (!nearBottom) return;

    ref.read(merchantReviewsProvider(widget.merchantId).notifier).loadMore();
  }

  Future<void> _openEditor({ProductReviewItem? existing}) async {
    final reviewsState = ref.read(merchantReviewsProvider(widget.merchantId));
    final submitCtrl = ref.read(
      merchantReviewSubmitControllerProvider(widget.merchantId).notifier,
    );

    final changed = await ReviewEditorDialog.show(
      context,
      title: existing != null ? 'Sửa đánh giá quán' : 'Đánh giá quán',
      initialRating: existing?.rating ?? 5,
      initialComment: existing?.comment ?? '',
      initialImageUrls: existing?.images.map((e) => e.url).toList() ?? const [],
      initialVideoUrl: existing?.videoUrl,
      submitText: existing != null ? 'Cập nhật' : 'Gửi đánh giá',
      onSubmit: (result) async {
        bool ok = false;

        if (existing != null) {
          ok = await submitCtrl.updateReview(
            reviewId: existing.id,
            rating: result.rating,
            comment: result.comment,
            keptRemoteImageUrls: result.keptRemoteImageUrls,
            keptRemoteVideoUrl: result.keptRemoteVideoUrl,
            newImages: result.newImages,
            newVideo: result.newVideo,
          );
        } else {
          final createOrderId = reviewsState.createOrderId;
          if (createOrderId == null || createOrderId.isEmpty) {
            return 'Không tìm thấy order đủ điều kiện để đánh giá';
          }

          ok = await submitCtrl.createReview(
            orderId: createOrderId,
            merchantId: widget.merchantId,
            rating: result.rating,
            comment: result.comment,
            newImages: result.newImages,
            newVideo: result.newVideo,
          );
        }

        final submitState = ref.read(
          merchantReviewSubmitControllerProvider(widget.merchantId),
        );

        if (!ok) {
          return submitState.error ?? 'Thao tác thất bại';
        }

        return null;
      },
    );

    if (!mounted || changed != true) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          existing != null
              ? 'Đã cập nhật đánh giá quán'
              : 'Đã gửi đánh giá quán',
        ),
      ),
    );

    await ref
        .read(merchantReviewsProvider(widget.merchantId).notifier)
        .refresh();
    await widget.onChanged?.call();
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(merchantReviewsProvider(widget.merchantId));

    final myReview = st.myReview;
    final canEditReview = myReview != null;
    final canWriteReview = myReview == null && st.canCreateReview;

    final actionText = canEditReview
        ? 'Sửa đánh giá'
        : (canWriteReview ? 'Viết đánh giá' : null);

    final displayReviews = <ProductReviewItem>[
      if (myReview != null) myReview,
      ...st.reviews.where((e) => e.id != myReview?.id),
    ];

    return DraggableScrollableSheet(
      initialChildSize: 0.86,
      minChildSize: 0.55,
      maxChildSize: 0.95,
      builder: (_, __) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 6),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back_ios_new_rounded),
                      color: AppColor.primary,
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.star_rounded,
                                color: Color(0xFFF5A623),
                                size: 18,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                st.avgRating.toStringAsFixed(1),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '(${st.totalReviews} bình luận)',
                                style: const TextStyle(
                                  color: Colors.black54,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (actionText != null)
                      TextButton(
                        onPressed: canWriteReview
                            ? () => _openEditor()
                            : () => _openEditor(existing: myReview),
                        child: Text(actionText, style: TextStyle(color: AppColor.primary, fontWeight: FontWeight.w600),),
                      )
                    else
                      const SizedBox(width: 48),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => ref
                      .read(merchantReviewsProvider(widget.merchantId).notifier)
                      .refresh(),
                  child: Builder(
                    builder: (_) {
                      if (st.isLoading && displayReviews.isEmpty) {
                        return const Center(child: CircularProgressIndicator());
                      }

                      if (displayReviews.isEmpty) {
                        return ListView(
                          controller: _scrollCtrl,
                          children: const [
                            SizedBox(height: 60),
                            Center(
                              child: Text(
                                'Chưa có đánh giá nào',
                                style: TextStyle(color: Colors.black45),
                              ),
                            ),
                          ],
                        );
                      }

                      return ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.only(bottom: 20),
                        itemCount: displayReviews.length + 1,
                        itemBuilder: (_, i) {
                          if (i == displayReviews.length) {
                            if (st.isLoadingMore) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 14),
                                child: Center(
                                  child: CircularProgressIndicator(),
                                ),
                              );
                            }
                            if (!st.hasMore) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 18),
                                child: Center(
                                  child: Text(
                                    'Hết bình luận',
                                    style: TextStyle(color: Colors.black45),
                                  ),
                                ),
                              );
                            }
                            return const SizedBox(height: 18);
                          }

                          final r = displayReviews[i];

                          return Column(
                            children: [
                              _MerchantReviewTile(
                                userName: r.user?.name ?? 'Ẩn danh',
                                userAvatarUrl: r.user?.avatarUrl,
                                stars: r.rating,
                                content: r.comment,
                                images: r.images,
                                videoUrl: r.videoUrl,
                                timeText: _formatTime(r.createdAt),
                                merchantReply: r.merchantReply?.content,
                                isEdited: r.isEdited,
                              ),
                              const Divider(height: 1, color: Colors.black12),
                            ],
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
      },
    );
  }
}

class _MerchantReviewTile extends StatelessWidget {
  const _MerchantReviewTile({
    required this.userName,
    required this.userAvatarUrl,
    required this.stars,
    required this.content,
    required this.timeText,
    required this.images,
    this.videoUrl,
    this.merchantReply,
    this.isEdited = false,
  });

  final String userName;
  final String? userAvatarUrl;
  final int stars;
  final String content;
  final List<ReviewImage> images;
  final String? videoUrl;
  final String timeText;
  final String? merchantReply;
  final bool isEdited;

  @override
  Widget build(BuildContext context) {
    final hasMedia =
        images.isNotEmpty || (videoUrl != null && videoUrl!.trim().isNotEmpty);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _ReviewAvatar(name: userName, avatarUrl: userAvatarUrl),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  userName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppColor.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          _StarsRow(stars: stars),
          const SizedBox(height: 8),
          Text(
            content,
            style: const TextStyle(height: 1.4, color: AppColor.textPrimary),
          ),
          if (hasMedia) ...[
            const SizedBox(height: 12),
            ReviewMediaStrip(images: images, videoUrl: videoUrl),
          ],
          if (merchantReply != null && merchantReply!.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColor.surfaceWarm,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColor.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Phản hồi từ quán',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColor.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    merchantReply!,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.35,
                      color: AppColor.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                timeText,
                style: const TextStyle(color: AppColor.textMuted, fontSize: 12),
              ),
              if (isEdited) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColor.surfaceWarm,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColor.border),
                  ),
                  child: const Text(
                    'Đã chỉnh sửa',
                    style: TextStyle(
                      color: AppColor.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _ReviewAvatar extends StatelessWidget {
  const _ReviewAvatar({required this.name, required this.avatarUrl});

  final String name;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context) {
    final first = name.trim().isEmpty ? 'A' : name.trim()[0].toUpperCase();

    return ClipOval(
      child: Container(
        width: 32,
        height: 32,
        color: AppColor.surfaceWarm,
        child: (avatarUrl != null && avatarUrl!.trim().isNotEmpty)
            ? CachedNetworkImage(
                imageUrl: avatarUrl!,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => Center(
                  child: Text(
                    first,
                    style: const TextStyle(
                      color: AppColor.textSecondary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              )
            : Center(
                child: Text(
                  first,
                  style: const TextStyle(
                    color: AppColor.textSecondary,
                    fontWeight: FontWeight.w700,
                  ),
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

String _formatTime(DateTime? dt) {
  if (dt == null) return '';
  final d = dt.toLocal();
  String two(int x) => x < 10 ? '0$x' : '$x';
  return '${two(d.day)}-${two(d.month)}-${d.year} ${two(d.hour)}:${two(d.minute)}';
}
