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
  final String? licenseType; // A1/A2/B1/B2
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
    return DriverProfile(
      idCardNumber: j['id_card_number'],
      idCardFrontUrl: j['id_card_front_url'],
      idCardBackUrl: j['id_card_back_url'],
      licenseNumber: j['license_number'],
      licenseType: j['license_type'],
      licenseImageUrl: j['license_image_url'],
      licenseExpiry: j['license_expiry'] != null
          ? DateTime.tryParse(j['license_expiry'])
          : null,
      vehicleBrand: j['vehicle_brand'],
      vehicleModel: j['vehicle_model'],
      vehiclePlate: j['vehicle_plate'],
      vehicleImageUrl: j['vehicle_image_url'],
      verificationStatus: parseDriverStatus(j['verification_status']),
      verificationReasons:
          (j['verification_reasons'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      verificationNote: j['verification_note'],
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
    final p = j['driver_profile'];
    return DriverMe(
      id: (j['id'] ?? j['_id'] ?? '').toString(),
      email: j['email'],
      phone: j['phone'],
      fullName: j['full_name'],
      role: (j['role'] ?? '').toString(),
      avatarUrl: j['avatar_url'],
      driverProfile: (p is Map<String, dynamic>)
          ? DriverProfile.fromJson(p)
          : null,
    );
  }
}
