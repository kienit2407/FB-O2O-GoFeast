import 'dart:async';

import 'package:driver/core/realtime/socket_provider.dart';
import 'package:driver/features/drivers/data/repository/driver_order_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DriverDeliveryTrackingState {
  final String? orderId;
  final String? orderNumber;
  final String status;
  final String merchantName;
  final String merchantAddress;
  final String customerName;
  final String customerPhone;
  final String customerAddress;
  final bool isBusy;
  final bool driverHasArrived;
  final List<String> proofImages;
  final String? error;

  const DriverDeliveryTrackingState({
    this.orderId,
    this.orderNumber,
    this.status = '',
    this.merchantName = '',
    this.merchantAddress = '',
    this.customerName = '',
    this.customerPhone = '',
    this.customerAddress = '',
    this.isBusy = false,
    this.proofImages = const [],
    this.error,
    this.driverHasArrived = false,
  });

  bool get hasOrder => orderId != null && orderId!.isNotEmpty;

  bool get canArriveAtMerchant =>
      !driverHasArrived &&
      ['confirmed', 'preparing', 'ready_for_pickup'].contains(status);
  bool get canPickUp => driverHasArrived && status == 'ready_for_pickup';

 bool get canStartDelivering => status == 'picked_up';

  bool get canDelivered => ['delivering'].contains(status);

  bool get canComplete => ['delivered'].contains(status);

  DriverDeliveryTrackingState copyWith({
    String? orderId,
    String? orderNumber,
    String? status,
    String? merchantName,
    bool? driverHasArrived,
    String? merchantAddress,
    String? customerName,
    String? customerPhone,
    String? customerAddress,
    bool? isBusy,
    List<String>? proofImages,
    String? error,
    bool clearError = false,
    bool clearOrder = false,
  }) {
    return DriverDeliveryTrackingState(
      driverHasArrived: driverHasArrived ?? this.driverHasArrived,
      orderId: clearOrder ? null : (orderId ?? this.orderId),
      orderNumber: clearOrder ? null : (orderNumber ?? this.orderNumber),
      status: clearOrder ? '' : (status ?? this.status),
      merchantName: clearOrder ? '' : (merchantName ?? this.merchantName),
      merchantAddress: clearOrder
          ? ''
          : (merchantAddress ?? this.merchantAddress),
      customerName: clearOrder ? '' : (customerName ?? this.customerName),
      customerPhone: clearOrder ? '' : (customerPhone ?? this.customerPhone),
      customerAddress: clearOrder
          ? ''
          : (customerAddress ?? this.customerAddress),
      isBusy: isBusy ?? this.isBusy,
      proofImages: clearOrder ? const [] : (proofImages ?? this.proofImages),
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class DriverDeliveryTrackingController
    extends StateNotifier<DriverDeliveryTrackingState> {
  DriverDeliveryTrackingController({
    required DriverOrderRepository orderRepository,
    required DriverSocketService socketService,
  }) : _orderRepository = orderRepository,
       _socketService = socketService,
       super(const DriverDeliveryTrackingState()) {
    _bindSocket();
  }

  final DriverOrderRepository _orderRepository;
  final DriverSocketService _socketService;

  StreamSubscription? _orderStatusSub;

  void _bindSocket() {
    _orderStatusSub = _socketService.orderStatusStream.listen((data) {
      final eventOrderId = data['orderId']?.toString();
      if (eventOrderId == null || eventOrderId != state.orderId) return;

      final nextStatus = data['status']?.toString();
      if (nextStatus == null || nextStatus.isEmpty) return;

      if (nextStatus == 'completed' || nextStatus == 'cancelled') {
        clear();
        return;
      }

      state = state.copyWith(status: nextStatus, clearError: true);
    });
  }

  void bindOrder({
    required String orderId,
    String? orderNumber,
    String? initialStatus,
    String? merchantName,
    String? merchantAddress,
    String? customerName,
    String? customerPhone,
    String? customerAddress,
    bool? driverHasArrived,
  }) {
    _socketService.joinOrderRoom(orderId);

    state = state.copyWith(
      orderId: orderId,
      orderNumber: orderNumber ?? state.orderNumber,
      status: initialStatus ?? state.status,
      merchantName: merchantName ?? state.merchantName,
      merchantAddress: merchantAddress ?? state.merchantAddress,
      customerName: customerName ?? state.customerName,
      customerPhone: customerPhone ?? state.customerPhone,
      customerAddress: customerAddress ?? state.customerAddress,
      driverHasArrived: driverHasArrived ?? state.driverHasArrived,
      clearError: true,
    );
  }

  void setProofImages(List<String> urls) {
    state = state.copyWith(proofImages: urls, clearError: true);
  }

  Future<void> markArrived({String? note}) async {
    final orderId = state.orderId;
    if (orderId == null) return;

    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _orderRepository.arrived(orderId, note: note);
      state = state.copyWith(isBusy: false, driverHasArrived: true);
    } catch (e) {
      state = state.copyWith(isBusy: false, error: e.toString());
    }
  }

  Future<void> markPickedUp({String? note}) async {
    final orderId = state.orderId;
    if (orderId == null) return;

    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _orderRepository.pickedUp(orderId, note: note);
      state = state.copyWith(isBusy: false, status: 'picked_up');
    } catch (e) {
      state = state.copyWith(isBusy: false, error: e.toString());
    }
  }

  Future<void> markDelivering({String? note}) async {
    final orderId = state.orderId;
    if (orderId == null) return;

    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _orderRepository.delivering(orderId, note: note);
      state = state.copyWith(isBusy: false, status: 'delivering');
    } catch (e) {
      state = state.copyWith(isBusy: false, error: e.toString());
    }
  }

  Future<void> markDelivered({String? note}) async {
    final orderId = state.orderId;
    if (orderId == null) return;

    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _orderRepository.delivered(orderId, note: note);
      state = state.copyWith(isBusy: false, status: 'delivered');
    } catch (e) {
      state = state.copyWith(isBusy: false, error: e.toString());
    }
  }

  Future<void> completeOrder({String? note}) async {
    final orderId = state.orderId;
    if (orderId == null) return;

    if (state.proofImages.isEmpty) {
      state = state.copyWith(error: 'Bạn cần thêm ít nhất 1 ảnh minh chứng');
      return;
    }

    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _orderRepository.complete(
        orderId,
        proofImages: state.proofImages,
        note: note,
      );
      clear();
    } catch (e) {
      state = state.copyWith(isBusy: false, error: e.toString());
    }
  }

  void clear() {
    final orderId = state.orderId;
    if (orderId != null && orderId.isNotEmpty) {
      _socketService.leaveOrderRoom(orderId);
    }
    state = const DriverDeliveryTrackingState();
  }

  @override
  void dispose() {
    final orderId = state.orderId;
    if (orderId != null && orderId.isNotEmpty) {
      _socketService.leaveOrderRoom(orderId);
    }
    _orderStatusSub?.cancel();
    super.dispose();
  }
}
