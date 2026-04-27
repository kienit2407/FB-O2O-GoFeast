import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/orders/presentation/viewmodels/order_chat_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OrderChatPage extends ConsumerStatefulWidget {
  const OrderChatPage({
    super.key,
    required this.orderId,
    this.orderNumber,
    this.peerName,
  });

  final String orderId;
  final String? orderNumber;
  final String? peerName;

  @override
  ConsumerState<OrderChatPage> createState() => _OrderChatPageState();
}

class _OrderChatPageState extends ConsumerState<OrderChatPage> {
  final _textCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  @override
  void dispose() {
    _textCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _textCtrl.text;
    if (text.trim().isEmpty) return;

    _textCtrl.clear();
    await ref
        .read(customerOrderChatControllerProvider(widget.orderId).notifier)
        .send(text);
    _scrollToEnd();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(
      customerOrderChatControllerProvider(widget.orderId),
    );
    ref.listen(customerOrderChatControllerProvider(widget.orderId), (
      previous,
      next,
    ) {
      if ((previous?.messages.length ?? 0) != next.messages.length) {
        _scrollToEnd();
      }
    });

    final orderCode = (widget.orderNumber ?? '').isEmpty
        ? widget.orderId
        : widget.orderNumber!;
    final peerName = (widget.peerName ?? '').trim().isEmpty
        ? 'Tài xế'
        : widget.peerName!.trim();

    return Scaffold(
      backgroundColor: AppColor.background,
      appBar: AppBar(
        title: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              peerName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColor.textPrimary,
                fontWeight: FontWeight.w800,
                fontSize: 16,
              ),
            ),
            Text(
              '#$orderCode',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColor.textMuted,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
        centerTitle: true,
        backgroundColor: AppColor.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: AppColor.textPrimary),
      ),
      body: Column(
        children: [
          if (!state.isConnected)
            Container(
              width: double.infinity,
              color: AppColor.warning.withValues(alpha: .12),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: const Text(
                'Socket chưa kết nối, vui lòng thử lại sau',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFFB45309),
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator.adaptive())
                : state.messages.isEmpty
                ? const _EmptyChat()
                : ListView.separated(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    itemCount: state.messages.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final message = state.messages[index];
                      return _ChatBubble(
                        message: message,
                        isMine: message.senderRole == 'customer',
                        onRetry:
                            message.deliveryStatus ==
                                OrderChatDeliveryStatus.failed
                            ? () => ref
                                  .read(
                                    customerOrderChatControllerProvider(
                                      widget.orderId,
                                    ).notifier,
                                  )
                                  .retry(message)
                            : null,
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              decoration: const BoxDecoration(
                color: AppColor.surface,
                border: Border(top: BorderSide(color: AppColor.border)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textCtrl,
                      enabled: state.isConnected,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 500,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: 'Nhập tin nhắn',
                        filled: true,
                        fillColor: AppColor.surfaceWarm,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(18),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: state.isConnected ? _send : null,
                    style: IconButton.styleFrom(
                      backgroundColor: AppColor.primary,
                      disabledBackgroundColor: AppColor.border,
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.send_rounded),
                    tooltip: 'Gửi',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyChat extends StatelessWidget {
  const _EmptyChat();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text(
          'Chưa có tin nhắn',
          style: TextStyle(
            color: AppColor.textMuted,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({
    required this.message,
    required this.isMine,
    required this.onRetry,
  });

  final OrderChatMessage message;
  final bool isMine;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final bg = isMine ? AppColor.primary : AppColor.surface;
    final fg = isMine ? Colors.white : AppColor.textPrimary;

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.76,
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(isMine ? 18 : 4),
              bottomRight: Radius.circular(isMine ? 4 : 18),
            ),
            border: isMine ? null : Border.all(color: AppColor.border),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 9, 12, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  message.text,
                  style: TextStyle(color: fg, height: 1.35, fontSize: 14),
                ),
                if (isMine) ...[
                  const SizedBox(height: 4),
                  _DeliveryStatus(status: message.deliveryStatus),
                ],
                if (onRetry != null) ...[
                  const SizedBox(height: 4),
                  GestureDetector(
                    onTap: onRetry,
                    child: const Text(
                      'Thử lại',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DeliveryStatus extends StatelessWidget {
  const _DeliveryStatus({required this.status});

  final OrderChatDeliveryStatus status;

  @override
  Widget build(BuildContext context) {
    final label = switch (status) {
      OrderChatDeliveryStatus.sending => 'Đang gửi',
      OrderChatDeliveryStatus.sent => 'Đã gửi',
      OrderChatDeliveryStatus.failed => 'Lỗi',
    };

    return Text(
      label,
      style: TextStyle(
        color: Colors.white.withValues(alpha: .72),
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}
