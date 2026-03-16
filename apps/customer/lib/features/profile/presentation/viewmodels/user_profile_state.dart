class UserProfileState {
  final bool isSaving;
  final bool isUploadingAvatar;
  final String? error;

  const UserProfileState({
    this.isSaving = false,
    this.isUploadingAvatar = false,
    this.error,
  });

  UserProfileState copyWith({
    bool? isSaving,
    bool? isUploadingAvatar,
    String? error,
    bool clearError = false,
  }) {
    return UserProfileState(
      isSaving: isSaving ?? this.isSaving,
      isUploadingAvatar: isUploadingAvatar ?? this.isUploadingAvatar,
      error: clearError ? null : (error ?? this.error),
    );
  }

  bool get isBusy => isSaving || isUploadingAvatar;
}
