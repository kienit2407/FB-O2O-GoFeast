import 'package:driver/features/auth/data/models/driver_models.dart';

class DriverAuthState {
  final bool isLoading;
  final DriverMe? me;
  final String? error;

  const DriverAuthState({this.isLoading = false, this.me, this.error});

  bool get isAuthenticated => me != null;

  DriverVerificationStatus get verificationStatus =>
      me?.status ?? DriverVerificationStatus.draft;

  DriverAuthState copyWith({
    bool? isLoading,
    DriverMe? me,
    String? error,
    bool clearError = false,
  }) {
    return DriverAuthState(
      isLoading: isLoading ?? this.isLoading,
      me: me ?? this.me,
      error: clearError ? null : (error ?? this.error),
    );
  }
}
