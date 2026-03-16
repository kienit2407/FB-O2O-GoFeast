import 'package:driver/app/theme/app_color.dart';
import 'package:driver/core/di/providers.dart';
import 'package:driver/features/drivers/presentation/viewmodels/driver_delivery_tracking_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CurrentOrderPage extends ConsumerStatefulWidget {
  const CurrentOrderPage({
    super.key,
    required this.orderId,
    this.orderNumber,
    required this.initialStatus,
    required this.merchantName,
    this.merchantAddress = '',
    this.customerName = '',
    this.customerPhone = '',
    this.customerAddress = '',
  });

  final String orderId;
  final String? orderNumber;
  final String initialStatus;
  final String merchantName;
  final String merchantAddress;
  final String customerName;
  final String customerPhone;
  final String customerAddress;

  @override
  ConsumerState<CurrentOrderPage> createState() => _CurrentOrderPageState();
}

class _CurrentOrderPageState extends ConsumerState<CurrentOrderPage> {
  late final DriverDeliveryTrackingController _trackingCtrl;

  @override
  void initState() {
    super.initState();
    _trackingCtrl = ref.read(driverDeliveryTrackingControllerProvider.notifier);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _trackingCtrl.bindOrder(
        orderId: widget.orderId,
        orderNumber: widget.orderNumber,
        initialStatus: widget.initialStatus,
        merchantName: widget.merchantName,
        merchantAddress: widget.merchantAddress,
        customerName: widget.customerName,
        customerPhone: widget.customerPhone,
        customerAddress: widget.customerAddress,
      );
    });
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
        return value.isEmpty ? '—' : value;
    }
  }

  Color _statusBg(String value) {
    switch (value) {
      case 'picked_up':
      case 'delivering':
        return AppColor.info.withOpacity(.10);
      case 'delivered':
      case 'completed':
        return AppColor.success.withOpacity(.10);
      case 'driver_arrived':
      case 'ready_for_pickup':
        return AppColor.warning.withOpacity(.14);
      default:
        return AppColor.primaryLight;
    }
  }

  Color _statusFg(String value) {
    switch (value) {
      case 'picked_up':
      case 'delivering':
        return AppColor.info;
      case 'delivered':
      case 'completed':
        return AppColor.success;
      case 'driver_arrived':
      case 'ready_for_pickup':
        return const Color(0xFFB45309);
      default:
        return AppColor.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(driverDeliveryTrackingControllerProvider);

    final orderCode = state.orderNumber == null || state.orderNumber!.isEmpty
        ? (state.orderId ?? '—')
        : state.orderNumber!;

    return Scaffold(
      backgroundColor: AppColor.background,
      appBar: AppBar(
        title: const Text(
          'Chi tiết đơn hàng',
          style: TextStyle(
            color: AppColor.textPrimary,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
        backgroundColor: AppColor.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: AppColor.textPrimary),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColor.headerGradStart, AppColor.headerGradEnd],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(
                  blurRadius: 18,
                  offset: Offset(0, 8),
                  color: Color(0x1F000000),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Đơn hiện tại',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '#$orderCode',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(.18),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    _statusLabel(state.status),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          _SectionCard(
            icon: Icons.local_shipping_outlined,
            iconBg: _statusBg(state.status),
            iconColor: _statusFg(state.status),
            title: 'Trạng thái đơn',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoLine(label: 'Mã đơn', value: orderCode),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: _statusBg(state.status),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    _statusLabel(state.status),
                    style: TextStyle(
                      color: _statusFg(state.status),
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          _SectionCard(
            icon: Icons.storefront_outlined,
            iconBg: AppColor.primaryLight,
            iconColor: AppColor.primary,
            title: 'Thông tin quán',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  state.merchantName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: AppColor.textPrimary,
                  ),
                ),
                if (state.merchantAddress.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    state.merchantAddress,
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

          _SectionCard(
            icon: Icons.person_outline_rounded,
            iconBg: AppColor.info.withOpacity(.10),
            iconColor: AppColor.info,
            title: 'Thông tin khách',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (state.customerName.isNotEmpty)
                  Text(
                    state.customerName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      color: AppColor.textPrimary,
                    ),
                  ),
                if (state.customerPhone.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    state.customerPhone,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColor.textSecondary,
                    ),
                  ),
                ],
                if (state.customerAddress.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    state.customerAddress,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.35,
                      color: AppColor.textSecondary,
                    ),
                  ),
                ],
                if (state.customerName.isEmpty &&
                    state.customerPhone.isEmpty &&
                    state.customerAddress.isEmpty)
                  const Text(
                    'Chưa có thông tin khách hàng',
                    style: TextStyle(color: AppColor.textMuted, fontSize: 14),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          _SectionCard(
            icon: Icons.photo_library_outlined,
            iconBg: AppColor.success.withOpacity(.10),
            iconColor: AppColor.success,
            title: 'Ảnh minh chứng',
            child: state.proofImages.isEmpty
                ? Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 16,
                    ),
                    decoration: BoxDecoration(
                      color: AppColor.surfaceWarm,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Text(
                      'Chưa có ảnh minh chứng',
                      style: TextStyle(
                        color: AppColor.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                : SizedBox(
                    height: 98,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: state.proofImages.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (_, index) {
                        final url = state.proofImages[index];
                        return Container(
                          width: 98,
                          height: 98,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColor.border),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Image.network(
                              url,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: AppColor.surfaceWarm,
                                alignment: Alignment.center,
                                child: const Icon(
                                  Icons.broken_image_outlined,
                                  color: AppColor.textMuted,
                                ),
                              ),
                            ),
                          ),
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
        borderRadius: BorderRadius.circular(22),
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
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppColor.textMuted,
                  ),
                ),
                const SizedBox(height: 10),
                child,
              ],
            ),
          ),
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
    return Row(
      children: [
        Text(
          '$label: ',
          style: const TextStyle(
            color: AppColor.textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              color: AppColor.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}
