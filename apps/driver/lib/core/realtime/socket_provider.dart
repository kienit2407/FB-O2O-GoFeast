import 'dart:async';

import 'package:driver/core/shared/contants/url_config.dart';
import 'package:driver/core/storage/token_storage.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class DriverSocketEvents {
  static const socketReady = 'socket:ready';

  static const newOrderOffer = 'driver:new-order-offer';
  static const offerAccepted = 'driver:offer:accepted';
  static const offerCancelled = 'driver:offer:cancelled';
  static const offerExpired = 'driver:offer:expired';
  static const orderStatus = 'driver:order:status';
  static const notificationNew = 'driver:notification:new';

  static const offerAccept = 'driver:offer:accept';
  static const offerReject = 'driver:offer:reject';

  static const joinOrderRoom = 'order:room:join';
  static const leaveOrderRoom = 'order:room:leave';
}

class DriverSocketService {
  DriverSocketService(this._tokenStorage);

  final TokenStorage _tokenStorage;

  io.Socket? _socket;
  bool _isInitialized = false;

  final _newOrderOfferController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _offerAcceptedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _offerCancelledController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _offerExpiredController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _orderStatusController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _notificationNewController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get newOrderOfferStream =>
      _newOrderOfferController.stream;
  Stream<Map<String, dynamic>> get offerAcceptedStream =>
      _offerAcceptedController.stream;
  Stream<Map<String, dynamic>> get offerCancelledStream =>
      _offerCancelledController.stream;
  Stream<Map<String, dynamic>> get offerExpiredStream =>
      _offerExpiredController.stream;
  Stream<Map<String, dynamic>> get orderStatusStream =>
      _orderStatusController.stream;
  Stream<Map<String, dynamic>> get notificationNewStream =>
      _notificationNewController.stream;
  Stream<bool> get connectionStream => _connectionController.stream;

  io.Socket? get socket => _socket;
  bool get isConnected => _socket?.connected == true;

  Future<void> init() async {
    if (_isInitialized) return;
    _isInitialized = true;

    final token = await _tokenStorage.getAccessToken();
    if (token == null || token.isEmpty) return;

    _socket = io.io(
      '${UrlConfig.backendBaseUrl}/realtime',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .enableReconnection()
          .setReconnectionAttempts(999999)
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(5000)
          .build(),
    );

    _bindBaseEvents();
  }

  void _bindBaseEvents() {
    final s = _socket;
    if (s == null) return;

    s.onConnect((_) {
      print('[DRIVER SOCKET] connected');
      _connectionController.add(true);
    });

    s.onDisconnect((_) {
      _connectionController.add(false);
    });

    s.onConnectError((e) {
      print('[DRIVER SOCKET] connect error: $e');
      _connectionController.add(false);
    });

    s.onError((_) {
      _connectionController.add(false);
    });

    s.on(DriverSocketEvents.newOrderOffer, (data) {
      print('[DRIVER SOCKET] newOrderOffer: $data');
      if (data is Map) {
        _newOrderOfferController.add(Map<String, dynamic>.from(data));
      }
    });

    s.on(DriverSocketEvents.offerAccepted, (data) {
      if (data is Map) {
        _offerAcceptedController.add(Map<String, dynamic>.from(data));
      }
    });

    s.on(DriverSocketEvents.offerCancelled, (data) {
      if (data is Map) {
        _offerCancelledController.add(Map<String, dynamic>.from(data));
      }
    });

    s.on(DriverSocketEvents.offerExpired, (data) {
      if (data is Map) {
        _offerExpiredController.add(Map<String, dynamic>.from(data));
      }
    });

    s.on(DriverSocketEvents.orderStatus, (data) {
      if (data is Map) {
        _orderStatusController.add(Map<String, dynamic>.from(data));
      }
    });

    s.on(DriverSocketEvents.notificationNew, (data) {
      if (data is Map) {
        _notificationNewController.add(Map<String, dynamic>.from(data));
      }
    });
  }

  Future<void> connect() async {
    if (_socket == null) {
      await init();
    }
    _socket?.connect();
  }

  void disconnect() {
    _socket?.disconnect();
  }

  Future<void> reconnectWithFreshToken() async {
    final token = await _tokenStorage.getAccessToken();
    if (_socket == null || token == null || token.isEmpty) return;

    _socket!.auth = {'token': token};
    _socket!
      ..disconnect()
      ..connect();
  }

  void emitAcceptOrder({required String orderId}) {
    _socket?.emit(DriverSocketEvents.offerAccept, {'orderId': orderId});
  }

  void emitRejectOrder({required String orderId, String? reason}) {
    _socket?.emit(DriverSocketEvents.offerReject, {
      'orderId': orderId,
      'reason': reason,
    });
  }

  void joinOrderRoom(String orderId) {
    _socket?.emit(DriverSocketEvents.joinOrderRoom, {'orderId': orderId});
  }

  void leaveOrderRoom(String orderId) {
    _socket?.emit(DriverSocketEvents.leaveOrderRoom, {'orderId': orderId});
  }

  Future<void> dispose() async {
    await _newOrderOfferController.close();
    await _offerAcceptedController.close();
    await _offerCancelledController.close();
    await _offerExpiredController.close();
    await _orderStatusController.close();
    await _notificationNewController.close();
    await _connectionController.close();
    _socket?.dispose();
    _socket = null;
    _isInitialized = false;
  }
}
