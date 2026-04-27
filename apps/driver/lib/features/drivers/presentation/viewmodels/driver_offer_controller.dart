import 'dart:async';

import 'package:driver/core/realtime/socket_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DriverOfferState {
  final Map<String, dynamic>? offer;
  final Map<String, dynamic>? currentOrder;
  final int remainingSeconds;
  final bool visible;
  final bool isSubmitting;
  final String? error;

  const DriverOfferState({
    this.offer,
    this.currentOrder,
    this.remainingSeconds = 0,
    this.visible = false,
    this.isSubmitting = false,
    this.error,
  });

  bool get hasActiveOffer => visible && offer != null;

  bool get hasCurrentOrder {
    final id = currentOrder?['orderId']?.toString() ?? '';
    return id.isNotEmpty;
  }

  String? get orderId => offer?['orderId']?.toString();
  String? get currentOrderId => currentOrder?['orderId']?.toString();

  String get merchantName => offer?['merchantName']?.toString() ?? 'Đơn mới';
  String get merchantAddress => offer?['merchantAddress']?.toString() ?? '';
  String get customerName => offer?['customerName']?.toString() ?? '';
  String get customerPhone => offer?['customerPhone']?.toString() ?? '';
  String get customerAddress => offer?['customerAddress']?.toString() ?? '';
  String get paymentMethod => offer?['paymentMethod']?.toString() ?? '';
  String get orderNumber => offer?['orderNumber']?.toString() ?? '';
  String get orderNote => offer?['orderNote']?.toString() ?? '';
  int get itemCount => (offer?['itemCount'] as num?)?.toInt() ?? 0;

  num get totalAmount {
    final raw = offer?['totalAmount'];
    if (raw is num) return raw;
    return num.tryParse(raw?.toString() ?? '') ?? 0;
  }

  DriverOfferState copyWith({
    Map<String, dynamic>? offer,
    Map<String, dynamic>? currentOrder,
    int? remainingSeconds,
    bool? visible,
    bool? isSubmitting,
    String? error,
    bool clearError = false,
    bool clearOffer = false,
    bool clearCurrentOrder = false,
  }) {
    return DriverOfferState(
      offer: clearOffer ? null : (offer ?? this.offer),
      currentOrder: clearCurrentOrder
          ? null
          : (currentOrder ?? this.currentOrder),
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
      visible: visible ?? this.visible,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class DriverOfferController extends StateNotifier<DriverOfferState> {
  DriverOfferController(this._socketService) : super(const DriverOfferState()) {
    _bind();
  }

  final DriverSocketService _socketService;

  StreamSubscription? _newOfferSub;
  StreamSubscription? _offerAcceptedSub;
  StreamSubscription? _offerCancelledSub;
  StreamSubscription? _offerExpiredSub;
  StreamSubscription? _orderStatusSub;

  Timer? _countdownTimer;
  Map<String, dynamic>? _pendingAcceptedOffer;

  void _bind() {
    _newOfferSub = _socketService.newOrderOfferStream.listen(_onNewOffer);

    _offerAcceptedSub = _socketService.offerAcceptedStream.listen((data) {
      final eventId = data['orderId']?.toString();
      if (eventId == null || eventId.isEmpty) return;

      final pendingId = _pendingAcceptedOffer?['orderId']?.toString();
      final currentOfferId = state.orderId;

      if (eventId != pendingId && eventId != currentOfferId) return;

      _stopCountdown();

      final nextOrder = Map<String, dynamic>.from(
        _pendingAcceptedOffer ?? state.offer ?? const {},
      );

      nextOrder['orderId'] = eventId;
      nextOrder['status'] = data['status']?.toString().isNotEmpty == true
          ? data['status']?.toString()
          : 'driver_assigned';
      nextOrder['updatedAt'] = data['updatedAt'];

      state = state.copyWith(
        visible: false,
        isSubmitting: false,
        currentOrder: nextOrder,
        clearError: true,
      );

      _pendingAcceptedOffer = null;
    });

    _offerCancelledSub = _socketService.offerCancelledStream.listen((data) {
      final eventId = data['orderId']?.toString();
      if (eventId == null || eventId.isEmpty) return;

      if (state.orderId == eventId) {
        _dismissOffer();
      }
    });

    _offerExpiredSub = _socketService.offerExpiredStream.listen((data) {
      final eventId = data['orderId']?.toString();
      if (eventId == null || eventId.isEmpty) return;

      if (state.orderId == eventId) {
        _dismissOffer();
      }
    });

    _orderStatusSub = _socketService.orderStatusStream.listen((data) {
      final eventId = data['orderId']?.toString();
      if (eventId == null || eventId.isEmpty) return;

      if (state.currentOrderId == eventId && state.currentOrder != null) {
        final next = Map<String, dynamic>.from(state.currentOrder!);

        if (data['status'] != null) {
          next['status'] = data['status']?.toString();
        }
        if (data['updatedAt'] != null) {
          next['updatedAt'] = data['updatedAt'];
        }
        if (data['etaAt'] != null) {
          next['etaAt'] = data['etaAt'];
        }
        if (data['etaMin'] != null) {
          next['etaMin'] = data['etaMin'];
        }
        if (data['message'] != null) {
          next['message'] = data['message'];
        }

        final status = next['status']?.toString() ?? '';

        if (status == 'completed' || status == 'cancelled') {
          state = state.copyWith(clearCurrentOrder: true, clearError: true);
          return;
        }

        state = state.copyWith(currentOrder: next, clearError: true);
      }
    });
  }

  void restoreCurrentOrder(Map<String, dynamic> order) {
    state = state.copyWith(
      currentOrder: Map<String, dynamic>.from(order),
      visible: false,
      clearOffer: true,
      clearError: true,
    );
  }

  void _onNewOffer(Map<String, dynamic> data) {
    if (state.visible || state.isSubmitting || state.hasCurrentOrder) {
      return;
    }

    final expiresAtRaw = data['offerExpiresAt']?.toString();
    final expiresAt = expiresAtRaw == null
        ? null
        : DateTime.tryParse(expiresAtRaw);

    final seconds = expiresAt == null
        ? 20
        : expiresAt.difference(DateTime.now()).inSeconds.clamp(0, 20);

    state = DriverOfferState(
      offer: data,
      currentOrder: state.currentOrder,
      remainingSeconds: seconds,
      visible: true,
      isSubmitting: false,
    );

    _startCountdown();
  }

  void _startCountdown() {
    _stopCountdown();

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!state.visible) {
        timer.cancel();
        return;
      }

      final next = state.remainingSeconds - 1;
      if (next <= 0) {
        timer.cancel();
        state = state.copyWith(
          remainingSeconds: 0,
          visible: false,
          clearOffer: true,
        );
        return;
      }

      state = state.copyWith(remainingSeconds: next);
    });
  }

  void _stopCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = null;
  }

  void _dismissOffer() {
    _pendingAcceptedOffer = null;
    _stopCountdown();
    state = state.copyWith(
      visible: false,
      isSubmitting: false,
      clearOffer: true,
      clearError: true,
    );
  }

  Future<String?> acceptCurrentOffer() async {
    final orderId = state.orderId;
    if (orderId == null || orderId.isEmpty || state.offer == null) return null;

    _pendingAcceptedOffer = Map<String, dynamic>.from(state.offer!);

    state = state.copyWith(isSubmitting: true, clearError: true);

    _socketService.emitAcceptOrder(orderId: orderId);
    return orderId;
  }

  Future<void> rejectCurrentOffer() async {
    final orderId = state.orderId;
    if (orderId == null || orderId.isEmpty) return;

    _socketService.emitRejectOrder(orderId: orderId);
    _dismissOffer();
  }

  void clearCurrentOrder() {
    state = state.copyWith(clearCurrentOrder: true, clearError: true);
  }

  @override
  void dispose() {
    _stopCountdown();
    _newOfferSub?.cancel();
    _offerAcceptedSub?.cancel();
    _offerCancelledSub?.cancel();
    _offerExpiredSub?.cancel();
    _orderStatusSub?.cancel();
    super.dispose();
  }
}
