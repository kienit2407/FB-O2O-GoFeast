import 'package:driver/app/theme/app_color.dart';
import 'package:driver/features/drivers/presentation/viewmodels/driver_offer_controller.dart';
import 'package:driver/features/drivers/presentation/widgets/slide_to_accept.dart';
import 'package:flutter/material.dart';

class DriverOfferBottomSheet extends StatelessWidget {
  const DriverOfferBottomSheet({
    super.key,
    required this.state,
    required this.onAccept,
    required this.onReject,
  });

  final DriverOfferState state;
  final Future<void> Function() onAccept;
  final Future<void> Function() onReject;

  String _paymentLabel(String value) {
    switch (value) {
      case 'cash':
        return 'Tiền mặt';
      case 'vnpay':
        return 'VNPay';
      case 'momo':
        return 'MoMo';
      case 'zalopay':
        return 'ZaloPay';
      default:
        return value.isEmpty ? 'Thanh toán' : value;
    }
  }

  String _money(num value) {
    final raw = value.toStringAsFixed(0);
    final out = raw.replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]}.',
    );
    return '${out}đ';
  }

  @override
  Widget build(BuildContext context) {
    final progress = (state.remainingSeconds / 20).clamp(0, 1).toDouble();

    return DraggableScrollableSheet(
      initialChildSize: 0.62,
      minChildSize: 0.36,
      maxChildSize: 0.90,
      builder: (context, scrollController) {
        return Material(
          color: AppColor.surface,
          elevation: 18,
          shadowColor: Colors.black.withOpacity(.20),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: SafeArea(
            top: false,
            child: Column(
              children: [
                const SizedBox(height: 10),
                Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: AppColor.divider,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Nhận yêu cầu mới',
                              style: const TextStyle(
                                color: AppColor.textPrimary,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: state.isSubmitting
                                ? null
                                : () => onReject(),
                            style: IconButton.styleFrom(
                              backgroundColor: AppColor.surfaceWarm,
                            ),
                            icon: const Icon(
                              Icons.close,
                              color: AppColor.textPrimary,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 14),

                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              AppColor.headerGradStart,
                              AppColor.headerGradEnd,
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 54,
                                  height: 54,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(.18),
                                    borderRadius: BorderRadius.circular(18),
                                  ),
                                  child: const Icon(
                                    Icons.storefront_rounded,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        state.merchantName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          _Badge(
                                            text: '${state.itemCount} món',
                                            bg: Colors.white.withOpacity(.18),
                                            fg: Colors.white,
                                          ),
                                          _Badge(
                                            text: _paymentLabel(
                                              state.paymentMethod,
                                            ),
                                            bg: Colors.white.withOpacity(.18),
                                            fg: Colors.white,
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Đơn #${state.orderNumber.isEmpty ? (state.orderId ?? '') : state.orderNumber}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (state.totalAmount > 0) ...[
                              const SizedBox(height: 6),
                              Text(
                                'Thu hộ ${_money(state.totalAmount)}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      _InfoCard(
                        title: 'Điểm lấy món',
                        icon: Icons.restaurant_rounded,
                        iconBg: AppColor.primaryLight,
                        iconColor: AppColor.primary,
                        child: Text(
                          state.merchantAddress,
                          style: const TextStyle(
                            fontSize: 15,
                            height: 1.4,
                            fontWeight: FontWeight.w700,
                            color: AppColor.textPrimary,
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      _InfoCard(
                        title: 'Khách nhận',
                        icon: Icons.location_on_rounded,
                        iconBg: AppColor.info.withOpacity(.10),
                        iconColor: AppColor.info,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (state.customerName.isNotEmpty)
                              Text(
                                state.customerName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: AppColor.textPrimary,
                                ),
                              ),
                            if (state.customerPhone.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                state.customerPhone,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppColor.textSecondary,
                                ),
                              ),
                            ],
                            if (state.customerAddress.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                state.customerAddress,
                                style: const TextStyle(
                                  fontSize: 14,
                                  height: 1.35,
                                  color: AppColor.textSecondary,
                                ),
                              ),
                            ],
                            if (state.orderNote.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColor.surfaceWarm,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Text(
                                  state.orderNote,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColor.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColor.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColor.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Còn ${state.remainingSeconds}s để nhận chuyến',
                              style: const TextStyle(
                                color: AppColor.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 10),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(999),
                              child: LinearProgressIndicator(
                                value: progress,
                                minHeight: 8,
                                backgroundColor: AppColor.primaryLight,
                                valueColor: const AlwaysStoppedAnimation(
                                  AppColor.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 18),

                      SlideToAccept(
                        text: 'Trượt sang phải để nhận chuyến',
                        loading: state.isSubmitting,
                        onSubmit: onAccept,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.title,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColor.border),
        boxShadow: const [
          BoxShadow(
            blurRadius: 14,
            offset: Offset(0, 6),
            color: Color(0x0C000000),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColor.textMuted,
                  ),
                ),
                const SizedBox(height: 8),
                child,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.text, required this.bg, required this.fg});

  final String text;
  final Color bg;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w700),
      ),
    );
  }
}
