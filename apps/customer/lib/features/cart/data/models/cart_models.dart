// cart_models.dart

enum CartOrderType { delivery, dineIn }

class CartTotals {
  final int itemCount; // sum quantity
  final num totalEstimated; // total after sale
  final num discountEstimated; // total discount from sale

  const CartTotals({
    required this.itemCount,
    required this.totalEstimated,
    required this.discountEstimated,
  });

  const CartTotals.zero()
    : itemCount = 0,
      totalEstimated = 0,
      discountEstimated = 0;

  /// Giá gạch (original) = total + discount
  num get originalEstimated => totalEstimated + discountEstimated;

  factory CartTotals.fromJson(Map<String, dynamic> j) {
    return CartTotals(
      itemCount: (j['item_count'] as num?)?.toInt() ?? 0,
      totalEstimated: (j['total_estimated'] as num?) ?? 0,
      discountEstimated: (j['discount_estimated'] as num?) ?? 0,
    );
  }
}

class CartSummaryResponse {
  final String? cartId;
  final CartTotals summary;

  const CartSummaryResponse({required this.cartId, required this.summary});

  factory CartSummaryResponse.fromJson(Map<String, dynamic> j) {
    return CartSummaryResponse(
      cartId: j['cart_id']?.toString(),
      summary: CartTotals.fromJson(
        (j['summary'] as Map).cast<String, dynamic>(),
      ),
    );
  }
}

class CartResponse {
  final CartData cart;
  final CartTotals summary;

  const CartResponse({required this.cart, required this.summary});

  factory CartResponse.fromJson(Map<String, dynamic> j) {
    return CartResponse(
      cart: CartData.fromJson((j['cart'] as Map).cast<String, dynamic>()),
      summary: CartTotals.fromJson(
        (j['summary'] as Map).cast<String, dynamic>(),
      ),
    );
  }
}

class CartData {
  final String id;
  final String? userId;
  final String merchantId;
  final String orderType; // delivery|dine_in
  final String status; // active|abandoned
  final String? tableId;
  final String? tableSessionId;
  final List<CartLine> items;

  const CartData({
    required this.id,
    required this.userId,
    required this.merchantId,
    required this.orderType,
    required this.status,
    required this.tableId,
    required this.tableSessionId,
    required this.items,
  });

  factory CartData.fromJson(Map<String, dynamic> j) {
    return CartData(
      id: (j['id'] ?? '').toString(),
      userId: j['user_id']?.toString(),
      merchantId: (j['merchant_id'] ?? '').toString(),
      orderType: (j['order_type'] ?? '').toString(),
      status: (j['status'] ?? '').toString(),
      tableId: j['table_id']?.toString(),
      tableSessionId: j['table_session_id']?.toString(),
      items: ((j['items'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => CartLine.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class CartLine {
  final String lineKey;
  final String itemType; // product|topping
  final String? productId;
  final String? toppingId;
  final int quantity;

  final String name;
  final String? imageUrl;

  final num unitPrice;
  final num? basePrice; // null if no sale
  final num itemUnitTotal;
  final num itemTotal;

  final String note;

  /// you might need these later in UI
  final List<dynamic> selectedOptions;
  final List<dynamic> selectedToppings;

  const CartLine({
    required this.lineKey,
    required this.itemType,
    required this.productId,
    required this.toppingId,
    required this.quantity,
    required this.name,
    required this.imageUrl,
    required this.unitPrice,
    required this.basePrice,
    required this.itemUnitTotal,
    required this.itemTotal,
    required this.note,
    required this.selectedOptions,
    required this.selectedToppings,
  });

  factory CartLine.fromJson(Map<String, dynamic> j) {
    return CartLine(
      lineKey: (j['line_key'] ?? '').toString(),
      itemType: (j['item_type'] ?? '').toString(),
      productId: j['product_id']?.toString(),
      toppingId: j['topping_id']?.toString(),
      quantity: (j['quantity'] as num?)?.toInt() ?? 0,
      name: (j['product_name'] ?? '').toString(),
      imageUrl: j['product_image_url']?.toString(),
      unitPrice: (j['unit_price'] as num?) ?? 0,
      basePrice: j['base_price'] as num?,
      itemUnitTotal: (j['item_unit_total'] as num?) ?? 0,
      itemTotal: (j['item_total'] as num?) ?? 0,
      note: (j['note'] ?? '').toString(),
      selectedOptions: (j['selected_options'] as List?) ?? const [],
      selectedToppings: (j['selected_toppings'] as List?) ?? const [],
    );
  }
}
