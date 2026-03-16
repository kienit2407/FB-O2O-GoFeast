enum DriverVerificationStatus { draft, pending, approved, rejected }

DriverVerificationStatus parseDriverStatus(String? s) {
  switch (s) {
    case 'pending':
      return DriverVerificationStatus.pending;
    case 'approved':
      return DriverVerificationStatus.approved;
    case 'rejected':
      return DriverVerificationStatus.rejected;
    case 'draft':
    default:
      return DriverVerificationStatus.draft;
  }
}

class DriverProfile {
  final String? idCardNumber;
  final String? idCardFrontUrl;
  final String? idCardBackUrl;

  final String? licenseNumber;
  final String? licenseType;
  final String? licenseImageUrl;
  final DateTime? licenseExpiry;

  final String? vehicleBrand;
  final String? vehicleModel;
  final String? vehiclePlate;
  final String? vehicleImageUrl;

  final DriverVerificationStatus verificationStatus;
  final List<String> verificationReasons;
  final String? verificationNote;

  DriverProfile({
    required this.verificationStatus,
    this.idCardNumber,
    this.idCardFrontUrl,
    this.idCardBackUrl,
    this.licenseNumber,
    this.licenseType,
    this.licenseImageUrl,
    this.licenseExpiry,
    this.vehicleBrand,
    this.vehicleModel,
    this.vehiclePlate,
    this.vehicleImageUrl,
    this.verificationReasons = const [],
    this.verificationNote,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> j) {
    final reasonsRaw = j['verification_reasons'] ?? j['verificationReasons'];

    return DriverProfile(
      idCardNumber:
          j['id_card_number']?.toString() ?? j['idCardNumber']?.toString(),
      idCardFrontUrl:
          j['id_card_front_url']?.toString() ?? j['idCardFrontUrl']?.toString(),
      idCardBackUrl:
          j['id_card_back_url']?.toString() ?? j['idCardBackUrl']?.toString(),
      licenseNumber:
          j['license_number']?.toString() ?? j['licenseNumber']?.toString(),
      licenseType:
          j['license_type']?.toString() ?? j['licenseType']?.toString(),
      licenseImageUrl:
          j['license_image_url']?.toString() ??
          j['licenseImageUrl']?.toString(),
      licenseExpiry: (j['license_expiry'] ?? j['licenseExpiry']) != null
          ? DateTime.tryParse(
              (j['license_expiry'] ?? j['licenseExpiry']).toString(),
            )
          : null,
      vehicleBrand:
          j['vehicle_brand']?.toString() ?? j['vehicleBrand']?.toString(),
      vehicleModel:
          j['vehicle_model']?.toString() ?? j['vehicleModel']?.toString(),
      vehiclePlate:
          j['vehicle_plate']?.toString() ?? j['vehiclePlate']?.toString(),
      vehicleImageUrl:
          j['vehicle_image_url']?.toString() ??
          j['vehicleImageUrl']?.toString(),
      verificationStatus: parseDriverStatus(
        (j['verification_status'] ?? j['verificationStatus'])?.toString(),
      ),
      verificationReasons: reasonsRaw is List
          ? reasonsRaw.map((e) => e.toString()).toList()
          : const [],
      verificationNote:
          j['verification_note']?.toString() ??
          j['verificationNote']?.toString(),
    );
  }
}

class DriverMe {
  final String id;
  final String? email;
  final String? phone;
  final String? fullName;
  final String role;
  final String? avatarUrl;
  final DriverProfile? driverProfile;

  DriverMe({
    required this.id,
    required this.role,
    this.email,
    this.phone,
    this.fullName,
    this.avatarUrl,
    this.driverProfile,
  });

  DriverVerificationStatus get status =>
      driverProfile?.verificationStatus ?? DriverVerificationStatus.draft;

  factory DriverMe.fromJson(Map<String, dynamic> j) {
    final p = j['driver_profile'] ?? j['driverProfile'];

    return DriverMe(
      id: (j['id'] ?? j['_id'] ?? '').toString(),
      email: j['email']?.toString(),
      phone: j['phone']?.toString(),
      fullName: (j['full_name'] ?? j['fullName'])?.toString(),
      role: (j['role'] ?? '').toString(),
      avatarUrl: (j['avatar_url'] ?? j['avatarUrl'])?.toString(),
      driverProfile: p is Map
          ? DriverProfile.fromJson(Map<String, dynamic>.from(p))
          : null,
    );
  }

  @override
  String toString() {
    return 'DriverMe(id: $id, role: $role, status: $status)';
  }
}
