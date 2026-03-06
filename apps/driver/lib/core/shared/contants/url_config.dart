
class UrlConfig {
  static String backendBaseUrl = 'http://localhost:4000'; 
  static const String frontendBaseUrl = 'http://localhost:8080';
  // oauth start
  static String driverGoogleOAuth() =>
      '$backendBaseUrl/auth/oauth/google?actor=driver&app=driver_mobile';

  static String driverGithubOAuth() =>
      '$backendBaseUrl/auth/oauth/github?actor=driver&app=driver_mobile';
  // api
  static const refreshToken = '/auth/driver/refresh';
  static const driverMe = '/auth/driver/me';
  static const driverLogout = '/auth/driver/logout';

  static const String accessResponse = 'accessToken';
  static const String refreshResponse = 'refreshToken';

  static const driverDeviceRegister = '/auth/driver/device/register';
}
