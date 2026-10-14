class AppConfig {
  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    this.googleClientId = '',
    this.appleClientId = '',
  });

  final String environment;
  final String apiBaseUrl;
  final String googleClientId;
  final String appleClientId;

  factory AppConfig.fromEnvironment() {
    return const AppConfig(
      environment: String.fromEnvironment(
        'APP_ENV',
        defaultValue: 'development',
      ),
      apiBaseUrl: String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'http://localhost:3000/api/v1',
      ),
      googleClientId: String.fromEnvironment('GOOGLE_CLIENT_ID'),
      appleClientId: String.fromEnvironment('APPLE_CLIENT_ID'),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is AppConfig &&
        other.environment == environment &&
        other.apiBaseUrl == apiBaseUrl &&
        other.googleClientId == googleClientId &&
        other.appleClientId == appleClientId;
  }

  @override
  int get hashCode =>
      Object.hash(environment, apiBaseUrl, googleClientId, appleClientId);
}
