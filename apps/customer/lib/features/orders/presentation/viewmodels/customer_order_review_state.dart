import 'package:customer/features/orders/data/models/customer_review_models.dart';

class CustomerOrderReviewState {
  final bool loading;
  final bool submitting;
  final String? error;
  final CustomerOrderReviewStatusModel? status;

  const CustomerOrderReviewState({
    required this.loading,
    required this.submitting,
    required this.error,
    required this.status,
  });

  factory CustomerOrderReviewState.initial() {
    return const CustomerOrderReviewState(
      loading: false,
      submitting: false,
      error: null,
      status: null,
    );
  }

  CustomerOrderReviewState copyWith({
    bool? loading,
    bool? submitting,
    String? error,
    bool clearError = false,
    CustomerOrderReviewStatusModel? status,
  }) {
    return CustomerOrderReviewState(
      loading: loading ?? this.loading,
      submitting: submitting ?? this.submitting,
      error: clearError ? null : (error ?? this.error),
      status: status ?? this.status,
    );
  }
}