import 'package:driver/features/auth/data/models/driver_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'driver_auth_viewmodel.dart';

final driverAuthViewModelProvider =
    AsyncNotifierProvider<DriverAuthViewModel, DriverMe?>(DriverAuthViewModel.new);