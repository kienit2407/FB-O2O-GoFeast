import 'dart:async';

import 'package:customer/core/shared/contants/url_config.dart';
import 'package:customer/core/storage/token_storage.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class CustomerSocketEvents {
  static const socketReady = 'socket:ready';

  static const orderStatus = 'customer:order:status';
  static const driverLocation = 'customer:driver:location';
  static const dispatchSearching = 'customer:dispatch:searching';
  static const dispatchExpired = 'customer:dispatch:expired';
  static const orderCancelled = 'customer:order:cancelled';
  static const promotionPush = 'customer:promotion:push';
  static const joinOrderRoom = 'order:room:join';
  static const leaveOrderRoom = 'order:room:leave';
  static const notificationNew = 'customer:notification:new';
}

class CustomerSocketService {
  CustomerSocketService(this._tokenStorage);

  final TokenStorage _tokenStorage;

  io.Socket? _socket;
  bool _initialized = false;

  final _orderStatusController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _driverLocationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _dispatchSearchingController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _dispatchExpiredController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _orderCancelledController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();
  final _promotionPushController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _notificationNewController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get promotionPushStream =>
      _promotionPushController.stream;
  Stream<Map<String, dynamic>> get orderStatusStream =>
      _orderStatusController.stream;
  Stream<Map<String, dynamic>> get driverLocationStream =>
      _driverLocationController.stream;
  Stream<Map<String, dynamic>> get dispatchSearchingStream =>
      _dispatchSearchingController.stream;
  Stream<Map<String, dynamic>> get dispatchExpiredStream =>
      _dispatchExpiredController.stream;
  Stream<Map<String, dynamic>> get orderCancelledStream =>
      _orderCancelledController.stream;
  Stream<bool> get connectionStream => _connectionController.stream;
  Stream<Map<String, dynamic>> get notificationNewStream =>
      _notificationNewController.stream;

  bool get isConnected => _socket?.connected == true;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

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

    ;
    s.onConnect((_) {
      print('CUSTOMER SOCKET CONNECTED');
      _connectionController.add(true);
    });

    s.onConnectError((e) {
      print('CUSTOMER SOCKET CONNECT ERROR: $e');
      _connectionController.add(false);
    });

    s.onDisconnect((_) {
      _connectionController.add(false);
    });

    s.onError((_) {
      _connectionController.add(false);
    });

    s.on(CustomerSocketEvents.orderStatus, (data) {
      if (data is Map) {
        _orderStatusController.add(Map<String, dynamic>.from(data));
      }
    });
    s.on(CustomerSocketEvents.promotionPush, (data) {
      if (data is Map) {
        _promotionPushController.add(Map<String, dynamic>.from(data));
      }
    });
    s.on(CustomerSocketEvents.driverLocation, (data) {
      if (data is Map) {
        _driverLocationController.add(Map<String, dynamic>.from(data));
      }
    });

    s.on(CustomerSocketEvents.dispatchSearching, (data) {
      if (data is Map) {
        _dispatchSearchingController.add(Map<String, dynamic>.from(data));
      }
    });

    s.on(CustomerSocketEvents.dispatchExpired, (data) {
      if (data is Map) {
        _dispatchExpiredController.add(Map<String, dynamic>.from(data));
      }
    });

    s.on(CustomerSocketEvents.orderCancelled, (data) {
      if (data is Map) {
        _orderCancelledController.add(Map<String, dynamic>.from(data));
      }
    });
    s.on(CustomerSocketEvents.notificationNew, (data) {
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

  void joinOrderRoom(String orderId) {
    _socket?.emit(CustomerSocketEvents.joinOrderRoom, {'orderId': orderId});
  }

  void leaveOrderRoom(String orderId) {
    _socket?.emit(CustomerSocketEvents.leaveOrderRoom, {'orderId': orderId});
  }

  Future<void> dispose() async {
    await _orderStatusController.close();
    await _driverLocationController.close();
    await _dispatchSearchingController.close();
    await _dispatchExpiredController.close();
    await _orderCancelledController.close();
    await _connectionController.close();
    await _notificationNewController.close();
    await _promotionPushController.close();
    _socket?.dispose();
    _socket = null;
    _initialized = false;
  }
}
