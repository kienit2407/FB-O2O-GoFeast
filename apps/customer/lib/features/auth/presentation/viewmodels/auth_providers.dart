import 'package:customer/features/auth/domain/entities/auth_user.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/di/providers.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';
import 'auth_viewmodel.dart';

final authRemoteDataSourceProvider = Provider((ref) {
  final dioClient = ref.read(dioClientProvider);
  return AuthRemoteDataSource(dioClient);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    remote: ref.read(authRemoteDataSourceProvider),
    tokenStorage: ref.read(tokenStorageProvider),
  );
});

final authViewModelProvider =
    AsyncNotifierProvider<AuthViewModel, AuthUser?>(AuthViewModel.new);