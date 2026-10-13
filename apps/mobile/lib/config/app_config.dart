class AppConfig {
  const AppConfig({required this.environment, required this.apiBaseUrl});

  final String environment;
  final String apiBaseUrl;

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
    );
  }

  @override
  bool operator ==(Object other) {
    return other is AppConfig &&
        other.environment == environment &&
        other.apiBaseUrl == apiBaseUrl;
  }

  @override
  int get hashCode => Object.hash(environment, apiBaseUrl);
}
