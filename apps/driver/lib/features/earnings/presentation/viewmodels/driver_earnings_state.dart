import 'package:driver/features/earnings/data/models/driver_earnings_models.dart';

class DriverEarningsState {
  final bool isLoading;
  final bool isRefreshing;
  final DriverEarningsRange range;
  final DateTime selectedDate;
  final DriverEarningsSummary? summary;
  final List<DriverEarningsHistoryItem> items;
  final String? error;

  const DriverEarningsState({
    this.isLoading = false,
    this.isRefreshing = false,
    this.range = DriverEarningsRange.day,
    required this.selectedDate,
    this.summary,
    this.items = const [],
    this.error,
  });

  factory DriverEarningsState.initial() {
    final now = DateTime.now();
    return DriverEarningsState(
      selectedDate: DateTime(now.year, now.month, now.day),
    );
  }

  DriverEarningsState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    DriverEarningsRange? range,
    DateTime? selectedDate,
    DriverEarningsSummary? summary,
    List<DriverEarningsHistoryItem>? items,
    String? error,
    bool clearError = false,
    bool clearData = false,
  }) {
    return DriverEarningsState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      range: range ?? this.range,
      selectedDate: selectedDate ?? this.selectedDate,
      summary: clearData ? null : (summary ?? this.summary),
      items: clearData ? const [] : (items ?? this.items),
      error: clearError ? null : (error ?? this.error),
    );
  }
}
