import 'package:customer/app/theme/app_color.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppTheme {
  static final appTheme = ThemeData(
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColor.background,
    fontFamily: 'Inter',
    fontFamilyFallback: ['Inter'],
    appBarTheme: AppBarTheme(
      systemOverlayStyle: SystemUiOverlayStyle(
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.light,
      ),
    ),
  );
}
