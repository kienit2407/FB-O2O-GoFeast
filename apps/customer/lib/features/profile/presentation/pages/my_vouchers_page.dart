import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:customer/features/promotion/data/models/promotion_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class MyVouchersPage extends ConsumerStatefulWidget {
  const MyVouchersPage({super.key});

  @override
  ConsumerState<MyVouchersPage> createState() => _MyVouchersPageState();
}

class _MyVouchersPageState extends ConsumerState<MyVouchersPage> {
  late final ScrollController _scrollCtrl;
  bool _bootstrapped = false;

  @override
  void initState() {
    super.initState();
    _scrollCtrl = ScrollController()..addListener(_onScroll);
  }

  void _onScroll() {
    if (!_scrollCtrl.hasClients) return;
    final pos = _scrollCtrl.position;
    if (pos.pixels >= pos.maxScrollExtent - 240) {
      ref.read(myVouchersProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authViewModelProvider);
    final user = auth.valueOrNull;
    final st = ref.watch(myVouchersProvider);

    if (auth.isLoading && user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator.adaptive()),
      );
    }

    if (user == null) {
      _bootstrapped = false;
      return Scaffold(
        appBar: AppBar(
          title: const Text(
            'Ví Voucher',
            style: TextStyle(color: AppColor.primary),
          ),
          centerTitle: true,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.confirmation_number_outlined,
                  size: 88,
                  color: AppColor.primary,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Đăng nhập để xem voucher đã lưu',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColor.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Bạn cần đăng nhập để quản lý voucher đã lưu và dùng nhanh khi checkout.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: AppColor.textSecondary,
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => context.push('/signin'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColor.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Đăng nhập',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!_bootstrapped) {
      _bootstrapped = true;
      Future.microtask(() {
        ref.read(myVouchersProvider.notifier).loadInitial();
      });
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        centerTitle: true,
        title: const Text(
          'Ví Voucher',
          style: TextStyle(
            color: AppColor.primary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(myVouchersProvider.notifier).refresh(),
        child: st.isLoading
            ? const Center(child: CircularProgressIndicator.adaptive())
            : st.items.isEmpty
            ? ListView(
                children: const [
                  SizedBox(height: 140),
                  Icon(
                    Icons.confirmation_number_outlined,
                    size: 82,
                    color: AppColor.primary,
                  ),
                  SizedBox(height: 18),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 30),
                    child: Text(
                      'Bạn chưa lưu voucher nào',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        color: AppColor.textPrimary,
                      ),
                    ),
                  ),
                  SizedBox(height: 8),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 30),
                    child: Text(
                      'Các voucher bạn lưu sẽ hiện ở đây. Voucher hết hạn hoặc đã dùng hết lượt sẽ tự ẩn.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: AppColor.textSecondary,
                      ),
                    ),
                  ),
                ],
              )
            : ListView.separated(
                controller: _scrollCtrl,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                itemCount: st.items.length + (st.isLoadingMore ? 1 : 0),
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, index) {
                  if (index >= st.items.length) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Center(
                        child: CircularProgressIndicator.adaptive(),
                      ),
                    );
                  }

                  final item = st.items[index];
                  return _SavedVoucherCard(item: item);
                },
              ),
      ),
    );
  }
}

class _SavedVoucherCard extends StatelessWidget {
  const _SavedVoucherCard({required this.item});

  final SavedVoucherItem item;

  @override
  Widget build(BuildContext context) {
    final expireText = _formatDate(item.validTo ?? item.voucherEndDate);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF0F1F5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => context.push('/promotion/${item.promotionId}'),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _VoucherBanner(item: item),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          _MiniBadge(
                            text: item.sponsor == 'platform'
                                ? 'Nền tảng'
                                : 'Của quán',
                          ),
                          _MiniBadge(text: item.voucherCode),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        item.promotionName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 16,
                          height: 1.25,
                          fontWeight: FontWeight.w800,
                          color: AppColor.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _savedVoucherSubtitle(item),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.4,
                          color: AppColor.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _VoucherInfoChip(
                            icon: Icons.storefront_outlined,
                            text: item.merchantName?.isNotEmpty == true
                                ? item.merchantName!
                                : 'Áp dụng toàn hệ thống',
                            color: AppColor.primary,
                            bgColor: AppColor.primaryLight,
                          ),
                          if (expireText != null)
                            _VoucherInfoChip(
                              icon: Icons.schedule_outlined,
                              text: 'HSD $expireText',
                              color: const Color(0xFF8A5A00),
                              bgColor: const Color(0xFFFFF4D6),
                            ),
                        ],
                      ),
                    ],
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

class _VoucherBanner extends StatelessWidget {
  const _VoucherBanner({required this.item});

  final SavedVoucherItem item;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        width: 84,
        height: 104,
        child: item.bannerUrl == null || item.bannerUrl!.isEmpty
            ? Container(
                color: AppColor.primaryLight,
                alignment: Alignment.center,
                child: const Icon(
                  Icons.local_offer_rounded,
                  size: 34,
                  color: AppColor.primary,
                ),
              )
            : CachedNetworkImage(
                imageUrl: item.bannerUrl!,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(
                  color: const Color(0xFFF3F4F7),
                  alignment: Alignment.center,
                  child: const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
                errorWidget: (_, __, ___) => Container(
                  color: AppColor.primaryLight,
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.local_offer_rounded,
                    size: 34,
                    color: AppColor.primary,
                  ),
                ),
              ),
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEEE7),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          height: 1.1,
          color: AppColor.primary,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _VoucherInfoChip extends StatelessWidget {
  const _VoucherInfoChip({
    required this.icon,
    required this.text,
    required this.color,
    required this.bgColor,
  });

  final IconData icon;
  final String text;
  final Color color;
  final Color bgColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 28),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String? _formatDate(String? iso) {
  if (iso == null || iso.trim().isEmpty) return null;
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return null;

  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(dt.day)}/${two(dt.month)}/${dt.year}';
}


String _savedVoucherSubtitle(SavedVoucherItem item) {
  final discount = item.discountType == 'percentage'
      ? item.maxDiscount > 0
            ? 'Giảm ${item.discountValue.toInt()}% tối đa ${_money(item.maxDiscount)}'
            : 'Giảm ${item.discountValue.toInt()}%'
      : 'Giảm ${_money(item.discountValue)}';

  final minOrder = item.minOrderAmount > 0
      ? ' • Đơn từ ${_money(item.minOrderAmount)}'
      : '';

  final remain = item.remainingUserUses != null
      ? ' • Còn ${item.remainingUserUses} lượt'
      : '';

  return '$discount$minOrder$remain';
}

String _money(num v) {
  final s = v.toInt().toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (match) => '.',
  );
  return '$sđ';
}
