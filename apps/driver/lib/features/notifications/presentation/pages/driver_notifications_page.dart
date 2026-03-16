import 'package:driver/app/theme/app_color.dart';
import 'package:driver/core/di/providers.dart';
import 'package:driver/features/notifications/data/models/driver_notification_models.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';

class DriverNotificationsPage extends ConsumerStatefulWidget {
  const DriverNotificationsPage({super.key});

  @override
  ConsumerState<DriverNotificationsPage> createState() =>
      _DriverNotificationsPageState();
}

class _DriverNotificationsPageState
    extends ConsumerState<DriverNotificationsPage> {
  late final ScrollController _scrollCtrl;

  @override
  void initState() {
    super.initState();
    _scrollCtrl = ScrollController()..addListener(_onScroll);

    Future.microtask(() {
      ref.read(driverNotificationControllerProvider.notifier).bootstrap();
    });
  }

  void _onScroll() {
    if (!_scrollCtrl.hasClients) return;
    final pos = _scrollCtrl.position;
    if (pos.pixels >= pos.maxScrollExtent - 220) {
      ref.read(driverNotificationControllerProvider.notifier).loadMore();
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

  Future<void> _confirmDeleteOne(String id) async {
    final ok = await _showDeleteConfirm(
      title: 'Xoá thông báo',
      message: 'Bạn có chắc muốn xoá thông báo này không?',
      confirmText: 'Xoá',
    );

    if (!ok) return;

    final success = await ref
        .read(driverNotificationControllerProvider.notifier)
        .deleteOne(id);

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
        .read(driverNotificationControllerProvider.notifier)
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

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(driverNotificationControllerProvider);
    final ctrl = ref.read(driverNotificationControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Thông báo',
          style: TextStyle(color: AppColor.primary),
        ),
        centerTitle: true,
        leading: TextButton(
          onPressed: st.items.isEmpty ? null : _confirmClearAll,
          child: Text(
            'Xoá tất cả',
            style: TextStyle(
              color: CupertinoColors.destructiveRed.resolveFrom(context),
            ),
          ),
        ),
        leadingWidth: 100,
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
            : st.items.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.only(top: 140),
                children: const [
                  Center(
                    child: Text(
                      'Chưa có thông báo nào',
                      style: TextStyle(
                        color: Colors.black54,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              )
            : ListView.builder(
                controller: _scrollCtrl,
                padding: const EdgeInsets.all(12),
                itemCount: st.items.length + (st.loadingMore ? 1 : 0),
                itemBuilder: (_, index) {
                  if (index >= st.items.length) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: CircularProgressIndicator.adaptive(),
                      ),
                    );
                  }

                  final item = st.items[index];

                  return Slidable(
                    key: ValueKey(item.id),
                    endActionPane: ActionPane(
                      motion: const DrawerMotion(),
                      extentRatio: 0.22,
                      children: [
                        SlidableAction(
                          onPressed: (_) => _confirmDeleteOne(item.id),
                          backgroundColor: CupertinoColors.destructiveRed
                              .resolveFrom(context),
                          foregroundColor: CupertinoColors.white,
                          icon: CupertinoIcons.delete,
                          label: 'Xoá',
                          borderRadius: const BorderRadius.all(
                            Radius.circular(12),
                          ),
                        ),
                      ],
                    ),
                    child: _DriverNotificationTile(
                      item: item,
                      onTap: () async {
                        await ctrl.markRead(item.id);

                        if (!mounted) return;

                        if (item.data.orderId?.isNotEmpty ?? false) {
                          context.push(
                            '/current-order',
                            extra: {
                              'orderId': item.data.orderId,
                              'orderNumber': item.data.orderNumber,
                              'initialStatus': 'completed',
                              'merchantName': '',
                              'merchantAddress': '',
                              'customerName': '',
                              'customerPhone': '',
                              'customerAddress': '',
                            },
                          );
                        }
                      },
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _DriverNotificationTile extends StatelessWidget {
  const _DriverNotificationTile({required this.item, required this.onTap});

  final DriverNotificationItem item;
  final VoidCallback onTap;

  String _twoDigits(int n) => n.toString().padLeft(2, '0');

  String _formatDateTime(DateTime dt) {
    final local = dt.toLocal();
    return '${_twoDigits(local.hour)}:${_twoDigits(local.minute)} - '
        '${_twoDigits(local.day)}/${_twoDigits(local.month)}/${local.year}';
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
        color: item.isRead
            ? CupertinoColors.white
            : CupertinoColors.systemGrey6.resolveFrom(context),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: item.isRead
              ? Colors.grey.withOpacity(0.12)
              : AppColor.primary.withOpacity(0.10),
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
                        color: CupertinoColors.systemGrey5.resolveFrom(context),
                        alignment: Alignment.center,
                        child: Icon(
                          CupertinoIcons.bell,
                          color: CupertinoColors.activeBlue.resolveFrom(
                            context,
                          ),
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
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: CupertinoColors.systemRed.resolveFrom(
                                context,
                              ),
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
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColor.primary,
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Text(
                      _formatDateTime(item.createdAt),
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
