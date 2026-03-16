import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:customer/features/promotion/data/models/promotion_models.dart';
import 'package:customer/features/promotion/presentation/viewmodels/promotion_detail_state.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class PromotionDetailPage extends ConsumerStatefulWidget {
  const PromotionDetailPage({super.key, required this.promotionId});

  final String promotionId;

  @override
  ConsumerState<PromotionDetailPage> createState() =>
      _PromotionDetailPageState();
}

class _PromotionDetailPageState extends ConsumerState<PromotionDetailPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(promotionDetailProvider(widget.promotionId).notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(promotionDetailProvider(widget.promotionId));
    final ctrl = ref.read(promotionDetailProvider(widget.promotionId).notifier);
    final auth = ref.watch(authViewModelProvider);
    final user = auth.valueOrNull;

    ref.listen<PromotionDetailState>(
      promotionDetailProvider(widget.promotionId),
      (prev, next) {
        if (next.error != null && next.error != prev?.error && mounted) {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(SnackBar(content: Text(_cleanError(next.error!))));
        }
      },
    );

    final detail = st.detail;
    final promo = detail?.promotion;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        centerTitle: true,
        title: const Text(
          'Chi tiết khuyến mãi',
          style: TextStyle(
            color: AppColor.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
        iconTheme: const IconThemeData(color: AppColor.primary),
      ),
      body: promo == null
          ? _InitialBody(
              isLoading: st.isLoading,
              error: st.error,
              onRetry: () => ctrl.load(),
            )
          : RefreshIndicator(
              onRefresh: ctrl.load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                children: [
                  _HeroCard(promotion: promo),
                  const SizedBox(height: 14),
                  _InfoCard(
                    title: 'Điều kiện áp dụng',
                    children: [
                      _InfoLine(
                        label: 'Loại ưu đãi',
                        value: _discountText(promo),
                      ),
                      _InfoLine(
                        label: 'Đơn tối thiểu',
                        value: _money(promo.minOrderAmount),
                      ),
                      _InfoLine(
                        label: 'Áp dụng cho',
                        value: _scopeText(promo.scope),
                      ),
                      _InfoLine(
                        label: 'Mức áp dụng',
                        value: _applyLevelText(promo.applyLevel),
                      ),
                      _InfoLine(
                        label: 'Hiệu lực',
                        value: _dateRangeText(promo.validFrom, promo.validTo),
                      ),
                      if (promo.allowedPaymentMethods.isNotEmpty)
                        _InfoLine(
                          label: 'Thanh toán',
                          value: promo.allowedPaymentMethods.join(', '),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  if (promo.activationType == 'auto')
                    _AutoPromotionCard(promotion: promo)
                  else
                    _VoucherSection(
                      vouchers: detail!.vouchers,
                      isLoggedIn: user != null,
                      isSaving: st.isSaving,
                      onSave: (voucher) async {
                        if (user == null) {
                          context.push('/signin');
                          return;
                        }

                        if (voucher.isSaved) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Voucher này đã được lưu'),
                            ),
                          );
                          return;
                        }

                        if (voucher.isUserLimitReached) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Bạn đã dùng hết lượt cho voucher này',
                              ),
                            ),
                          );
                          return;
                        }

                        final ok = await ctrl.saveVoucher(voucher.id);
                        if (!mounted) return;

                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              ok ? 'Đã lưu voucher' : 'Lưu voucher thất bại',
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
    );
  }
}

class _InitialBody extends StatelessWidget {
  const _InitialBody({
    required this.isLoading,
    required this.error,
    required this.onRetry,
  });

  final bool isLoading;
  final String? error;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator.adaptive());
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              error == null ? 'Không tải được khuyến mãi' : _cleanError(error!),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColor.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Tải lại',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.promotion});

  final PromotionDetail promotion;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            // height: 190,
            width: double.infinity,
            child: promotion.bannerUrl == null || promotion.bannerUrl!.isEmpty
                ? Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColor.headerGradStart,
                          AppColor.headerGradEnd,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.local_offer_rounded,
                      color: Colors.white,
                      size: 54,
                    ),
                  )
                : CachedNetworkImage(
                    imageUrl: promotion.bannerUrl!,
                    fit: BoxFit.cover,
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _Pill(
                      text: promotion.sponsor == 'platform'
                          ? 'Ưu đãi nền tảng'
                          : 'Ưu đãi quán',
                    ),
                    _Pill(
                      text: promotion.activationType == 'auto'
                          ? 'Tự áp dụng'
                          : 'Cần voucher',
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  promotion.name,
                  style: const TextStyle(
                    fontSize: 22,
                    height: 1.2,
                    fontWeight: FontWeight.w800,
                    color: AppColor.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  promotion.description.isEmpty
                      ? 'Không có mô tả'
                      : promotion.description,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: AppColor.textSecondary,
                  ),
                ),
                if ((promotion.merchantName ?? '').isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Áp dụng tại: ${promotion.merchantName}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColor.primary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: AppColor.textPrimary,
            ),
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 112,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppColor.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColor.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AutoPromotionCard extends StatelessWidget {
  const _AutoPromotionCard({required this.promotion});

  final PromotionDetail promotion;

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Cách dùng',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: AppColor.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Ưu đãi này được tự động áp khi giỏ hàng thỏa điều kiện. Bạn không cần nhập mã hay lưu voucher.',
            style: TextStyle(
              fontSize: 14,
              height: 1.5,
              color: AppColor.textSecondary,
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColor.primaryLight,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome, color: AppColor.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    promotion.userState.isUserLimitReached
                        ? 'Bạn đã chạm giới hạn sử dụng ưu đãi này.'
                        : 'Ưu đãi sẽ tự áp khi đơn đủ điều kiện.',
                    style: const TextStyle(
                      color: AppColor.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VoucherSection extends StatelessWidget {
  const _VoucherSection({
    required this.vouchers,
    required this.isLoggedIn,
    required this.isSaving,
    required this.onSave,
  });

  final List<PromotionVoucherItem> vouchers;
  final bool isLoggedIn;
  final bool isSaving;
  final Future<void> Function(PromotionVoucherItem voucher) onSave;

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Voucher khả dụng',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: AppColor.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          if (vouchers.isEmpty)
            const Text(
              'Hiện chưa có voucher khả dụng cho ưu đãi này.',
              style: TextStyle(fontSize: 14, color: AppColor.textSecondary),
            )
          else
            ...vouchers.map(
              (voucher) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _VoucherCard(
                  voucher: voucher,
                  isLoggedIn: isLoggedIn,
                  isSaving: isSaving,
                  onSave: () => onSave(voucher),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _VoucherCard extends StatelessWidget {
  const _VoucherCard({
    required this.voucher,
    required this.isLoggedIn,
    required this.isSaving,
    required this.onSave,
  });

  final PromotionVoucherItem voucher;
  final bool isLoggedIn;
  final bool isSaving;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final disabled = isSaving || voucher.isSaved || voucher.isUserLimitReached;

    final label = !isLoggedIn
        ? 'Đăng nhập để lưu'
        : voucher.isSaved
        ? 'Đã lưu'
        : voucher.isUserLimitReached
        ? 'Đã dùng hết lượt'
        : 'Lưu voucher';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBFA),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColor.primary.withOpacity(0.10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.confirmation_number_outlined,
                color: AppColor.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  voucher.code,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColor.textPrimary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: voucher.isSaved
                      ? AppColor.success.withOpacity(0.12)
                      : AppColor.primary.withOpacity(0.10),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  voucher.isSaved ? 'Đã lưu' : 'Voucher',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: voucher.isSaved
                        ? AppColor.success
                        : AppColor.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Hiệu lực: ${_dateRangeText(voucher.startDate, voucher.endDate)}',
            style: const TextStyle(fontSize: 13, color: AppColor.textSecondary),
          ),
          const SizedBox(height: 6),
          Text(
            voucher.perUserLimit > 0
                ? 'Còn ${voucher.remainingUserUses ?? 0} lượt dùng cho bạn'
                : 'Không giới hạn lượt dùng theo user',
            style: const TextStyle(fontSize: 13, color: AppColor.textSecondary),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: disabled ? null : onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: voucher.isSaved
                    ? AppColor.success
                    : AppColor.primary,
                disabledBackgroundColor: voucher.isSaved
                    ? AppColor.success
                    : Colors.grey.shade300,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      label,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: child,
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColor.primaryLight,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: AppColor.primary,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}

String _money(num v) {
  final s = v.toInt().toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (match) => '.',
  );
  return '$sđ';
}

String _discountText(PromotionDetail promo) {
  if (promo.discountType == 'percentage') {
    if (promo.maxDiscount > 0) {
      return 'Giảm ${promo.discountValue.toInt()}% (tối đa ${_money(promo.maxDiscount)})';
    }
    return 'Giảm ${promo.discountValue.toInt()}%';
  }
  return 'Giảm ${_money(promo.discountValue)}';
}

String _scopeText(String v) {
  switch (v) {
    case 'delivery':
      return 'Phí vận chuyển';
    case 'dine_in':
      return 'Ăn tại quán';
    case 'food':
    default:
      return 'Đơn món ăn';
  }
}

String _applyLevelText(String v) {
  switch (v) {
    case 'shipping':
      return 'Áp vào phí giao hàng';
    case 'product':
      return 'Áp theo sản phẩm';
    case 'category':
      return 'Áp theo danh mục';
    case 'order':
    default:
      return 'Áp theo đơn hàng';
  }
}

String _dateRangeText(String? from, String? to) {
  String f(String? v) {
    if (v == null || v.isEmpty) return '---';
    final d = DateTime.tryParse(v)?.toLocal();
    if (d == null) return '---';
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    final yy = d.year.toString();
    return '$dd/$mm/$yy';
  }

  return '${f(from)} - ${f(to)}';
}

String _cleanError(String raw) {
  return raw.replaceFirst('Exception: ', '');
}
