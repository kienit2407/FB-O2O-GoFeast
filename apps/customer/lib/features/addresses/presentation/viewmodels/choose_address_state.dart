import 'package:flutter/foundation.dart';
import '../../data/models/reverse_suggest_models.dart';

@immutable
class ChooseAddressState {
  final bool isLoading;
  final double? lat;
  final double? lng;
  final String? pinnedAddress;
  final List<ReverseSuggestItem> suggestions;
  final String? error;

  const ChooseAddressState({
    this.isLoading = false,
    this.lat,
    this.lng,
    this.pinnedAddress,
    this.suggestions = const [],
    this.error,
  });

  const ChooseAddressState.initial() : this();

  ChooseAddressState copyWith({
    bool? isLoading,
    double? lat,
    double? lng,
    String? pinnedAddress,
    List<ReverseSuggestItem>? suggestions,
    String? error,
  }) {
    return ChooseAddressState(
      isLoading: isLoading ?? this.isLoading,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      pinnedAddress: pinnedAddress ?? this.pinnedAddress,
      suggestions: suggestions ?? this.suggestions,
      error: error,
    );
  }
}