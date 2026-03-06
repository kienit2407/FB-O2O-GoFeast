import 'package:customer/features/addresses/data/models/saved_address_models.dart';
import 'package:flutter/foundation.dart';

// address_state.dart
@immutable
class AddressState {
  final bool isFetching;
  final bool didLoad; // ✅ add
  final CurrentLocation? current;
  final List<SavedAddress> saved;
  final String? error;

  const AddressState({
    this.isFetching = false,
    this.didLoad = false, // ✅ add
    this.current,
    this.saved = const [],
    this.error,
  });

  const AddressState.initial() : this();

  AddressState copyWith({
    bool? isFetching,
    bool? didLoad, // ✅ add
    CurrentLocation? current,
    List<SavedAddress>? saved,
    String? error,
  }) {
    return AddressState(
      isFetching: isFetching ?? this.isFetching,
      didLoad: didLoad ?? this.didLoad,
      current: current ?? this.current,
      saved: saved ?? this.saved,
      error: error,
    );
  }
}