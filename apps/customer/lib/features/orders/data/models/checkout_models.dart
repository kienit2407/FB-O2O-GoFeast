enum CheckoutMode { delivery, dineIn }

enum CheckoutPaymentMethod { cash, vnpay, momo, zalopay }

CheckoutPaymentMethod checkoutPaymentMethodFromString(String v) {
  switch (v) {
    case 'vnpay':
      return CheckoutPaymentMethod.vnpay;
    case 'momo':
      return CheckoutPaymentMethod.momo;
    case 'zalopay':
      return CheckoutPaymentMethod.zalopay;
    case 'cash':
    default:
      return CheckoutPaymentMethod.cash;
  }
}

String checkoutPaymentMethodToApi(CheckoutPaymentMethod v) {
  switch (v) {
    case CheckoutPaymentMethod.vnpay:
      return 'vnpay';
    case CheckoutPaymentMethod.momo:
      return 'momo';
    case CheckoutPaymentMethod.zalopay:
      return 'zalopay';
    case CheckoutPaymentMethod.cash:
      return 'cash';
  }
}

class CheckoutMerchantInfo {
  final String id;
  final String name;
  final String? address;

  const CheckoutMerchantInfo({
    required this.id,
    required this.name,
    required this.address,
  });

  factory CheckoutMerchantInfo.fromJson(Map<String, dynamic> j) {
    return CheckoutMerchantInfo(
      id: (j['id'] ?? '').toString(),
      name: (j['name'] ?? '').toString(),
      address: j['address']?.toString(),
    );
  }
}

class CheckoutDeliveryInfo {
  final String? address;
  final String? receiverName;
  final String? receiverPhone;
  final String? note;
  final double? lat;
  final double? lng;
  final double distanceKm;
  final String? distanceText;
  final String? durationText;
  final int prepMin;
  final int etaMin;
  final String? etaAt;

  const CheckoutDeliveryInfo({
    required this.address,
    required this.receiverName,
    required this.receiverPhone,
    required this.note,
    required this.lat,
    required this.lng,
    required this.distanceKm,
    required this.distanceText,
    required this.durationText,
    required this.prepMin,
    required this.etaMin,
    required this.etaAt,
  });

  factory CheckoutDeliveryInfo.fromJson(Map<String, dynamic> j) {
    return CheckoutDeliveryInfo(
      address: j['address']?.toString(),
      receiverName: j['receiver_name']?.toString(),
      receiverPhone: j['receiver_phone']?.toString(),
      note: j['note']?.toString(),
      lat: (j['lat'] as num?)?.toDouble(),
      lng: (j['lng'] as num?)?.toDouble(),
      distanceKm: (j['distance_km'] as num?)?.toDouble() ?? 0,
      distanceText: j['distance_text']?.toString(),
      durationText: j['duration_text']?.toString(),
      prepMin: (j['prep_min'] as num?)?.toInt() ?? 0,
      etaMin: (j['eta_min'] as num?)?.toInt() ?? 0,
      etaAt: j['eta_at']?.toString(),
    );
  }
}

class CheckoutDineInInfo {
  final String tableSessionId;
  final String? tableId;
  final int estimatedPrepTimeMin;

  const CheckoutDineInInfo({
    required this.tableSessionId,
    required this.tableId,
    required this.estimatedPrepTimeMin,
  });

  factory CheckoutDineInInfo.fromJson(Map<String, dynamic> j) {
    return CheckoutDineInInfo(
      tableSessionId: (j['table_session_id'] ?? '').toString(),
      tableId: j['table_id']?.toString(),
      estimatedPrepTimeMin:
          (j['estimated_prep_time_min'] as num?)?.toInt() ?? 0,
    );
  }
}

class CheckoutCartLine {
  final String lineKey;
  final String itemType;
  final String? productId;
  final String? toppingId;
  final String name;
  final String? imageUrl;
  final int quantity;
  final num unitPrice;
  final num? basePrice;
  final num itemTotal;
  final String note;
  final List<dynamic> selectedOptions;
  final List<dynamic> selectedToppings;

  const CheckoutCartLine({
    required this.lineKey,
    required this.itemType,
    required this.productId,
    required this.toppingId,
    required this.name,
    required this.imageUrl,
    required this.quantity,
    required this.unitPrice,
    required this.basePrice,
    required this.itemTotal,
    required this.note,
    required this.selectedOptions,
    required this.selectedToppings,
  });

  factory CheckoutCartLine.fromJson(Map<String, dynamic> j) {
    return CheckoutCartLine(
      lineKey: (j['line_key'] ?? '').toString(),
      itemType: (j['item_type'] ?? '').toString(),
      productId: j['product_id']?.toString(),
      toppingId: j['topping_id']?.toString(),
      name: (j['name'] ?? '').toString(),
      imageUrl: j['image_url']?.toString(),
      quantity: (j['quantity'] as num?)?.toInt() ?? 0,
      unitPrice: (j['unit_price'] as num?) ?? 0,
      basePrice: j['base_price'] as num?,
      itemTotal: (j['item_total'] as num?) ?? 0,
      note: (j['note'] ?? '').toString(),
      selectedOptions: (j['selected_options'] as List?) ?? const [],
      selectedToppings: (j['selected_toppings'] as List?) ?? const [],
    );
  }
}

class CheckoutCartInfo {
  final String id;
  final int itemCount;
  final List<CheckoutCartLine> items;

  const CheckoutCartInfo({
    required this.id,
    required this.itemCount,
    required this.items,
  });

  factory CheckoutCartInfo.fromJson(Map<String, dynamic> j) {
    return CheckoutCartInfo(
      id: (j['id'] ?? '').toString(),
      itemCount: (j['item_count'] as num?)?.toInt() ?? 0,
      items: ((j['items'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => CheckoutCartLine.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class CheckoutPaymentInfo {
  final CheckoutPaymentMethod selectedMethod;

  const CheckoutPaymentInfo({required this.selectedMethod});

  factory CheckoutPaymentInfo.fromJson(Map<String, dynamic> j) {
    return CheckoutPaymentInfo(
      selectedMethod: checkoutPaymentMethodFromString(
        (j['selected_method'] ?? 'cash').toString(),
      ),
    );
  }
}

class PlaceOrderPaymentAction {
  final String? type;
  final String? url;

  const PlaceOrderPaymentAction({required this.type, required this.url});

  factory PlaceOrderPaymentAction.fromJson(Map<String, dynamic> j) {
    return PlaceOrderPaymentAction(
      type: j['type']?.toString(),
      url: j['url']?.toString(),
    );
  }
}

class PlaceOrderPaymentResult {
  final String paymentId;
  final String status;
  final String method;
  final num amount;

  const PlaceOrderPaymentResult({
    required this.paymentId,
    required this.status,
    required this.method,
    required this.amount,
  });

  factory PlaceOrderPaymentResult.fromJson(Map<String, dynamic> j) {
    return PlaceOrderPaymentResult(
      paymentId: (j['payment_id'] ?? '').toString(),
      status: (j['status'] ?? '').toString(),
      method: (j['method'] ?? '').toString(),
      amount: (j['amount'] as num?) ?? 0,
    );
  }
}

class PlaceOrderResponse {
  final String orderId;
  final String orderNumber;
  final String status;
  final PlaceOrderPaymentResult? payment;
  final PlaceOrderPaymentAction? paymentAction;
  final CheckoutPricing pricing;
  final CheckoutDeliveryInfo? delivery;
  final CheckoutDineInInfo? dineIn;

  const PlaceOrderResponse({
    required this.orderId,
    required this.orderNumber,
    required this.status,
    required this.payment,
    required this.paymentAction,
    required this.pricing,
    required this.delivery,
    required this.dineIn,
  });

  bool get requiresOnlinePayment =>
      paymentAction != null &&
      paymentAction?.type == 'redirect_url' &&
      (paymentAction?.url?.trim().isNotEmpty ?? false);

  factory PlaceOrderResponse.fromJson(Map<String, dynamic> j) {
    return PlaceOrderResponse(
      orderId: (j['order_id'] ?? '').toString(),
      orderNumber: (j['order_number'] ?? '').toString(),
      status: (j['status'] ?? '').toString(),
      payment: j['payment'] is Map
          ? PlaceOrderPaymentResult.fromJson(
              (j['payment'] as Map).cast<String, dynamic>(),
            )
          : null,
      paymentAction: j['payment_action'] is Map
          ? PlaceOrderPaymentAction.fromJson(
              (j['payment_action'] as Map).cast<String, dynamic>(),
            )
          : null,
      pricing: CheckoutPricing.fromJson(
        (j['pricing'] as Map).cast<String, dynamic>(),
      ),
      delivery: j['delivery'] is Map
          ? CheckoutDeliveryInfo.fromJson(
              (j['delivery'] as Map).cast<String, dynamic>(),
            )
          : null,
      dineIn: j['dine_in'] is Map
          ? CheckoutDineInInfo.fromJson(
              (j['dine_in'] as Map).cast<String, dynamic>(),
            )
          : null,
    );
  }
}

class AppliedPromotionItem {
  final String promotionId;
  final String name;
  final String scope;
  final String sponsor;
  final num discountAmount;

  const AppliedPromotionItem({
    required this.promotionId,
    required this.name,
    required this.scope,
    required this.sponsor,
    required this.discountAmount,
  });

  factory AppliedPromotionItem.fromJson(Map<String, dynamic> j) {
    return AppliedPromotionItem(
      promotionId: (j['promotion_id'] ?? '').toString(),
      name: (j['name'] ?? '').toString(),
      scope: (j['scope'] ?? '').toString(),
      sponsor: (j['sponsor'] ?? '').toString(),
      discountAmount: (j['discount_amount'] as num?) ?? 0,
    );
  }
}

class AppliedVoucherInfo {
  final String voucherId;
  final String promotionId;
  final String voucherCode;
  final String scope;
  final String sponsor;
  final num discountAmount;

  const AppliedVoucherInfo({
    required this.voucherId,
    required this.promotionId,
    required this.voucherCode,
    required this.scope,
    required this.sponsor,
    required this.discountAmount,
  });

  factory AppliedVoucherInfo.fromJson(Map<String, dynamic> j) {
    return AppliedVoucherInfo(
      voucherId: (j['voucher_id'] ?? '').toString(),
      promotionId: (j['promotion_id'] ?? '').toString(),
      voucherCode: (j['voucher_code'] ?? '').toString(),
      scope: (j['scope'] ?? '').toString(),
      sponsor: (j['sponsor'] ?? '').toString(),
      discountAmount: (j['discount_amount'] as num?) ?? 0,
    );
  }
}

class CheckoutPromotions {
  final List<AppliedPromotionItem> autoApplied;
  final AppliedVoucherInfo? voucherApplied;
  final num rawFoodDiscount;
  final num rawDeliveryDiscount;

  const CheckoutPromotions({
    required this.autoApplied,
    required this.voucherApplied,
    required this.rawFoodDiscount,
    required this.rawDeliveryDiscount,
  });

  factory CheckoutPromotions.fromJson(Map<String, dynamic> j) {
    return CheckoutPromotions(
      autoApplied: ((j['auto_applied'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => AppliedPromotionItem.fromJson(e.cast<String, dynamic>()))
          .toList(),
      voucherApplied: j['voucher_applied'] is Map
          ? AppliedVoucherInfo.fromJson(
              (j['voucher_applied'] as Map).cast<String, dynamic>(),
            )
          : null,
      rawFoodDiscount: (j['raw_food_discount'] as num?) ?? 0,
      rawDeliveryDiscount: (j['raw_delivery_discount'] as num?) ?? 0,
    );
  }
}

class CheckoutPricing {
  final num subtotalBeforeDiscount;
  final num deliveryFeeBeforeDiscount;
  final num subtotal;
  final num deliveryFee;
  final num platformFee;
  final num foodDiscount;
  final num deliveryDiscount;
  final num totalDiscount;
  final num totalAmount;

  const CheckoutPricing({
    required this.subtotalBeforeDiscount,
    required this.deliveryFeeBeforeDiscount,
    required this.subtotal,
    required this.deliveryFee,
    required this.platformFee,
    required this.foodDiscount,
    required this.deliveryDiscount,
    required this.totalDiscount,
    required this.totalAmount,
  });

  factory CheckoutPricing.fromJson(Map<String, dynamic> j) {
    return CheckoutPricing(
      subtotalBeforeDiscount: (j['subtotal_before_discount'] as num?) ?? 0,
      deliveryFeeBeforeDiscount:
          (j['delivery_fee_before_discount'] as num?) ?? 0,
      subtotal: (j['subtotal'] as num?) ?? 0,
      deliveryFee: (j['delivery_fee'] as num?) ?? 0,
      platformFee: (j['platform_fee'] as num?) ?? 0,
      foodDiscount: (j['food_discount'] as num?) ?? 0,
      deliveryDiscount: (j['delivery_discount'] as num?) ?? 0,
      totalDiscount: (j['total_discount'] as num?) ?? 0,
      totalAmount: (j['total_amount'] as num?) ?? 0,
    );
  }
}

class CheckoutPreviewResponse {
  final CheckoutMode mode;
  final CheckoutMerchantInfo merchant;
  final CheckoutDeliveryInfo? delivery;
  final CheckoutDineInInfo? dineIn;
  final CheckoutCartInfo cart;
  final CheckoutPaymentInfo payment;
  final CheckoutPromotions promotions;
  final CheckoutPricing pricing;

  const CheckoutPreviewResponse({
    required this.mode,
    required this.merchant,
    required this.delivery,
    required this.dineIn,
    required this.cart,
    required this.payment,
    required this.promotions,
    required this.pricing,
  });

  bool get isDelivery => mode == CheckoutMode.delivery;
  bool get isDineIn => mode == CheckoutMode.dineIn;

  factory CheckoutPreviewResponse.fromJson(Map<String, dynamic> j) {
    final type = (j['type'] ?? 'delivery').toString();

    return CheckoutPreviewResponse(
      mode: type == 'dine_in' ? CheckoutMode.dineIn : CheckoutMode.delivery,
      merchant: CheckoutMerchantInfo.fromJson(
        (j['merchant'] as Map).cast<String, dynamic>(),
      ),
      delivery: j['delivery'] is Map
          ? CheckoutDeliveryInfo.fromJson(
              (j['delivery'] as Map).cast<String, dynamic>(),
            )
          : null,
      dineIn: j['dine_in'] is Map
          ? CheckoutDineInInfo.fromJson(
              (j['dine_in'] as Map).cast<String, dynamic>(),
            )
          : null,
      cart: CheckoutCartInfo.fromJson(
        (j['cart'] as Map).cast<String, dynamic>(),
      ),
      payment: CheckoutPaymentInfo.fromJson(
        (j['payment'] as Map).cast<String, dynamic>(),
      ),
      promotions: CheckoutPromotions.fromJson(
        (j['promotions'] as Map).cast<String, dynamic>(),
      ),
      pricing: CheckoutPricing.fromJson(
        (j['pricing'] as Map).cast<String, dynamic>(),
      ),
    );
  }
}

class CheckoutParams {
  final CheckoutMode mode;
  final String merchantId;
  final String tableSessionId;

  const CheckoutParams.delivery({required this.merchantId})
    : mode = CheckoutMode.delivery,
      tableSessionId = '';

  const CheckoutParams.dineIn({required this.tableSessionId})
    : mode = CheckoutMode.dineIn,
      merchantId = '';

  String get key => mode == CheckoutMode.delivery ? merchantId : tableSessionId;

  @override
  bool operator ==(Object other) {
    return other is CheckoutParams && other.mode == mode && other.key == key;
  }

  @override
  int get hashCode => Object.hash(mode, key);
}

class PaymentGatewayReturn {
  final String? gateway;
  final String? status;
  final String? orderId;
  final String? orderNumber;
  final String? code;
  final String? message;

  const PaymentGatewayReturn({
    required this.gateway,
    required this.status,
    required this.orderId,
    required this.orderNumber,
    required this.code,
    required this.message,
  });

  bool get isSuccess => status == 'success';
  bool get isFailed => status == 'failed' || status == 'error';

  factory PaymentGatewayReturn.fromUri(Uri uri) {
    return PaymentGatewayReturn(
      gateway: uri.queryParameters['gateway'],
      status: uri.queryParameters['status'],
      orderId: uri.queryParameters['order_id'],
      orderNumber: uri.queryParameters['order_number'],
      code: uri.queryParameters['code'],
      message: uri.queryParameters['message'],
    );
  }
}

class CheckoutResultArgs {
  final PlaceOrderResponse result;
  final PaymentGatewayReturn? paymentReturn;

  const CheckoutResultArgs({required this.result, this.paymentReturn});
}
