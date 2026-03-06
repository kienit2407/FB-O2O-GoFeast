import 'package:flutter/foundation.dart';
import '../../data/models/carousel_banner_model.dart';

@immutable
class BannerState {
  final bool isLoading;
  final List<CarouselBannerModel> items;
  final String? error;

  const BannerState({
    this.isLoading = false,
    this.items = const [],
    this.error,
  });

  const BannerState.initial() : this();

  BannerState copyWith({
    bool? isLoading,
    List<CarouselBannerModel>? items,
    String? error,
  }) {
    return BannerState(
      isLoading: isLoading ?? this.isLoading,
      items: items ?? this.items,
      error: error,
    );
  }
}
