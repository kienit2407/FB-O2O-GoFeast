import '../../data/models/checkout_models.dart';

class CheckoutState {
  final bool isLoading;
  final bool isPlacing;
  final String? error;

  final CheckoutPreviewResponse? preview;
  final PlaceOrderResponse? placedOrder;

  final CheckoutPaymentMethod paymentMethod;
  final String voucherCode;
  final String orderNote;

  // delivery input
  final double? lat;
  final double? lng;
  final String address;
  final String receiverName;
  final String receiverPhone;
  final String addressNote;

  const CheckoutState({
    this.isLoading = false,
    this.isPlacing = false,
    this.error,
    this.preview,
    this.placedOrder,
    this.paymentMethod = CheckoutPaymentMethod.cash,
    this.voucherCode = '',
    this.orderNote = '',
    this.lat,
    this.lng,
    this.address = '',
    this.receiverName = '',
    this.receiverPhone = '',
    this.addressNote = '',
  });

  CheckoutState copyWith({
    bool? isLoading,
    bool? isPlacing,
    String? error,
    CheckoutPreviewResponse? preview,
    PlaceOrderResponse? placedOrder,
    CheckoutPaymentMethod? paymentMethod,
    String? voucherCode,
    String? orderNote,
    double? lat,
    double? lng,
    String? address,
    String? receiverName,
    String? receiverPhone,
    String? addressNote,
    bool clearError = false,
    bool clearPlacedOrder = false,
  }) {
    return CheckoutState(
      isLoading: isLoading ?? this.isLoading,
      isPlacing: isPlacing ?? this.isPlacing,
      error: clearError ? null : (error ?? this.error),
      preview: preview ?? this.preview,
      placedOrder: clearPlacedOrder ? null : (placedOrder ?? this.placedOrder),
      paymentMethod: paymentMethod ?? this.paymentMethod,
      voucherCode: voucherCode ?? this.voucherCode,
      orderNote: orderNote ?? this.orderNote,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      address: address ?? this.address,
      receiverName: receiverName ?? this.receiverName,
      receiverPhone: receiverPhone ?? this.receiverPhone,
      addressNote: addressNote ?? this.addressNote,
    );
  }

  bool get canPlaceOrder => preview != null && !isPlacing;
}
