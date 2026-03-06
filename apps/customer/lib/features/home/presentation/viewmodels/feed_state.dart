import 'package:customer/features/home/data/models/feed_home_model.dart';
import 'package:flutter/foundation.dart';

@immutable
class FeedState {
  final bool isLoading;
  final FeedHomeResponse? data;
  final String? error;

  final double? lastLat;
  final double? lastLng;

  const FeedState({
    this.isLoading = false,
    this.data,
    this.error,
    this.lastLat,
    this.lastLng,
  });

  const FeedState.initial() : this();

  FeedState copyWith({
    bool? isLoading,
    FeedHomeResponse? data,
    String? error,
    double? lastLat,
    double? lastLng,
  }) {
    return FeedState(
      isLoading: isLoading ?? this.isLoading,
      data: data ?? this.data,
      error: error,
      lastLat: lastLat ?? this.lastLat,
      lastLng: lastLng ?? this.lastLng,
    );
  }
}
