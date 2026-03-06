
class UrlConfig {
  static String backendBaseUrl = 'http://localhost:4000';
  static const String frontendBaseUrl = 'http://localhost:8080';
  // oauth start
  static String customerGoogleOAuth() =>
      '$backendBaseUrl/auth/oauth/google?actor=customer&app=customer_mobile';

  static String customerGithubOAuth() =>
      '$backendBaseUrl/auth/oauth/github?actor=customer&app=customer_mobile';
  // api
  static const refreshToken = '/auth/customer/refresh';
  static const customerMe = '/auth/customer/me';
  static const customerLogout = '/auth/customer/logout';

  static const String refreshResponse = 'accessToken';
  static const String accessResponse = 'refreshToken';

  static const customerDeviceRegister = '/auth/customer/device/register';
  static const emmbedMapUrl = 'https://maps.track-asia.com/styles/v2/streets.json?key=56f5e4e349d7d86b7dec17705331965eec';
}
