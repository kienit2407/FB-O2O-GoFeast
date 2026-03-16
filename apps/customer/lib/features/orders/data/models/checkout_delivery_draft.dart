class CheckoutDeliveryDraft {
  final double lat;
  final double lng;
  final String address;
  final String receiverName;
  final String receiverPhone;
  final String addressNote;

  const CheckoutDeliveryDraft({
    required this.lat,
    required this.lng,
    required this.address,
    required this.receiverName,
    required this.receiverPhone,
    this.addressNote = '',
  });
}