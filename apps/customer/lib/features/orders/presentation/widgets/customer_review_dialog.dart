import 'dart:io';

import 'package:customer/app/theme/app_color.dart';
import 'package:customer/features/orders/data/models/customer_review_models.dart';
import 'package:customer/features/orders/presentation/viewmodels/customer_order_review_controller.dart';
import 'package:customer/features/orders/presentation/viewmodels/customer_order_review_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:photo_manager/photo_manager.dart' show AssetType;
import 'package:wechat_assets_picker/wechat_assets_picker.dart';

Future<bool?> showCustomerReviewDialog({
  required BuildContext context,
  required WidgetRef ref,
  required String orderId,
  required CustomerReviewTarget target,
  required CustomerOrderReviewState reviewState,
  String? merchantId,
  String? driverUserId,
  String? productId,
  CustomerSingleReviewStatus? existedOverride,
}) {
  final existed =
      existedOverride ??
      (target == CustomerReviewTarget.merchant
          ? reviewState.status?.merchantReview
          : target == CustomerReviewTarget.driver
          ? reviewState.status?.driverReview
          : null);

  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (_) => _CustomerReviewDialog(
      pageContext: context,
      orderId: orderId,
      target: target,
      merchantId: merchantId,
      driverUserId: driverUserId,
      productId: productId,
      existed: existed,
    ),
  );
}

class _CustomerReviewDialog extends ConsumerStatefulWidget {
  const _CustomerReviewDialog({
    required this.pageContext,
    required this.orderId,
    required this.target,
    required this.merchantId,
    required this.driverUserId,
    required this.productId,
    required this.existed,
  });

  final BuildContext pageContext;
  final String orderId;
  final CustomerReviewTarget target;
  final String? merchantId;
  final String? driverUserId;
  final String? productId;
  final CustomerSingleReviewStatus? existed;

  @override
  ConsumerState<_CustomerReviewDialog> createState() =>
      _CustomerReviewDialogState();
}

class _CustomerReviewDialogState extends ConsumerState<_CustomerReviewDialog> {
  late final TextEditingController _commentController;
  late int _rating;

  final List<AssetEntity> _selectedImageAssets = <AssetEntity>[];
  final List<File> _localImages = <File>[];

  AssetEntity? _selectedVideoAsset;
  File? _videoFile;

  late final List<CustomerReviewMedia> _remoteImages;
  String? _remoteVideoUrl;

  CustomerOrderReviewController get _controller =>
      ref.read(customerOrderReviewControllerProvider(widget.orderId).notifier);

  @override
  void initState() {
    super.initState();
    _commentController = TextEditingController(
      text: widget.existed?.comment ?? '',
    );
    _rating = widget.existed?.exists == true ? widget.existed!.rating : 5;
    _remoteImages = <CustomerReviewMedia>[...?widget.existed?.images];
    _remoteVideoUrl = widget.existed?.videoUrl;
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  String get _title {
    switch (widget.target) {
      case CustomerReviewTarget.merchant:
        return widget.existed?.exists == true
            ? 'Chỉnh sửa đánh giá quán'
            : 'Đánh giá quán';
      case CustomerReviewTarget.driver:
        return widget.existed?.exists == true
            ? 'Chỉnh sửa đánh giá tài xế'
            : 'Đánh giá tài xế';
      case CustomerReviewTarget.product:
        return widget.existed?.exists == true
            ? 'Chỉnh sửa đánh giá món ăn'
            : 'Đánh giá món ăn';
    }
  }

  String _ratingLabel(int star) {
    switch (star) {
      case 1:
        return 'Tệ';
      case 2:
        return 'Không hài lòng';
      case 3:
        return 'Bình thường';
      case 4:
        return 'Hài lòng';
      case 5:
        return 'Tuyệt vời';
      default:
        return '';
    }
  }

  void _showError(String message) {
    final messenger = ScaffoldMessenger.maybeOf(widget.pageContext);
    messenger?.showSnackBar(SnackBar(content: Text(message)));
  }

  Future<List<File>> _assetImagesToFiles(List<AssetEntity> assets) async {
    final files = <File>[];
    for (final asset in assets) {
      final file = await asset.file;
      if (file != null) {
        files.add(file);
      }
    }
    return files;
  }

  Future<File?> _assetToFile(AssetEntity? asset) async {
    if (asset == null) return null;
    return asset.file;
  }

  Future<void> _pickMedia() async {
    final selected = <AssetEntity>[
      ..._selectedImageAssets,
      if (_selectedVideoAsset != null) _selectedVideoAsset!,
    ];

    final result = await AssetPicker.pickAssets(
      context,
      pickerConfig: AssetPickerConfig(
        maxAssets: 10,
        requestType: RequestType.common,
        selectedAssets: selected,
        themeColor: AppColor.primary,
      ),
    );

    if (!mounted || result == null) return;

    final pickedImages = result
        .where((e) => e.type == AssetType.image)
        .toList();
    final pickedVideos = result
        .where((e) => e.type == AssetType.video)
        .toList();

    if (_remoteImages.length + pickedImages.length > 9) {
      _showError('Tối đa 9 hình ảnh');
      return;
    }

    if ((_remoteVideoUrl != null ? 1 : 0) + pickedVideos.length > 1) {
      _showError(
        'Chỉ được có 1 video. Hãy xoá video hiện tại trước nếu muốn đổi video khác.',
      );
      return;
    }

    final imageFiles = await _assetImagesToFiles(pickedImages);
    final pickedVideoAsset = pickedVideos.isNotEmpty
        ? pickedVideos.first
        : null;
    final pickedVideoFile = await _assetToFile(pickedVideoAsset);

    if (!mounted) return;

    if (pickedVideoAsset != null && pickedVideoFile == null) {
      _showError('Không thể đọc file video');
      return;
    }

    setState(() {
      _selectedImageAssets
        ..clear()
        ..addAll(pickedImages);

      _localImages
        ..clear()
        ..addAll(imageFiles);

      _selectedVideoAsset = pickedVideoAsset;
      _videoFile = pickedVideoFile;
    });
  }

  Future<void> _submit() async {
    final comment = _commentController.text.trim();
    if (comment.isEmpty) {
      _showError('Vui lòng nhập nội dung đánh giá');
      return;
    }

    if (widget.target == CustomerReviewTarget.merchant &&
        (widget.merchantId == null || widget.merchantId!.trim().isEmpty)) {
      _showError('Thiếu merchantId để gửi đánh giá quán');
      return;
    }

    if (widget.target == CustomerReviewTarget.driver &&
        (widget.driverUserId == null || widget.driverUserId!.trim().isEmpty)) {
      _showError('Thiếu driverUserId để gửi đánh giá tài xế');
      return;
    }

    if (widget.target == CustomerReviewTarget.product &&
        (widget.productId == null || widget.productId!.trim().isEmpty)) {
      _showError('Thiếu productId để gửi đánh giá món ăn');
      return;
    }

    final input = CustomerReviewSubmitInput(
      orderId: widget.orderId,
      merchantId: widget.merchantId,
      driverUserId: widget.driverUserId,
      productId: widget.productId,
      rating: _rating,
      comment: comment,
      newImages: _localImages,
      newVideo: _videoFile,
      keptRemoteImageUrls: _remoteImages.map((e) => e.url).toList(),
      keptRemoteVideoUrl: _remoteVideoUrl,
    );

    final ok = await _controller.submitByTarget(
      widget.target,
      input,
      reviewId: widget.existed?.exists == true ? widget.existed?.id : null,
    );

    if (!mounted) return;

    final newState = ref.read(
      customerOrderReviewControllerProvider(widget.orderId),
    );

    if (!ok) {
      _showError(newState.error ?? 'Gửi đánh giá thất bại');
      return;
    }

    Navigator.of(context).pop(true);
  }

  Future<void> _deleteReview() async {
    final reviewId = widget.existed?.id;
    if (reviewId == null || reviewId.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (confirmCtx) {
        return AlertDialog(
          title: const Text('Xoá đánh giá'),
          content: const Text('Bạn có chắc muốn xoá đánh giá này không?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(confirmCtx).pop(false),
              child: const Text('Huỷ'),
            ),
            TextButton(
              onPressed: () => Navigator.of(confirmCtx).pop(true),
              child: const Text('Xoá', style: TextStyle(color: Colors.red)),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    final ok = await _controller.deleteByTarget(widget.target, reviewId);

    if (!mounted) return;

    final newState = ref.read(
      customerOrderReviewControllerProvider(widget.orderId),
    );

    if (!ok) {
      _showError(newState.error ?? 'Xoá đánh giá thất bại');
      return;
    }

    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(customerOrderReviewControllerProvider(widget.orderId));

    final totalImageCount = _remoteImages.length + _localImages.length;
    final totalVideoCount =
        (_remoteVideoUrl != null ? 1 : 0) + (_videoFile != null ? 1 : 0);

    return Dialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                Center(
                  child: Text(
                    _title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColor.textPrimary,
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(999),
                    onTap: st.submitting
                        ? null
                        : () => Navigator.of(context).pop(false),
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Icon(Icons.close, color: AppColor.textSecondary),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final star = index + 1;
                return GestureDetector(
                  onTap: st.submitting
                      ? null
                      : () => setState(() => _rating = star),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(
                      star <= _rating
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      color: AppColor.ratingGold,
                      size: 34,
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 8),
            Text(
              _ratingLabel(_rating),
              style: const TextStyle(
                color: AppColor.primary,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 18),

            Container(
              decoration: BoxDecoration(
                color: AppColor.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColor.border),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: TextField(
                controller: _commentController,
                enabled: !st.submitting,
                maxLines: 5,
                maxLength: 300,
                cursorColor: AppColor.primary,
                decoration: const InputDecoration(
                  hintText: 'Hãy chia sẻ trải nghiệm của bạn...',
                  border: InputBorder.none,
                  counterText: '',
                ),
              ),
            ),
            const SizedBox(height: 14),

            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InkWell(
                  onTap: st.submitting ? null : _pickMedia,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    width: 84,
                    height: 84,
                    decoration: BoxDecoration(
                      color: AppColor.surfaceWarm,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColor.border),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.add_photo_alternate_outlined,
                          color: AppColor.primary,
                          size: 24,
                        ),
                        SizedBox(height: 6),
                        Text(
                          'Thêm\nảnh/video',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColor.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SizedBox(
                    height: 84,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        ..._remoteImages.asMap().entries.map(
                          (entry) => _RemoteMediaThumb(
                            imageUrl: entry.value.url,
                            onRemove: st.submitting
                                ? null
                                : () {
                                    setState(() {
                                      _remoteImages.removeAt(entry.key);
                                    });
                                  },
                          ),
                        ),
                        if (_remoteVideoUrl != null)
                          _RemoteVideoThumb(
                            onRemove: st.submitting
                                ? null
                                : () {
                                    setState(() {
                                      _remoteVideoUrl = null;
                                    });
                                  },
                          ),
                        if (_videoFile != null)
                          _LocalMediaThumb(
                            file: _videoFile!,
                            isVideo: true,
                            onRemove: st.submitting
                                ? null
                                : () {
                                    setState(() {
                                      _selectedVideoAsset = null;
                                      _videoFile = null;
                                    });
                                  },
                          ),
                        ..._localImages.asMap().entries.map(
                          (entry) => _LocalMediaThumb(
                            file: entry.value,
                            isVideo: false,
                            onRemove: st.submitting
                                ? null
                                : () {
                                    setState(() {
                                      _localImages.removeAt(entry.key);
                                      if (entry.key <
                                          _selectedImageAssets.length) {
                                        _selectedImageAssets.removeAt(
                                          entry.key,
                                        );
                                      }
                                    });
                                  },
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Đã chọn: $totalImageCount/9 ảnh • $totalVideoCount/1 video',
                style: const TextStyle(color: AppColor.textMuted, fontSize: 12),
              ),
            ),

            const SizedBox(height: 18),

            Row(
              children: [
                if (widget.existed?.exists == true &&
                    (widget.existed?.id?.isNotEmpty ?? false)) ...[
                  Expanded(
                    child: OutlinedButton(
                      onPressed: st.submitting ? null : _deleteReview,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                      ),
                      child: const Text('Xoá'),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: OutlinedButton(
                    onPressed: st.submitting
                        ? null
                        : () => Navigator.of(context).pop(false),
                    child: const Text('Huỷ'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: st.submitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColor.primary,
                      foregroundColor: Colors.white,
                    ),
                    child: st.submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            widget.existed?.exists == true
                                ? 'Cập nhật'
                                : 'Gửi đánh giá',
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LocalMediaThumb extends StatelessWidget {
  const _LocalMediaThumb({
    required this.file,
    required this.isVideo,
    required this.onRemove,
  });

  final File file;
  final bool isVideo;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return _ThumbShell(
      onRemove: onRemove,
      child: isVideo
          ? Container(
              color: Colors.black87,
              alignment: Alignment.center,
              child: const Icon(
                Icons.play_circle_fill_rounded,
                color: Colors.white,
                size: 28,
              ),
            )
          : Image.file(file, fit: BoxFit.cover),
    );
  }
}

class _RemoteMediaThumb extends StatelessWidget {
  const _RemoteMediaThumb({required this.imageUrl, required this.onRemove});

  final String imageUrl;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return _ThumbShell(
      onRemove: onRemove,
      child: Image.network(imageUrl, fit: BoxFit.cover),
    );
  }
}

class _RemoteVideoThumb extends StatelessWidget {
  const _RemoteVideoThumb({required this.onRemove});

  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return _ThumbShell(
      onRemove: onRemove,
      child: Container(
        color: Colors.black87,
        alignment: Alignment.center,
        child: const Icon(
          Icons.play_circle_fill_rounded,
          color: Colors.white,
          size: 28,
        ),
      ),
    );
  }
}

class _ThumbShell extends StatelessWidget {
  const _ThumbShell({required this.child, required this.onRemove});

  final Widget child;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 84,
      height: 84,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: Container(
              margin: const EdgeInsets.only(right: 10),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: child,
              ),
            ),
          ),
          Positioned(
            right: 4,
            top: -6,
            child: GestureDetector(
              onTap: onRemove,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: onRemove == null ? Colors.black26 : Colors.black54,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, color: Colors.white, size: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
