import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:photo_view/photo_view.dart';
import 'package:video_player/video_player.dart';

class ReviewMediaEntry {
  final String url;
  final bool isVideo;

  const ReviewMediaEntry({required this.url, required this.isVideo});
}

class ReviewMediaViewerPage extends StatefulWidget {
  const ReviewMediaViewerPage({
    super.key,
    required this.items,
    required this.initialIndex,
  });

  final List<ReviewMediaEntry> items;
  final int initialIndex;

  @override
  State<ReviewMediaViewerPage> createState() => _ReviewMediaViewerPageState();
}

class _ReviewMediaViewerPageState extends State<ReviewMediaViewerPage> {
  late final PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, widget.items.length - 1);
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.items.length;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: total,
            onPageChanged: (i) {
              setState(() => _currentIndex = i);
            },
            itemBuilder: (_, i) {
              final item = widget.items[i];
              if (item.isVideo) {
                return _NetworkVideoPage(url: item.url);
              }
              return Container(
                color: Colors.black,
                alignment: Alignment.center,
                child: PhotoView(
                  imageProvider: CachedNetworkImageProvider(item.url),
                  backgroundDecoration: const BoxDecoration(
                    color: Colors.black,
                  ),
                  minScale: PhotoViewComputedScale.contained,
                  maxScale: PhotoViewComputedScale.covered * 2.5,
                  loadingBuilder: (_, __) => const Center(
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  ),
                  errorBuilder: (_, __, ___) => const Center(
                    child: Icon(
                      Icons.broken_image_outlined,
                      color: Colors.white70,
                      size: 42,
                    ),
                  ),
                ),
              );
            },
          ),

          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Container(
                height: 56,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.55),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    Expanded(
                      child: Center(
                        child: Text(
                          '${_currentIndex + 1}/$total',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NetworkVideoPage extends StatefulWidget {
  const _NetworkVideoPage({required this.url});

  final String url;

  @override
  State<_NetworkVideoPage> createState() => _NetworkVideoPageState();
}

class _NetworkVideoPageState extends State<_NetworkVideoPage> {
  VideoPlayerController? _controller;
  bool _ready = false;
  bool _showOverlay = true;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
    await controller.initialize();
    controller.setLooping(true);

    if (!mounted) {
      await controller.dispose();
      return;
    }

    setState(() {
      _controller = controller;
      _ready = true;
    });
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _togglePlay() {
    final c = _controller;
    if (c == null) return;

    if (c.value.isPlaying) {
      c.pause();
      setState(() => _showOverlay = true);
    } else {
      c.play();
      setState(() => _showOverlay = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready || _controller == null) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
      );
    }

    final c = _controller!;

    return GestureDetector(
      onTap: _togglePlay,
      child: Container(
        color: Colors.black,
        alignment: Alignment.center,
        child: Stack(
          alignment: Alignment.center,
          children: [
            AspectRatio(
              aspectRatio: c.value.aspectRatio == 0
                  ? 9 / 16
                  : c.value.aspectRatio,
              child: VideoPlayer(c),
            ),
            AnimatedOpacity(
              duration: const Duration(milliseconds: 180),
              opacity: c.value.isPlaying && !_showOverlay ? 0 : 1,
              child: Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  color: Colors.black54,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white24),
                ),
                child: Icon(
                  c.value.isPlaying
                      ? Icons.pause_rounded
                      : Icons.play_arrow_rounded,
                  color: Colors.white,
                  size: 38,
                ),
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 24,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: VideoProgressIndicator(
                  c,
                  allowScrubbing: true,
                  padding: EdgeInsets.zero,
                  colors: const VideoProgressColors(
                    playedColor: AppColor.primary,
                    bufferedColor: Colors.white24,
                    backgroundColor: Colors.white10,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
