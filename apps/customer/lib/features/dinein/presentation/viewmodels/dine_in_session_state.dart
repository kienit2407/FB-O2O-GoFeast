import 'package:customer/features/dinein/data/models/dine_in_models.dart';

class DineInSessionState {
  final bool isLoading;
  final bool isEntering;
  final String? error;
  final DineInContext? context;

  const DineInSessionState({
    this.isLoading = false,
    this.isEntering = false,
    this.error,
    this.context,
  });

  DineInSessionState copyWith({
    bool? isLoading,
    bool? isEntering,
    String? error,
    DineInContext? context,
    bool clearError = false,
    bool clearContext = false,
  }) {
    return DineInSessionState(
      isLoading: isLoading ?? this.isLoading,
      isEntering: isEntering ?? this.isEntering,
      error: clearError ? null : (error ?? this.error),
      context: clearContext ? null : (context ?? this.context),
    );
  }

  bool get hasActiveSession => context != null;
}
