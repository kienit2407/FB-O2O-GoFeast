import 'package:driver/app/theme/app_color.dart';
import 'package:driver/features/drivers/presentation/viewmodels/driver_delivery_tracking_controller.dart';
import 'package:driver/features/drivers/presentation/widgets/driver_order_action_bar.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class DriverCurrentJobSheet extends StatelessWidget {
  const DriverCurrentJobSheet({
    super.key,
    required this.order,
    required this.onViewDetail,
    required this.trackingState,
    required this.onArrived,
    required this.onPickedUp,
    required this.onStartDelivering,
    required this.onDelivered,
    required this.onTakeProofPhoto,
    required this.onAddProofFromLibrary,
    required this.onComplete,
  });

  final Map<String, dynamic> order;
  final VoidCallback onViewDetail;

  final DriverDeliveryTrackingState trackingState;
  final Future<void> Function() onArrived;
  final Future<void> Function() onPickedUp;
  final Future<void> Function() onStartDelivering;
  final Future<void> Function() onDelivered;
  final Future<void> Function() onTakeProofPhoto;
  final Future<void> Function() onAddProofFromLibrary;
  final Future<void> Function() onComplete;

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

  String _statusLabel(String value) {
    switch (value) {
      case 'driver_assigned':
        return 'Đã nhận chuyến';
      case 'confirmed':
        return 'Quán đã xác nhận';
      case 'preparing':
        return 'Quán đang chuẩn bị';
      case 'ready_for_pickup':
        return 'Sẵn sàng lấy món';
      case 'driver_arrived':
        return 'Đã tới quán';
      case 'picked_up':
        return 'Đã lấy món';
      case 'delivering':
        return 'Đang giao';
      case 'delivered':
        return 'Đã giao tới nơi';
      case 'completed':
        return 'Hoàn tất';
      default:
        return value;
    }
  }

  String _sheetTitle(String value) {
    switch (value) {
      case 'driver_assigned':
      case 'confirmed':
      case 'preparing':
      case 'ready_for_pickup':
      case 'driver_arrived':
        return 'Đến điểm lấy món';
      case 'picked_up':
      case 'delivering':
        return 'Đang giao đơn';
      case 'delivered':
        return 'Đã giao tới nơi';
      case 'completed':
        return 'Đơn đã hoàn tất';
      default:
        return 'Đơn hiện tại';
    }
  }

  num _numValue(dynamic value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _money(num value) {
    final raw = value.toStringAsFixed(0);
    final out = raw.replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]}.',
    );
    return '${out}đ';
  }

  bool _isGoingToCustomer(String status) {
    return const [
      'picked_up',
      'delivering',
      'delivered',
      'completed',
    ].contains(status);
  }

  Color _statusBg(String status) {
    switch (status) {
      case 'picked_up':
      case 'delivering':
        return AppColor.info.withOpacity(.10);
      case 'delivered':
      case 'completed':
        return AppColor.success.withOpacity(.10);
      default:
        return AppColor.warning.withOpacity(.14);
    }
  }

  Color _statusFg(String status) {
    switch (status) {
      case 'picked_up':
      case 'delivering':
        return AppColor.info;
      case 'delivered':
      case 'completed':
        return AppColor.success;
      default:
        return const Color(0xFFB45309);
    }
  }

  Future<void> _openDirections(BuildContext context) async {
    final status = order['status']?.toString() ?? '';
    final goingToCustomer = _isGoingToCustomer(status);

    final lat = goingToCustomer
        ? _numValue(order['customerLat']).toDouble()
        : _numValue(order['merchantLat']).toDouble();

    final lng = goingToCustomer
        ? _numValue(order['customerLng']).toDouble()
        : _numValue(order['merchantLng']).toDouble();

    final address = goingToCustomer
        ? order['customerAddress']?.toString() ?? ''
        : order['merchantAddress']?.toString() ?? '';

    if (lat == 0 || lng == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không có tọa độ để chỉ đường')),
      );
      return;
    }

    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving',
    );

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);

    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            address.isNotEmpty
                ? 'Không mở được Google Maps tới $address'
                : 'Không mở được Google Maps',
          ),
        ),
      );
    }
  }

  Future<void> _callCustomer(BuildContext context) async {
    final rawPhone = order['customerPhone']?.toString() ?? '';

    final phone = rawPhone.replaceAll(RegExp(r'[^\d+]'), '');
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không có số điện thoại khách hàng')),
      );
      return;
    }

    final uri = Uri(scheme: 'tel', path: phone);

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);

    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Không thể mở cuộc gọi tới $phone')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = order['status']?.toString() ?? '';
    final merchantName = order['merchantName']?.toString() ?? '';
    final merchantAddress = order['merchantAddress']?.toString() ?? '';
    final customerName = order['customerName']?.toString() ?? '';
    final customerPhone = order['customerPhone']?.toString() ?? '';
    final customerAddress = order['customerAddress']?.toString() ?? '';
    final paymentMethod = order['paymentMethod']?.toString() ?? '';
    final totalAmount = _numValue(order['totalAmount']);
    final itemCount = _numValue(order['itemCount']).toInt();
    final orderNumber = order['orderNumber']?.toString() ?? '';
    final etaMin = _numValue(order['etaMin']).toInt();
    final goingToCustomer = _isGoingToCustomer(status);

    return DraggableScrollableSheet(
      initialChildSize: 0.45,
      minChildSize: 0.12,
      maxChildSize: 0.86,
      builder: (context, scrollController) {
        return Material(
          color: AppColor.surface,
          elevation: 18,
          shadowColor: Colors.black.withOpacity(.18),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: ListView(
            controller: scrollController,
            padding: EdgeInsets.fromLTRB(
              16,
              10,
              16,
              MediaQuery.paddingOf(context).bottom + 16,
            ),
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: AppColor.divider,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      _sheetTitle(status),
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColor.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton.tonalIcon(
                    onPressed: () => _openDirections(context),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColor.primaryLight,
                      foregroundColor: AppColor.primary,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    icon: const Icon(Icons.navigation_rounded, size: 18),
                    label: Text(
                      goingToCustomer ? 'Đi giao' : 'Đi lấy món',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              Row(
                children: [
                  if (orderNumber.isNotEmpty)
                    Expanded(
                      child: Text(
                        'Đơn #$orderNumber',
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColor.textSecondary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: _statusBg(status),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      _statusLabel(status),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: _statusFg(status),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              _SectionCard(
                icon: Icons.storefront_rounded,
                iconBg: AppColor.primaryLight,
                iconColor: AppColor.primary,
                title: 'Điểm lấy món',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      merchantName,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: AppColor.textPrimary,
                      ),
                    ),
                    if (merchantAddress.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        merchantAddress,
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.35,
                          color: AppColor.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 12),

              if (customerName.isNotEmpty ||
                  customerPhone.isNotEmpty ||
                  customerAddress.isNotEmpty)
                _SectionCard(
                  icon: Icons.location_on_rounded,
                  iconBg: AppColor.info.withOpacity(.10),
                  iconColor: AppColor.info,
                  title: 'Khách nhận',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (customerName.isNotEmpty)
                        Text(
                          customerName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColor.textPrimary,
                          ),
                        ),
                      if (customerPhone.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          customerPhone,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColor.textSecondary,
                          ),
                        ),
                      ],
                      if (customerAddress.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          customerAddress,
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.35,
                            color: AppColor.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

              const SizedBox(height: 12),

              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (itemCount > 0)
                    _Chip(
                      text: '$itemCount món',
                      bg: AppColor.primaryLight,
                      fg: AppColor.primary,
                    ),
                  if (paymentMethod.isNotEmpty)
                    _Chip(
                      text: _paymentLabel(paymentMethod),
                      bg: AppColor.info.withOpacity(.10),
                      fg: AppColor.info,
                    ),
                  if (totalAmount > 0)
                    _Chip(
                      text: _money(totalAmount),
                      bg: AppColor.success.withOpacity(.10),
                      fg: AppColor.success,
                    ),
                  if (etaMin > 0)
                    _Chip(
                      text: 'ETA ~ $etaMin phút',
                      bg: AppColor.warning.withOpacity(.14),
                      fg: const Color(0xFFB45309),
                    ),
                ],
              ),

              const SizedBox(height: 18),

              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: OutlinedButton.icon(
                        onPressed: customerPhone.trim().isEmpty
                            ? null
                            : () => _callCustomer(context),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColor.textPrimary,
                          side: BorderSide(
                            color: customerPhone.trim().isEmpty
                                ? AppColor.border
                                : AppColor.primary.withOpacity(.25),
                          ),
                          backgroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        icon: Icon(
                          Icons.phone_in_talk_rounded,
                          color: customerPhone.trim().isEmpty
                              ? AppColor.textMuted
                              : AppColor.primary,
                          size: 18,
                        ),
                        label: Text(
                          'Gọi khách',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: customerPhone.trim().isEmpty
                                ? AppColor.textMuted
                                : AppColor.textPrimary,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: FilledButton.icon(
                        onPressed: onViewDetail,
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColor.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        icon: const Icon(Icons.more_horiz_rounded, size: 18),
                        label: const Text(
                          'Chi tiết',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              DriverOrderActionBar(
                state: trackingState,
                onArrived: onArrived,
                onPickedUp: onPickedUp,
                onStartDelivering: onStartDelivering,
                onDelivered: onDelivered,
                onTakeProofPhoto: onTakeProofPhoto,
                onAddProofFromLibrary: onAddProofFromLibrary,
                onComplete: onComplete,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.child,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColor.border),
        boxShadow: const [
          BoxShadow(
            blurRadius: 14,
            offset: Offset(0, 6),
            color: Color(0x0D000000),
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

class _Chip extends StatelessWidget {
  const _Chip({required this.text, required this.bg, required this.fg});

  final String text;
  final Color bg;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}
