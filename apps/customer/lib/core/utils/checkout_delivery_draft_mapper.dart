import 'package:customer/features/auth/domain/entities/auth_user.dart';
import 'package:customer/features/orders/data/models/checkout_delivery_draft.dart';
import 'package:customer/features/orders/presentation/pages/checkout_page.dart';

CheckoutDeliveryDraft? checkoutDraftFromAuth(AuthUser? user) {
  final current = user?.customerProfile?.currentLocation;
  if (user == null && current == null) return null;

  final lat = current?.lat ?? 0;
  final lng = current?.lng ?? 0;
  final address = (current?.address ?? '').trim();
  final receiverName = (current?.receiverName ?? user?.fullName ?? '').trim();
  final receiverPhone = (current?.receiverPhone ?? user?.phone ?? '').trim();
  final addressNote = (current?.deliveryNote ?? '').trim();

  return CheckoutDeliveryDraft(
    lat: lat,
    lng: lng,
    address: address,
    receiverName: receiverName,
    receiverPhone: receiverPhone,
    addressNote: addressNote,
  );
}
