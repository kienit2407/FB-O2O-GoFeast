import 'dart:async';

import 'package:customer/features/dinein/data/models/dine_in_models.dart';
import 'package:customer/features/dinein/data/repositories/dine_in_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'dine_in_session_state.dart';

class DineInSessionController extends StateNotifier<DineInSessionState> {
  DineInSessionController(this._repo) : super(const DineInSessionState());

  final DineInRepository _repo;

  Future<DineInResolveTableResponse> resolveTable(String tableId) {
    return _repo.resolveTable(tableId);
  }

  Future<DineInContext?> restore() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final saved = await _repo.readSavedContext();
      if (saved == null) {
        state = state.copyWith(isLoading: false, clearContext: true);
        return null;
      }

      final current = await _repo.getCurrentSession(saved.dineInToken);
      final ctx = DineInContext.fromEnterTableResponse(current);

      await _repo.saveContext(ctx);
      state = state.copyWith(isLoading: false, context: ctx);
      return ctx;
    } catch (e) {
      await _repo.clearSavedContext();
      state = state.copyWith(
        isLoading: false,
        clearContext: true,
        error: e.toString(),
      );
      return null;
    }
  }

  Future<DineInContext> enterTable({
    required String tableId,
    String? guestName,
  }) async {
    state = state.copyWith(isEntering: true, clearError: true);

    try {
      final res = await _repo.enterTable(
        tableId: tableId,
        guestName: guestName,
      );

      final ctx = DineInContext.fromEnterTableResponse(res);
      await _repo.saveContext(ctx);

      state = state.copyWith(isEntering: false, context: ctx);

      return ctx;
    } catch (e) {
      state = state.copyWith(isEntering: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> leaveTable() async {
    final current = state.context;
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      if (current != null) {
        await _repo.leaveTable(current.dineInToken);
      }
    } catch (_) {
      // phase này nuốt lỗi nhẹ nhàng, vẫn clear local
    } finally {
      await _repo.clearSavedContext();
      state = state.copyWith(isLoading: false, clearContext: true);
    }
  }

  Future<void> clearOnlyLocal() async {
    await _repo.clearSavedContext();
    state = state.copyWith(clearContext: true);
  }

  Future<void> clearContext() async {
    await _repo.clearStoredContext();
    state = const DineInSessionState();
  }

  Future<void> setContext(DineInContext context) async {
    await _repo.saveContext(context);
    state = state.copyWith(context: context, clearError: true);
  }
}
