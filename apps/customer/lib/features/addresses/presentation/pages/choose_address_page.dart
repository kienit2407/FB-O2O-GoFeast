import 'dart:ui';

import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/core/services/location_service.dart';
import 'package:customer/features/addresses/data/models/choose_address_result.dart';
import 'package:customer/features/addresses/data/models/search_place_models.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:lottie/lottie.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

// Model reverse của bạn (đổi đúng path nếu bạn để chỗ khác)
import 'package:customer/features/addresses/data/models/reverse_suggest_models.dart';

class ChooseAddressPage extends ConsumerStatefulWidget {
  const ChooseAddressPage({super.key});

  @override
  ConsumerState<ChooseAddressPage> createState() => _ChooseAddressPageState();
}

class _ChooseAddressPageState extends ConsumerState<ChooseAddressPage> {
  MapLibreMapController? _map;
  bool _didAutoGoGps = false;
  static const String _styleUrl =
      'https://maps.track-asia.com/styles/v2/streets.json?key=56f5e4e349d7d86b7dec17705331965eec';

  CameraPosition _lastCameraPos = const CameraPosition(
    target: LatLng(10.7769, 106.7009),
    zoom: 14,
  );

  bool _didInitReverse = false;
  bool _revealMap = false;
  bool _coverGone = false; // remove overlay sau khi fade xong
  double _coverOpacity = 1.0;

  @override
  void dispose() {
    super.dispose();
  }

  (String, String) _splitByFirstComma(String input) {
    final s = input.trim();
    if (s.isEmpty) return ('', '');
    final idx = s.indexOf(',');
    if (idx < 0) return (s, '');
    return (s.substring(0, idx).trim(), s.substring(idx + 1).trim());
  }

  void _hideCover() {
    if (_coverGone) return;
    setState(() => _coverOpacity = 0.0);
  }

  void _showMap() {
    if (_revealMap) return;
    setState(() => _revealMap = true);
  }

  void _reverseAt(double lat, double lng) {
    debugPrint('[reverseAt] lat=$lat lng=$lng');
    ref.read(chooseAddressControllerProvider.notifier).setCenter(lat, lng);
  }

  Future<void> _goToMyLocation() async {
    try {
      final loc = ref.read(locationServiceProvider);
      final pos = await loc.getCurrentLocation(); // {lat,lng}

      if (!mounted) return;

      // move camera (an toàn: try/catch)
      try {
        await _map?.animateCamera(
          CameraUpdate.newLatLngZoom(LatLng(pos.lat, pos.lng), 16),
        );
      } catch (_) {}
      _lastCameraPos = CameraPosition(
        target: LatLng(pos.lat, pos.lng),
        zoom: 16,
      );

      // gọi reverse luôn (khỏi chờ cameraIdle)
      _reverseAt(pos.lat, pos.lng);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không lấy được vị trí hiện tại')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chooseAddressControllerProvider);

    // ✅ map suggestions từ reverse -> _PlaceItem
    final items = state.suggestions.map((e) {
      final name = (e.name ?? '').trim();
      if (name.isNotEmpty) {
        return _PlaceItem(title: name, subtitle: e.address, raw: e);
      }
      final (t, sub) = _splitByFirstComma(e.address);
      return _PlaceItem(
        title: t.isNotEmpty ? t : e.address,
        subtitle: sub.isNotEmpty ? sub : e.address,
        raw: e,
      );
    }).toList();

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: true,
        leading: IconButton(
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Iconsax.arrow_left_copy),
          color: AppColor.primary,
        ),
        title: const Text(
          'Chọn địa chỉ',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: Color(0xFF111827),
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _SearchBox(
                  hintText: 'Tìm vị trí',
                  onTap: () async {
                    final picked = await context.push<SearchPlaceItem>(
                      '/address/search',
                    );

                    if (picked == null) return;

                    // build address string
                    final addressStr = picked.subtitle.trim().isNotEmpty
                        ? '${picked.title}, ${picked.subtitle}'
                        : picked.title;

                    if (!context.mounted) return;

                    //  Trả kết quả về AddAddressPage
                    Navigator.of(context).pop(
                      ChooseAddressResult(
                        address: addressStr,
                        lat: picked.lat ?? 0,
                        lng: picked.lng ?? 0,
                        name: picked.title,
                      ),
                    );
                  },
                ),
              ),
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: state.isLoading
                    ? const LinearProgressIndicator(minHeight: 1, color: AppColor.primary, backgroundColor: AppColor.background,)
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          Positioned.fill(
            child: MapLibreMap(
              styleString: _styleUrl,
              initialCameraPosition: _lastCameraPos,

              onMapCreated: (c) {
                _map = c;
              },
              gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
                Factory<OneSequenceGestureRecognizer>(
                  () => EagerGestureRecognizer(),
                ),
              },
              onStyleLoadedCallback: () async {
                if (_didInitReverse) return;
                _didInitReverse = true;

                //  Auto jump về GPS 1 lần (an toàn: sau style loaded)
                if (!_didAutoGoGps) {
                  _didAutoGoGps = true;
                  try {
                    final loc = ref.read(locationServiceProvider);
                    final pos = await loc
                        .getCurrentLocation(); // có thể throw nếu chưa permission

                    if (!mounted) return;

                    // move camera về GPS
                    try {
                      await _map?.animateCamera(
                        CameraUpdate.newLatLngZoom(
                          LatLng(pos.lat, pos.lng),
                          16,
                        ),
                      );
                    } catch (_) {}
                    _lastCameraPos = CameraPosition(
                      target: LatLng(pos.lat, pos.lng),
                      zoom: 16,
                    );
                    // reverse ngay tại GPS (khỏi chờ camera idle)
                    _reverseAt(pos.lat, pos.lng);
                    await Future.delayed(const Duration(milliseconds: 180));
                    if (mounted) _hideCover();
                    return;
                  } catch (_) {
                    // ignore: không có quyền / không lấy được GPS -> fallback reverse center hiện tại
                  }
                  final center = _lastCameraPos.target;
                  _reverseAt(center.latitude, center.longitude);

                  await Future.delayed(const Duration(milliseconds: 120));
                  if (mounted) _hideCover();
                }

                // fallback: reverse tại center hiện tại
                final center = _lastCameraPos.target;
                _reverseAt(center.latitude, center.longitude);
              },

              onCameraIdle: () async {
                // lấy center thật sự từ map (không phụ thuộc _lastCameraPos)
                try {
                  final bounds = await _map?.getVisibleRegion();
                  if (bounds == null) return;

                  final center = LatLng(
                    (bounds.northeast.latitude + bounds.southwest.latitude) / 2,
                    (bounds.northeast.longitude + bounds.southwest.longitude) /
                        2,
                  );

                  _reverseAt(
                    center.latitude,
                    center.longitude,
                  ); // có debugPrint ở đây
                } catch (_) {}
              },

              // onCameraIdle: () {
              //   final center = _lastCameraPos.target;
              //   _reverseAt(center.latitude, center.longitude);
              // },
              compassEnabled: false,
              rotateGesturesEnabled: false,
              tiltGesturesEnabled: false,
              myLocationEnabled: false,
              myLocationTrackingMode: MyLocationTrackingMode.none, // 0.25.0 ✅
            ),
          ),

          const Center(child: _CenterPin()),
          if (!_coverGone)
            Positioned.fill(
              child: AnimatedOpacity(
                opacity: _coverOpacity,
                duration: const Duration(milliseconds: 260),
                curve: Curves.easeOut,
                onEnd: () {
                  if (!mounted) return;
                  if (_coverOpacity == 0.0) setState(() => _coverGone = true);
                },
                child: ColoredBox(
                  color: Colors.white,
                  child: Center(
                    child: SizedBox(
                      width: 100,
                      height: 100,
                      child: Lottie.asset(
                        'assets/icons/location_seeking.json',
                        delegates: LottieDelegates(
                          values: [
                            ValueDelegate.color(const ['**']),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          // ✅ Nút định vị (đưa pin về GPS)
          Positioned(
            right: 16,
            bottom: 210, // nằm trên sheet
            child: _LocateButton(
              loading: state.isLoading, // optional: show loading
              onTap: _goToMyLocation,
            ),
          ),

          // ✅ GIỮ NGUYÊN bottom sheet của bạn — chỉ đổi items -> từ reverse
          DraggableScrollableSheet(
            initialChildSize: 0.20,
            minChildSize: 0.18,
            maxChildSize: 0.62,
            snap: true,
            snapSizes: const [0.30, 0.62],
            builder: (context, scrollController) {
              return _SuggestionSheet(
                scrollController: scrollController,
                items: items,
                onTapItem: (item) {
                  final raw = item.raw; // ReverseSuggestItem
                  final lat =
                      raw.lat ?? state.lat ?? _lastCameraPos.target.latitude;
                  final lng =
                      raw.lng ?? state.lng ?? _lastCameraPos.target.longitude;

                  Navigator.of(context).pop(
                    ChooseAddressResult(
                      address: raw.address,
                      lat: lat,
                      lng: lng,
                      name: raw.name,
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}

// ===================== Widgets (GIỮ NGUYÊN UI) =====================

class _LocateButton extends StatelessWidget {
  const _LocateButton({required this.onTap, this.loading = false});

  final VoidCallback onTap;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 6,
      shadowColor: Colors.black.withOpacity(0.12),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: loading ? null : onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 44,
          height: 44,
          child: Center(
            child: loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(
                    Icons.my_location,
                    color: Color(0xFF111827),
                    size: 22,
                  ),
          ),
        ),
      ),
    );
  }
}

class _SearchBox extends StatelessWidget {
  const _SearchBox({required this.hintText, required this.onTap});

  final String hintText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFF1F3F5),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          height: 44,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                const Icon(Icons.search, color: Color(0xFF9CA3AF), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    hintText,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF9CA3AF),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SuggestionSheet extends StatelessWidget {
  const _SuggestionSheet({
    required this.scrollController,
    required this.items,
    required this.onTapItem,
  });

  final ScrollController scrollController;
  final List<_PlaceItem> items;
  final ValueChanged<_PlaceItem> onTapItem;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.96),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.10),
                blurRadius: 18,
                offset: const Offset(0, -10),
              ),
            ],
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              const SizedBox(height: 10),
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, 5),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Địa chỉ gợi ý',
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: ListView.separated(
                  controller: scrollController,
                  itemCount: items.length,
                  padding: EdgeInsets.zero,
                  primary: false,
                  separatorBuilder: (_, __) => const Divider(
                    height: 1,
                    thickness: 1,
                    color: Color(0xFFF1F3F5),
                  ),
                  itemBuilder: (context, i) {
                    final item = items[i];
                    return InkWell(
                      onTap: () => onTapItem(item),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 2),
                              child: Icon(
                                Icons.location_on_outlined,
                                size: 22,
                                color: Color(0xFF111827),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.title,
                                    style: const TextStyle(
                                      fontSize: 15.5,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF111827),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item.subtitle,
                                    style: const TextStyle(
                                      fontSize: 13.5,
                                      height: 1.25,
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class _CenterPin extends StatelessWidget {
  const _CenterPin();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColor.primary.withOpacity(0.12),
            ),
            child: Center(
              child: Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                ),
                child: const Icon(Icons.person, color: AppColor.primary),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Container(
            width: 10,
            height: 10,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppColor.primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _PlaceItem {
  final String title;
  final String subtitle;

  // giữ để sau này bạn pop kết quả
  final ReverseSuggestItem raw;

  const _PlaceItem({
    required this.title,
    required this.subtitle,
    required this.raw,
  });
}
