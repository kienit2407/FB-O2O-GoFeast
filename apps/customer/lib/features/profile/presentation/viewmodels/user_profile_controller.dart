import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:customer/features/profile/data/repository/user_profile_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'user_profile_state.dart';

class UserProfileController extends StateNotifier<UserProfileState> {
  UserProfileController(this.ref, this._repo) : super(const UserProfileState());

  final Ref ref;
  final UserProfileRepository _repo;

  Future<void> updateProfile({
    String? fullName,
    String? phone,
    String? gender,
    DateTime? dateOfBirth,
    bool clearGender = false,
    bool clearDateOfBirth = false,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);

    try {
      await _repo.updateProfile(
        fullName: fullName,
        phone: phone,
        gender: gender,
        dateOfBirth: dateOfBirth,
        clearGender: clearGender,
        clearDateOfBirth: clearDateOfBirth,
      );

      await ref.read(authViewModelProvider.notifier).refreshMe();
      state = state.copyWith(isSaving: false);
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> uploadAvatar(String filePath) async {
    state = state.copyWith(isUploadingAvatar: true, clearError: true);

    try {
      await _repo.uploadAvatar(filePath);
      await ref.read(authViewModelProvider.notifier).refreshMe();
      state = state.copyWith(isUploadingAvatar: false);
    } catch (e) {
      state = state.copyWith(isUploadingAvatar: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> removeAvatar() async {
    state = state.copyWith(isUploadingAvatar: true, clearError: true);

    try {
      await _repo.removeAvatar();
      await ref.read(authViewModelProvider.notifier).refreshMe();
      state = state.copyWith(isUploadingAvatar: false);
    } catch (e) {
      state = state.copyWith(isUploadingAvatar: false, error: e.toString());
      rethrow;
    }
  }
}
