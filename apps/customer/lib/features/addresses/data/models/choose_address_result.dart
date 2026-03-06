class ChooseAddressResult {
  final String address;
  final double lat;
  final double lng;
  final String? name;

  const ChooseAddressResult({
    required this.address,
    required this.lat,
    required this.lng,
    this.name,
  });
}
