import 'dart:async';
import 'dart:convert';

import 'package:driver/core/realtime/socket_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

const _orderChatStoragePrefix = 'order_chat_v1';
const _uuid = Uuid();

enum OrderChatDeliveryStatus { sending, sent, failed }

class OrderChatMessage {
  final String orderId;
  final String clientMessageId;
  final String text;
  final String senderRole;
  final String senderId;
  final DateTime createdAt;
  final OrderChatDeliveryStatus deliveryStatus;

  const OrderChatMessage({
    required this.orderId,
    required this.clientMessageId,
    required this.text,
    required this.senderRole,
    required this.senderId,
    required this.createdAt,
    required this.deliveryStatus,
  });

  factory OrderChatMessage.fromJson(Map<String, dynamic> json) {
    final rawStatus = json['deliveryStatus']?.toString() ?? 'sent';
    return OrderChatMessage(
      orderId: json['orderId']?.toString() ?? '',
      clientMessageId: json['clientMessageId']?.toString() ?? '',
      text: json['text']?.toString() ?? '',
      senderRole: json['senderRole']?.toString() ?? '',
      senderId: json['senderId']?.toString() ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      deliveryStatus: OrderChatDeliveryStatus.values.firstWhere(
        (e) => e.name == rawStatus,
        orElse: () => OrderChatDeliveryStatus.sent,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'orderId': orderId,
      'clientMessageId': clientMessageId,
      'text': text,
      'senderRole': senderRole,
      'senderId': senderId,
      'createdAt': createdAt.toIso8601String(),
      'deliveryStatus': deliveryStatus.name,
    };
  }

  OrderChatMessage copyWith({
    String? senderRole,
    String? senderId,
    DateTime? createdAt,
    OrderChatDeliveryStatus? deliveryStatus,
  }) {
    return OrderChatMessage(
      orderId: orderId,
      clientMessageId: clientMessageId,
      text: text,
      senderRole: senderRole ?? this.senderRole,
      senderId: senderId ?? this.senderId,
      createdAt: createdAt ?? this.createdAt,
      deliveryStatus: deliveryStatus ?? this.deliveryStatus,
    );
  }
}

class OrderChatLocalCache {
  static String key(String orderId) => '$_orderChatStoragePrefix:$orderId';

  static Future<List<OrderChatMessage>> load(String orderId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key(orderId));
    if (raw == null || raw.trim().isEmpty) return const [];

    try {
      final decoded = jsonDecode(raw) as List;
      return decoded
          .whereType<Map>()
          .map((e) => OrderChatMessage.fromJson(e.cast<String, dynamic>()))
          .where((e) => e.orderId == orderId && e.clientMessageId.isNotEmpty)
          .toList()
        ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    } catch (_) {
      return const [];
    }
  }

  static Future<void> save(
    String orderId,
    List<OrderChatMessage> messages,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final latest = messages.length > 100
        ? messages.sublist(messages.length - 100)
        : messages;
    await prefs.setString(
      key(orderId),
      jsonEncode(latest.map((e) => e.toJson()).toList()),
    );
  }

  static Future<void> clear(String orderId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key(orderId));
  }
}

class OrderChatState {
  final String orderId;
  final List<OrderChatMessage> messages;
  final bool isConnected;
  final bool isLoading;
  final String? error;

  const OrderChatState({
    required this.orderId,
    this.messages = const [],
    this.isConnected = false,
    this.isLoading = true,
    this.error,
  });

  OrderChatState copyWith({
    List<OrderChatMessage>? messages,
    bool? isConnected,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return OrderChatState(
      orderId: orderId,
      messages: messages ?? this.messages,
      isConnected: isConnected ?? this.isConnected,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class OrderChatController extends StateNotifier<OrderChatState> {
  OrderChatController({
    required String orderId,
    required DriverSocketService socketService,
  }) : _socketService = socketService,
       super(OrderChatState(orderId: orderId)) {
    _start();
  }

  final DriverSocketService _socketService;

  StreamSubscription? _chatSub;
  StreamSubscription? _connectionSub;

  Future<void> _start() async {
    final messages = await OrderChatLocalCache.load(state.orderId);
    if (!mounted) return;

    state = state.copyWith(
      messages: messages,
      isConnected: _socketService.isConnected,
      isLoading: false,
      clearError: true,
    );

    await _socketService.init();
    await _socketService.connect();

    _chatSub = _socketService.orderChatStream.listen(_handleIncoming);
    _connectionSub = _socketService.connectionStream.listen((connected) {
      if (!mounted) return;
      state = state.copyWith(isConnected: connected);
    });
  }

  Future<void> send(String rawText) async {
    final text = rawText.trim();
    if (text.isEmpty) return;

    if (!_socketService.isConnected) {
      state = state.copyWith(error: 'Socket chưa kết nối');
      return;
    }

    final message = OrderChatMessage(
      orderId: state.orderId,
      clientMessageId: _uuid.v4(),
      text: text,
      senderRole: 'driver',
      senderId: '',
      createdAt: DateTime.now(),
      deliveryStatus: OrderChatDeliveryStatus.sending,
    );

    await _upsert(message, persist: true);
    await _sendExisting(message);
  }

  Future<void> retry(OrderChatMessage message) async {
    final sending = message.copyWith(
      deliveryStatus: OrderChatDeliveryStatus.sending,
    );
    await _upsert(sending, persist: true);
    await _sendExisting(sending);
  }

  Future<void> _sendExisting(OrderChatMessage message) async {
    try {
      final ack = await _socketService.emitOrderChatMessage(
        orderId: message.orderId,
        clientMessageId: message.clientMessageId,
        text: message.text,
      );

      if (ack['ok'] == true && ack['message'] is Map) {
        await _handleIncoming(Map<String, dynamic>.from(ack['message'] as Map));
        return;
      }

      await _markFailed(
        message.clientMessageId,
        ack['message']?.toString() ?? 'Gửi tin nhắn thất bại',
      );
    } catch (e) {
      await _markFailed(message.clientMessageId, e.toString());
    }
  }

  Future<void> _markFailed(String clientMessageId, String error) async {
    final next = state.messages.map((item) {
      if (item.clientMessageId != clientMessageId) return item;
      return item.copyWith(deliveryStatus: OrderChatDeliveryStatus.failed);
    }).toList();

    state = state.copyWith(messages: next, error: error);
    await OrderChatLocalCache.save(state.orderId, next);
  }

  Future<void> _handleIncoming(Map<String, dynamic> data) async {
    if (data['orderId']?.toString() != state.orderId) return;

    final message = OrderChatMessage.fromJson({
      ...data,
      'deliveryStatus': OrderChatDeliveryStatus.sent.name,
    });
    if (message.clientMessageId.isEmpty || message.text.trim().isEmpty) {
      return;
    }

    await _upsert(message, persist: true);
  }

  Future<void> _upsert(
    OrderChatMessage message, {
    required bool persist,
  }) async {
    final next = [...state.messages];
    final index = next.indexWhere(
      (e) => e.clientMessageId == message.clientMessageId,
    );
    if (index >= 0) {
      next[index] = message;
    } else {
      next.add(message);
    }
    next.sort((a, b) => a.createdAt.compareTo(b.createdAt));

    state = state.copyWith(messages: next, clearError: true);
    if (persist) {
      await OrderChatLocalCache.save(state.orderId, next);
    }
  }

  Future<void> clearCache() async {
    await OrderChatLocalCache.clear(state.orderId);
    if (!mounted) return;
    state = state.copyWith(messages: const [], clearError: true);
  }

  @override
  void dispose() {
    _chatSub?.cancel();
    _connectionSub?.cancel();
    super.dispose();
  }
}
