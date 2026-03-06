import '../../data/models/merchant_detail_model.dart';

class MerchantDetailState {
  final bool isLoading;
  final String? error;
  final MerchantDetailResponse? data;

  const MerchantDetailState({
    this.isLoading = false,
    this.error,
    this.data,
  });

  MerchantDetailState copyWith({
    bool? isLoading,
    String? error,
    MerchantDetailResponse? data,
  }) {
    return MerchantDetailState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      data: data ?? this.data,
    );
  }
}