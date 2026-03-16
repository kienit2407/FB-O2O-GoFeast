import 'dart:io';

import 'package:customer/app/theme/app_color.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class ReviewEditorResult {
  final int rating;
  final String comment;
  final List<String> keptRemoteImageUrls;
  final String? keptRemoteVideoUrl;
  final List<File> newImages;
  final File? newVideo;

  const ReviewEditorResult({
    required this.rating,
    required this.comment,
    required this.keptRemoteImageUrls,
    required this.keptRemoteVideoUrl,
    required this.newImages,
    required this.newVideo,
  });
}

class ReviewEditorDialog extends StatefulWidget {
  const ReviewEditorDialog({
    super.key,
    this.title = 'Đánh giá sản phẩm',
    this.initialRating = 5,
    this.initialComment = '',
    this.initialImageUrls = const [],
    this.initialVideoUrl,
    this.submitText = 'Gửi đánh giá',
    required this.onSubmit,
  });

  final String title;
  final int initialRating;
  final String initialComment;
  final List<String> initialImageUrls;
  final String? initialVideoUrl;
  final String submitText;

  /// return null => success
  /// return String => error message
  final Future<String?> Function(ReviewEditorResult result) onSubmit;

  static Future<bool?> show(
    BuildContext context, {
    String title = 'Đánh giá sản phẩm',
    int initialRating = 5,
    String initialComment = '',
    List<String> initialImageUrls = const [],
    String? initialVideoUrl,
    String submitText = 'Gửi đánh giá',
    required Future<String?> Function(ReviewEditorResult result) onSubmit,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => ReviewEditorDialog(
        title: title,
        initialRating: initialRating,
        initialComment: initialComment,
        initialImageUrls: initialImageUrls,
        initialVideoUrl: initialVideoUrl,
        submitText: submitText,
        onSubmit: onSubmit,
      ),
    );
  }

  @override
  State<ReviewEditorDialog> createState() => _ReviewEditorDialogState();
}

class _ReviewEditorDialogState extends State<ReviewEditorDialog> {
  late final TextEditingController _commentController;
  final ImagePicker _picker = ImagePicker();

  late int _rating;
  late List<String> _remoteImages;
  late String? _remoteVideoUrl;

  final List<File> _newImages = [];
  File? _newVideo;

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _commentController = TextEditingController(text: widget.initialComment);
    _rating = widget.initialRating;
    _remoteImages = [...widget.initialImageUrls];
    _remoteVideoUrl = widget.initialVideoUrl;
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
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
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  int get _totalImageCount => _remoteImages.length + _newImages.length;

  Future<void> _pickImages() async {
    if (_submitting) return;

    final remain = 9 - _totalImageCount;
    if (remain <= 0) {
      _showError('Tối đa 9 hình ảnh');
      return;
    }

    final picked = await _picker.pickMultiImage(
      maxWidth: 1920,
      imageQuality: 85,
    );

    if (!mounted || picked.isEmpty) return;

    final sliced = picked.take(remain).map((e) => File(e.path)).toList();

    setState(() {
      _newImages.addAll(sliced);
    });
  }

  Future<void> _pickVideo() async {
    if (_submitting) return;

    final picked = await _picker.pickVideo(
      source: ImageSource.gallery,
      maxDuration: const Duration(seconds: 60),
    );

    if (!mounted || picked == null) return;

    setState(() {
      _newVideo = File(picked.path);
      _remoteVideoUrl = null;
    });
  }

  Future<void> _showPickAction() async {
    if (_submitting) return;

    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      builder: (bsContext) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Thêm hình ảnh'),
                onTap: () async {
                  Navigator.pop(bsContext);
                  await _pickImages();
                },
              ),
              ListTile(
                leading: const Icon(Icons.videocam_outlined),
                title: const Text('Thêm video'),
                onTap: () async {
                  Navigator.pop(bsContext);
                  await _pickVideo();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _submit() async {
    if (_submitting) return;

    final comment = _commentController.text.trim();
    if (comment.isEmpty) {
      _showError('Vui lòng nhập nội dung đánh giá');
      return;
    }

    final result = ReviewEditorResult(
      rating: _rating,
      comment: comment,
      keptRemoteImageUrls: _remoteImages,
      keptRemoteVideoUrl: _remoteVideoUrl,
      newImages: [..._newImages],
      newVideo: _newVideo,
    );

    setState(() {
      _submitting = true;
    });

    try {
      final error = await widget.onSubmit(result);

      if (!mounted) return;

      if (error == null) {
        Navigator.of(context).pop(true);
        return;
      }

      _showError(error);
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => !_submitting,
      child: Dialog(
        backgroundColor: Colors.white,
        insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  Center(
                    child: Text(
                      widget.title,
                      style: const TextStyle(
                        color: AppColor.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  Positioned(
                    right: 0,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(999),
                      onTap: _submitting
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
                  final active = star <= _rating;
                  return GestureDetector(
                    onTap: _submitting
                        ? null
                        : () => setState(() => _rating = star),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Icon(
                        active ? Icons.star_rounded : Icons.star_border_rounded,
                        size: 34,
                        color: AppColor.ratingGold,
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  _ratingLabel(_rating),
                  style: const TextStyle(
                    color: AppColor.primary,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
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
                  enabled: !_submitting,
                  maxLines: 5,
                  maxLength: 250,
                  cursorColor: AppColor.primary,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColor.textPrimary,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'Hãy chia sẻ cảm nhận của bạn về món ăn này...',
                    hintStyle: TextStyle(
                      color: AppColor.textMuted,
                      fontSize: 13,
                    ),
                    border: InputBorder.none,
                    counterText: '',
                  ),
                ),
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  InkWell(
                    onTap: _submitting ? null : _showPickAction,
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: 82,
                      height: 82,
                      decoration: BoxDecoration(
                        color: AppColor.surfaceWarm,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColor.border),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.add_a_photo_outlined,
                            color: AppColor.primary,
                            size: 24,
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Thêm',
                            style: TextStyle(
                              color: AppColor.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: SizedBox(
                      height: 82,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          ..._remoteImages.asMap().entries.map(
                            (e) => _ThumbShell(
                              onRemove: _submitting
                                  ? null
                                  : () {
                                      setState(() {
                                        _remoteImages.removeAt(e.key);
                                      });
                                    },
                              child: Image.network(e.value, fit: BoxFit.cover),
                            ),
                          ),
                          if (_remoteVideoUrl != null)
                            _ThumbShell(
                              onRemove: _submitting
                                  ? null
                                  : () {
                                      setState(() {
                                        _remoteVideoUrl = null;
                                      });
                                    },
                              child: Container(
                                color: Colors.black87,
                                alignment: Alignment.center,
                                child: const Icon(
                                  Icons.play_circle_fill_rounded,
                                  color: Colors.white,
                                  size: 28,
                                ),
                              ),
                            ),
                          ..._newImages.asMap().entries.map(
                            (e) => _ThumbShell(
                              onRemove: _submitting
                                  ? null
                                  : () {
                                      setState(() {
                                        _newImages.removeAt(e.key);
                                      });
                                    },
                              child: Image.file(e.value, fit: BoxFit.cover),
                            ),
                          ),
                          if (_newVideo != null)
                            _ThumbShell(
                              onRemove: _submitting
                                  ? null
                                  : () {
                                      setState(() {
                                        _newVideo = null;
                                      });
                                    },
                              child: Container(
                                color: Colors.black87,
                                alignment: Alignment.center,
                                child: const Icon(
                                  Icons.play_circle_fill_rounded,
                                  color: Colors.white,
                                  size: 28,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 8),
              Text(
                'Đã chọn: $_totalImageCount/9 ảnh • ${((_remoteVideoUrl != null) ? 1 : 0) + ((_newVideo != null) ? 1 : 0)}/1 video',
                style: const TextStyle(color: AppColor.textMuted, fontSize: 12),
              ),
              const SizedBox(height: 18),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _submitting
                          ? null
                          : () => Navigator.of(context).pop(false),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColor.textPrimary,
                        side: const BorderSide(color: AppColor.border),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                      ),
                      child: const Text('Huỷ'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColor.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                      ),
                      child: _submitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : Text(
                              widget.submitText,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
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

class _ThumbShell extends StatelessWidget {
  const _ThumbShell({required this.child, required this.onRemove});

  final Widget child;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 82,
      height: 82,
      margin: const EdgeInsets.only(right: 10),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: SizedBox.expand(child: child),
          ),
          Positioned(
            right: -6,
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
