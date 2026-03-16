import 'package:flutter/foundation.dart';

const _unset = Object();

@immutable
class ProductReviewSubmitState {
  final bool submitting;
  final bool deleting;
  final String? error;

  const ProductReviewSubmitState({
    this.submitting = false,
    this.deleting = false,
    this.error,
  });

  const ProductReviewSubmitState.initial() : this();

  ProductReviewSubmitState copyWith({
    bool? submitting,
    bool? deleting,
    Object? error = _unset,
  }) {
    return ProductReviewSubmitState(
      submitting: submitting ?? this.submitting,
      deleting: deleting ?? this.deleting,
      error: identical(error, _unset) ? this.error : error as String?,
    );
  }
}
