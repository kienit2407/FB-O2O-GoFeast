import 'package:driver/app/theme/app_color.dart';
import 'package:driver/features/drivers/presentation/viewmodels/driver_delivery_tracking_controller.dart';
import 'package:flutter/material.dart';

class DriverOrderActionBar extends StatelessWidget {
  const DriverOrderActionBar({
    super.key,
    required this.state,
    required this.onArrived,
    required this.onPickedUp,
    required this.onStartDelivering,
    required this.onDelivered,
    required this.onTakeProofPhoto,
    required this.onAddProofFromLibrary,
    required this.onComplete,
  });

  final DriverDeliveryTrackingState state;
  final Future<void> Function() onArrived;
  final Future<void> Function() onPickedUp;
  final Future<void> Function() onStartDelivering;
  final Future<void> Function() onDelivered;
  final Future<void> Function() onTakeProofPhoto;
  final Future<void> Function() onAddProofFromLibrary;
  final Future<void> Function() onComplete;

  @override
  Widget build(BuildContext context) {
    if (state.canComplete) {
      final hasProofs = state.proofImages.isNotEmpty;

      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColor.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppColor.border),
          boxShadow: const [
            BoxShadow(
              blurRadius: 18,
              offset: Offset(0, 6),
              color: Color(0x14000000),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!hasProofs) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColor.surfaceWarm,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.camera_alt_outlined, color: AppColor.primary),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Thêm ảnh minh chứng trước khi hoàn thành đơn',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColor.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton.icon(
                  onPressed: state.isBusy ? null : () => onTakeProofPhoto(),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColor.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  icon: state.isBusy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.add_a_photo_outlined),
                  label: const Text(
                    'Thêm ảnh minh chứng',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ] else ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Ảnh minh chứng',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColor.textPrimary,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 86,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    ...state.proofImages.map(
                      (url) => Padding(
                        padding: const EdgeInsets.only(right: 10),
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColor.border),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Image.network(
                              url,
                              width: 78,
                              height: 78,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                      ),
                    ),
                    _ProofAddTile(
                      icon: Icons.add_photo_alternate_outlined,
                      label: 'Thêm ảnh',
                      onTap: state.isBusy
                          ? null
                          : () => onAddProofFromLibrary(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: state.isBusy ? null : () => onComplete(),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColor.success,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: state.isBusy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Hoàn thành đơn',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ],
          ],
        ),
      );
    }

    String? label;
    Future<void> Function()? action;
    IconData icon = Icons.check_circle_outline_rounded;

    if (state.canArriveAtMerchant) {
      label = 'Đã tới quán';
      action = onArrived;
      icon = Icons.store_mall_directory_outlined;
    } else if (state.canPickUp) {
      label = 'Đã lấy món';
      action = onPickedUp;
      icon = Icons.shopping_bag_outlined;
    } else if (state.canStartDelivering) {
      label = 'Bắt đầu giao';
      action = onStartDelivering;
      icon = Icons.delivery_dining_rounded;
    } else if (state.canDelivered) {
      label = 'Đã giao tới nơi';
      action = onDelivered;
      icon = Icons.location_on_outlined;
    }

    if (label == null || action == null) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColor.border),
        boxShadow: const [
          BoxShadow(
            blurRadius: 18,
            offset: Offset(0, 6),
            color: Color(0x14000000),
          ),
        ],
      ),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: FilledButton.icon(
          onPressed: state.isBusy ? null : () => action!(),
          style: FilledButton.styleFrom(
            backgroundColor: AppColor.primary,
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          icon: state.isBusy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Icon(icon),
          label: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}

class _ProofAddTile extends StatelessWidget {
  const _ProofAddTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 78,
        height: 78,
        decoration: BoxDecoration(
          color: AppColor.surfaceWarm,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColor.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 22, color: AppColor.primary),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColor.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
