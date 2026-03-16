import 'dart:io';

import 'package:customer/features/merchant/presentation/viewmodels/product_review_submit_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProductReviewSubmitController
    extends StateNotifier<ProductReviewSubmitState> {
  ProductReviewSubmitController(this._repo)
    : super(const ProductReviewSubmitState.initial());

  final dynamic _repo;

  Future<bool> createReview({
    required String orderId,
    required String merchantId,
    required String productId,
    required int rating,
    required String comment,
    List<File> newImages = const [],
    File? newVideo,
  }) async {
    if (!mounted) return false;
    state = state.copyWith(submitting: true, error: null);

    try {
      await _repo.createProductReview(
        orderId: orderId,
        merchantId: merchantId,
        productId: productId,
        rating: rating,
        comment: comment,
        newImages: newImages,
        newVideo: newVideo,
      );

      if (!mounted) return false;
      state = state.copyWith(submitting: false, error: null);
      return true;
    } catch (e) {
      if (!mounted) return false;
      state = state.copyWith(submitting: false, error: 'Gửi đánh giá thất bại');
      return false;
    }
  }

  Future<bool> updateReview({
    required String reviewId,
    required int rating,
    required String comment,
    List<String> keptRemoteImageUrls = const [],
    String? keptRemoteVideoUrl,
    List<File> newImages = const [],
    File? newVideo,
  }) async {
    if (!mounted) return false;
    state = state.copyWith(submitting: true, error: null);

    try {
      await _repo.updateProductReview(
        reviewId: reviewId,
        rating: rating,
        comment: comment,
        keptRemoteImageUrls: keptRemoteImageUrls,
        keptRemoteVideoUrl: keptRemoteVideoUrl,
        newImages: newImages,
        newVideo: newVideo,
      );

      if (!mounted) return false;
      state = state.copyWith(submitting: false, error: null);
      return true;
    } catch (e) {
      if (!mounted) return false;
      state = state.copyWith(
        submitting: false,
        error: 'Cập nhật đánh giá thất bại',
      );
      return false;
    }
  }

  Future<bool> deleteReview(String reviewId) async {
    if (!mounted) return false;
    state = state.copyWith(deleting: true, error: null);

    try {
      await _repo.deleteProductReview(reviewId);

      if (!mounted) return false;
      state = state.copyWith(deleting: false, error: null);
      return true;
    } catch (e) {
      if (!mounted) return false;
      state = state.copyWith(deleting: false, error: 'Xoá đánh giá thất bại');
      return false;
    }
  }
}
