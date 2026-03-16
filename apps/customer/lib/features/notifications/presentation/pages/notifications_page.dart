import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:customer/features/notifications/data/models/active_platform_promotion_models.dart';
import 'package:customer/features/notifications/data/models/notification_models.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  late final ScrollController _scrollCtrl;
  bool _bootstrapped = false;
  @override
  void initState() {
    super.initState();
    _scrollCtrl = ScrollController()..addListener(_onScroll);
    Future.microtask(() {
      final user = ref.read(authViewModelProvider).valueOrNull;
      if (user == null) return;

      _bootstrapped = true;
      ref.read(notificationControllerProvider.notifier).bootstrap();
    });
  }

  void _onScroll() {
    if (!_scrollCtrl.hasClients) return;
    final pos = _scrollCtrl.position;
    if (pos.pixels >= pos.maxScrollExtent - 220) {
      ref.read(notificationControllerProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scrollCtrl.removeListener(_onScroll);
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<bool> _showDeleteConfirm({
    required String title,
    required String message,
    required String confirmText,
  }) async {
    final result = await showCupertinoDialog<bool>(
      context: context,
      builder: (_) => CupertinoAlertDialog(
        title: Text(title),
        content: Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(message),
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(
              'Huỷ',
              style: TextStyle(
                color: CupertinoColors.activeBlue.resolveFrom(context),
              ),
            ),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(
              confirmText,
              style: TextStyle(
                color: CupertinoColors.destructiveRed.resolveFrom(context),
              ),
            ),
          ),
        ],
      ),
    );

    return result == true;
  }

  Future<void> _confirmDeleteOne(AppNotificationItem item) async {
    final ok = await _showDeleteConfirm(
      title: 'Xoá thông báo',
      message: 'Bạn có chắc muốn xoá thông báo này không?',
      confirmText: 'Xoá',
    );

    if (!ok) return;

    final success = await ref
        .read(notificationControllerProvider.notifier)
        .deleteOne(item.id);

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Đã xoá thông báo' : 'Xoá thông báo thất bại'),
      ),
    );
  }

  Future<void> _confirmClearAll() async {
    final ok = await _showDeleteConfirm(
      title: 'Xoá tất cả',
      message: 'Bạn có chắc muốn xoá toàn bộ thông báo không?',
      confirmText: 'Xoá tất cả',
    );

    if (!ok) return;

    final success = await ref
        .read(notificationControllerProvider.notifier)
        .clearAll();

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success ? 'Đã xoá tất cả thông báo' : 'Xoá tất cả thất bại',
        ),
      ),
    );
  }

  Future<void> _handleTap(AppNotificationItem item) async {
    await ref.read(notificationControllerProvider.notifier).markRead(item.id);

    if (!mounted) return;

    if (item.type == AppNotificationType.promotion &&
        (item.data.promotionId?.isNotEmpty ?? false)) {
      context.push('/promotion/${item.data.promotionId}');
      return;
    }

    if (item.type == AppNotificationType.reviewReplied) {
      if (item.data.reviewType == 'product' &&
          (item.data.productId?.isNotEmpty ?? false)) {
        context.push(
          '/product/${item.data.productId}',
          extra: {'merchantId': item.data.merchantId},
        );
        return;
      }

      if (item.data.reviewType == 'merchant' &&
          (item.data.merchantId?.isNotEmpty ?? false)) {
        context.push(
          '/merchant/${item.data.merchantId}',
          extra: {'lat': 0.0, 'lng': 0.0},
        );
        return;
      }
    }

    if (item.data.orderId?.isNotEmpty ?? false) {
      context.push('/orders/${item.data.orderId}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(notificationControllerProvider);
    final ctrl = ref.read(notificationControllerProvider.notifier);

    final promotions = st.activePromotions;
    final orders = st.items;
    final auth = ref.watch(authViewModelProvider);
    final user = auth.valueOrNull;

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
            'Thông báo',
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
                  Icons.notifications_none_rounded,
                  size: 88,
                  color: AppColor.primary,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Đăng nhập để xem thông báo',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Bạn cần đăng nhập để xem cập nhật đơn hàng, phản hồi đánh giá và các thông báo quan trọng.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: Colors.black54,
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
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
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
        ref.read(notificationControllerProvider.notifier).bootstrap();
      });
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Thông báo',
          style: TextStyle(color: AppColor.primary),
        ),
        centerTitle: true,
        leadingWidth: 100,
        leading: TextButton(
          onPressed: st.items.isEmpty ? null : _confirmClearAll,
          child: Text(
            'Xoá tất cả',
            style: TextStyle(
              color: CupertinoColors.destructiveRed.resolveFrom(context),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: ctrl.markAllRead,
            child: Text(
              'Đọc hết',
              style: TextStyle(
                color: CupertinoColors.activeBlue.resolveFrom(context),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator.adaptive(
        onRefresh: ctrl.refresh,
        child: st.loading
            ? const Center(child: CircularProgressIndicator.adaptive())
            : ListView(
                controller: _scrollCtrl,
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
                children: [
                  if (promotions.isNotEmpty) ...[
                    const _SectionTitle('Khuyến mãi'),
                    ...promotions.map(
                      (e) => _PromotionBannerTile(
                        item: e,
                        onTap: () {
                          context.push('/promotion/${e.id}');
                        },
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (orders.isNotEmpty) ...[
                    const _SectionTitle('Đơn hàng'),
                    ...orders.map(
                      (e) => Slidable(
                        key: ValueKey(e.id),
                        endActionPane: ActionPane(
                          motion: const DrawerMotion(),
                          extentRatio: 0.22,
                          children: [
                            SlidableAction(
                              onPressed: (_) => _confirmDeleteOne(e),
                              backgroundColor: CupertinoColors.destructiveRed
                                  .resolveFrom(context),
                              foregroundColor: CupertinoColors.white,

                              label: 'Xoá',
                              borderRadius: const BorderRadius.all(
                                Radius.circular(12),
                              ),
                            ),
                          ],
                        ),
                        child: _NotificationTile(
                          item: e,
                          onTap: () => _handleTap(e),
                        ),
                      ),
                    ),
                  ],
                  if (promotions.isEmpty && orders.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 120),
                      child: Center(
                        child: Text(
                          'Chưa có thông báo nào',
                          style: TextStyle(
                            color: Colors.black54,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  if (st.loadingMore)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: CircularProgressIndicator.adaptive(),
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, left: 2),
      child: Text(
        title,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});

  final AppNotificationItem item;
  final VoidCallback onTap;

  String _twoDigits(int n) => n.toString().padLeft(2, '0');

  String _formatDateTime(DateTime dt) {
    final local = dt.toLocal();
    return '${_twoDigits(local.hour)}:${_twoDigits(local.minute)} - '
        '${_twoDigits(local.day)}/${_twoDigits(local.month)}/${local.year}';
  }

  String _timePrefix() {
    switch (item.type) {
      case AppNotificationType.orderCreated:
        return 'Tạo lúc';
      case AppNotificationType.orderStatus:
        return 'Cập nhật lúc';
      default:
        return 'Lúc';
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasImage =
        item.data.imageUrl != null && item.data.imageUrl!.trim().isNotEmpty;
    final hasOrderNumber =
        item.data.orderNumber != null &&
        item.data.orderNumber!.trim().isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: item.isRead ? Colors.white : AppColor.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: item.isRead
              ? Colors.grey.withOpacity(0.12)
              : AppColor.primary.withOpacity(0.12),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: hasImage
                    ? Image.network(
                        item.data.imageUrl!,
                        width: 56,
                        height: 56,
                        fit: BoxFit.cover,
                      )
                    : Container(
                        width: 56,
                        height: 56,
                        color: AppColor.primary.withOpacity(0.08),
                        alignment: Alignment.center,
                        child: Icon(
                          Icons.receipt_long_rounded,
                          color: AppColor.primary,
                          size: 26,
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF222222),
                              height: 1.2,
                            ),
                          ),
                        ),
                        if (!item.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(top: 4, left: 8),
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.red,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.body,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13.5,
                        color: Color(0xFF666666),
                        height: 1.35,
                      ),
                    ),
                    if (hasOrderNumber) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Mã đơn: ${item.data.orderNumber}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColor.primary,
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Text(
                      '${_timePrefix()} ${_formatDateTime(item.createdAt)}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF999999),
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PromotionBannerTile extends StatelessWidget {
  const _PromotionBannerTile({required this.item, required this.onTap});

  final ActivePlatformPromotionItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bg = CupertinoColors.systemGrey6.resolveFrom(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          height: 118,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: (item.bannerUrl != null && item.bannerUrl!.isNotEmpty)
                    ? Image.network(
                        item.bannerUrl!,
                        width: 68,
                        height: double.infinity,
                        fit: BoxFit.cover,
                      )
                    : Container(
                        width: 84,
                        height: double.infinity,
                        color: CupertinoColors.systemGrey5.resolveFrom(context),
                        alignment: Alignment.center,
                        child: const Icon(
                          CupertinoIcons.photo,
                          color: Colors.black38,
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: double.infinity,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF222222),
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Expanded(
                        child: Text(
                          item.description.isNotEmpty
                              ? item.description
                              : 'Không có mô tả',
                          maxLines: 5,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.black54,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
