import 'package:driver/features/auth/data/models/driver_models.dart';

class DriverLiveState {
  final bool isBootstrapping;
  final bool isTracking;
  final bool isUpdatingAvailability;
  final bool isSendingLocation;

  final bool acceptFoodOrders;
  final DriverVerificationStatus verificationStatus;

  final double? lat;
  final double? lng;
  final double? accuracy;
  final DateTime? lastLocationUpdate;

  final String? error;

  const DriverLiveState({
    this.isBootstrapping = false,
    this.isTracking = false,
    this.isUpdatingAvailability = false,
    this.isSendingLocation = false,
    this.acceptFoodOrders = false,
    this.verificationStatus = DriverVerificationStatus.draft,
    this.lat,
    this.lng,
    this.accuracy,
    this.lastLocationUpdate,
    this.error,
  });

  bool get canGoOnline =>
      verificationStatus == DriverVerificationStatus.approved;

  DriverLiveState copyWith({
    bool? isBootstrapping,
    bool? isTracking,
    bool? isUpdatingAvailability,
    bool? isSendingLocation,
    bool? acceptFoodOrders,
    DriverVerificationStatus? verificationStatus,
    double? lat,
    double? lng,
    double? accuracy,
    DateTime? lastLocationUpdate,
    String? error,
    bool clearError = false,
  }) {
    return DriverLiveState(
      isBootstrapping: isBootstrapping ?? this.isBootstrapping,
      isTracking: isTracking ?? this.isTracking,
      isUpdatingAvailability:
          isUpdatingAvailability ?? this.isUpdatingAvailability,
      isSendingLocation: isSendingLocation ?? this.isSendingLocation,
      acceptFoodOrders: acceptFoodOrders ?? this.acceptFoodOrders,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      accuracy: accuracy ?? this.accuracy,
      lastLocationUpdate: lastLocationUpdate ?? this.lastLocationUpdate,
      error: clearError ? null : (error ?? this.error),
    );
  }
}
