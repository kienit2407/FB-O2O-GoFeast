import 'package:driver/features/earnings/data/models/driver_earnings_models.dart';
import 'package:driver/features/earnings/data/repository/driver_earnings_repository.dart';
import 'package:driver/features/earnings/presentation/viewmodels/driver_earnings_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DriverEarningsController extends StateNotifier<DriverEarningsState> {
  DriverEarningsController({required DriverEarningsRepository repo})
    : _repo = repo,
      super(DriverEarningsState.initial()) {
    load();
  }

  final DriverEarningsRepository _repo;

  Future<void> load({bool refresh = false}) async {
    if (state.isLoading || state.isRefreshing) return;

    if (refresh) {
      state = state.copyWith(isRefreshing: true, clearError: true);
    } else {
      state = state.copyWith(isLoading: true, clearError: true);
    }

    try {
      final range = state.range;
      final selectedDate = state.selectedDate;

      final results = await Future.wait([
        _repo.getSummary(range: range, date: selectedDate),
        _repo.getHistory(range: range, date: selectedDate, page: 1, limit: 50),
      ]);

      final summary = results[0] as DriverEarningsSummary;
      final history = results[1] as DriverEarningsHistoryResponse;

      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        summary: summary,
        items: history.items,
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: e.toString(),
      );
    }
  }

  Future<void> setRange(DriverEarningsRange range) async {
    if (state.range == range) return;
    state = state.copyWith(range: range, clearError: true);
    await load();
  }

  Future<void> setDate(DateTime date) async {
    final normalized = DateTime(date.year, date.month, date.day);

    final current = state.selectedDate;
    final same =
        current.year == normalized.year &&
        current.month == normalized.month &&
        current.day == normalized.day;

    if (same) return;

    state = state.copyWith(selectedDate: normalized, clearError: true);
    await load();
  }
}
