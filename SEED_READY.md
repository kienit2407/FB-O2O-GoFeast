lib/
  main.dart
  app/
    bootstrap.dart              # init storage, notification, location svc...
    app.dart                    # MaterialApp.router + theme
    router/
      app_router.dart           # GoRouter + ShellRoute bottom nav
      routes.dart               # route paths/names
      guards.dart               # redirect dựa auth/kyc/verified
    theme/
      app_theme.dart
      app_colors.dart
    config/
      env.dart                  # baseUrl, flavor, build mode
  core/
    network/
      dio_client.dart
      interceptors/
        auth_interceptor.dart
      endpoints.dart
    storage/
      token_storage.dart
      device_id_storage.dart
    realtime/
      socket_client.dart        # connect, subscribe order events
      realtime_events.dart
    location/
      location_service.dart     # get position, stream updates
      background_tracker.dart   # start/stop background tracking
    notifications/
      push_service.dart         # FCM init, handlers
      notification_payload.dart
    permissions/
      permission_service.dart
    error/
      app_exception.dart
      error_mapper.dart
    utils/
      logger.dart
      debounce.dart
    shared/
      widgets/
      constants/
      extensions/
  features/
    auth/
      data/ domain/ application/ presentation/ routes.dart
    kyc/
      data/
      application/              # submit docs, status provider
      presentation/
      routes.dart
    availability/
      application/
        availability_controller.dart   # online/offline + accept_food_orders
      presentation/
        widgets/online_toggle.dart
      routes.dart
    dispatch/
      application/
        dispatch_controller.dart       # job offer queue, timeout accept
      presentation/
        pages/job_offer_page.dart
        widgets/offer_card.dart
      routes.dart
    orders/
      data/
        models/
        datasources/
        repositories/
      domain/
        entities/
        repositories/
      application/
        active_order_controller.dart   # state machine 1 đơn đang chạy
        orders_list_controller.dart    # danh sách đơn
      presentation/
        pages/orders_page.dart         # tab "Đơn"
        pages/order_detail_page.dart
        widgets/
      routes.dart
    map/
      application/
        map_controller.dart            # marker, polyline, camera
      presentation/
        pages/map_page.dart
        widgets/
      routes.dart
    earnings/
      data/ domain/ application/ presentation/ routes.dart
    profile/
      data/ domain/ application/ presentation/ routes.dart