Dây là hiện tại là cây cấu trúc thư mục của mình. cho mình hỏi bây giờ mình muốn xây dựng 1 cấu trúc theo first-feature layer cho app customer giống shoppee food thì phải xây dựng như thế nào: - riverpod (phiên bản mới nhất theo cách mới nhất theo docs của riverpod - riverpod: ^3.2.1) - dùng go_router (go_router: ^17.1.0). => lưu ý là bạn chri cần gợi ý mình xây dựng cái thư mục như nào cho đúng chứ khong dựa hoàn toàn vào thư mục hiện tại của mình. tại theo mình biết nếu provider nhét vào 1 file thì có sai hay khong. mình cũng có đính kèm 1 thư mục cart mình cũng khong biết vây là chuẩn chưa và đâyu là dự án cũ. cho nên mình mới nhờ bạn gợi ý để mình làm mới lại temeplate cho chuẩn khi sử dụng river pod. bạn cứ gợi ý đầy đủ chuẩn best-practice chuẩn senior dev flutter

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


Feature có từ 2 màn trở lên (vd: auth có login/otp/register/forgot…)

Feature có flow riêng (cart → checkout → payment)

Feature có nested route (order/:id, merchant/:id/menu…)