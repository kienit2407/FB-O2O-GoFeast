import 'package:customer/core/di/providers.dart';
import 'package:customer/features/orders/data/models/customer_review_models.dart';
import 'package:customer/features/orders/presentation/viewmodels/customer_order_review_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final customerOrderReviewControllerProvider =
    StateNotifierProvider.family<
      CustomerOrderReviewController,
      CustomerOrderReviewState,
      String
    >((ref, orderId) {
      final repo = ref.read(myOrdersRepositoryProvider);
      return CustomerOrderReviewController(repo, orderId);
    });

class CustomerOrderReviewController
    extends StateNotifier<CustomerOrderReviewState> {
  CustomerOrderReviewController(this._repo, this.orderId)
    : super(CustomerOrderReviewState.initial());

  final dynamic _repo;
  final String orderId;

  Future<void> load() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final data = await _repo.fetchOrderReviewStatus(orderId);
      state = state.copyWith(loading: false, status: data);
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: 'Không tải được trạng thái đánh giá',
      );
    }
  }

  Future<bool> submitByTarget(
    CustomerReviewTarget target,
    CustomerReviewSubmitInput input, {
    String? reviewId,
  }) async {
    state = state.copyWith(submitting: true, clearError: true);

    try {
      switch (target) {
        case CustomerReviewTarget.merchant:
          if ((reviewId ?? '').isNotEmpty) {
            await _repo.updateMerchantReview(reviewId!, input);
          } else {
            await _repo.createMerchantReview(input);
          }
          break;
        case CustomerReviewTarget.driver:
          if ((reviewId ?? '').isNotEmpty) {
            await _repo.updateDriverReview(reviewId!, input);
          } else {
            await _repo.createDriverReview(input);
          }
          break;
        case CustomerReviewTarget.product:
          if ((reviewId ?? '').isNotEmpty) {
            await _repo.updateProductReview(reviewId!, input);
          } else {
            await _repo.createProductReview(input);
          }
          break;
      }

      final fresh = await _repo.fetchOrderReviewStatus(orderId);
      state = state.copyWith(submitting: false, status: fresh);
      return true;
    } catch (e) {
      state = state.copyWith(submitting: false, error: 'Gửi đánh giá thất bại');
      return false;
    }
  }

  Future<bool> deleteByTarget(
    CustomerReviewTarget target,
    String reviewId,
  ) async {
    state = state.copyWith(submitting: true, clearError: true);

    try {
      switch (target) {
        case CustomerReviewTarget.merchant:
          await _repo.deleteMyMerchantReview(reviewId);
          break;
        case CustomerReviewTarget.driver:
          await _repo.deleteMyDriverReview(reviewId);
          break;
        case CustomerReviewTarget.product:
          await _repo.deleteMyProductReview(reviewId);
          break;
      }

      final fresh = await _repo.fetchOrderReviewStatus(orderId);
      state = state.copyWith(submitting: false, status: fresh);
      return true;
    } catch (e) {
      state = state.copyWith(submitting: false, error: 'Xoá đánh giá thất bại');
      return false;
    }
  }
}
