class ApiException implements Exception {
  ApiException({
    required this.statusCode,
    required this.code,
    required this.message,
    this.correlationId,
    this.path,
    this.details,
  });

  final int statusCode;
  final String code;
  final String message;
  final String? correlationId;
  final String? path;

  /// Machine-readable extras for some codes.
  final Map<String, dynamic>? details;

  bool get isTokenReused => code == 'TOKEN_REUSED';

  /// Days already recorded, from `SUBMISSION_OVERLAP`.
  List<String> get conflictingDates {
    final value = details?['conflictingDates'];
    return value is List ? value.map((row) => row.toString()).toList() : const [];
  }

  factory ApiException.fromJson(Map<String, dynamic> json, {int? statusCode}) {
    final rawMessage = json['message'];
    final message = rawMessage is List
        ? rawMessage.map((row) => row.toString()).join(', ')
        : (rawMessage?.toString() ?? 'Request failed');
    return ApiException(
      statusCode: (json['statusCode'] as num?)?.toInt() ?? statusCode ?? 0,
      code: json['code'] as String? ?? 'INTERNAL_ERROR',
      message: message,
      correlationId: json['correlationId'] as String?,
      path: json['path'] as String?,
      details: json['details'] is Map
          ? (json['details'] as Map)
              .map((key, value) => MapEntry(key.toString(), value))
          : null,
    );
  }

  @override
  String toString() => 'ApiException($code, $statusCode): $message';
}

/// Stable l10n keys for API error codes. Apps map these onto ARB strings.
String apiErrorMessageKey(String code) {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'errorInvalidCredentials';
    case 'TOKEN_INVALID':
      return 'errorTokenInvalid';
    case 'TOKEN_REUSED':
      return 'errorTokenReused';
    case 'TOKEN_EXPIRED':
      return 'errorTokenExpired';
    case 'IDENTITY_ALREADY_EXISTS':
      return 'errorIdentityExists';
    case 'WEAK_PASSWORD':
      return 'errorWeakPassword';
    case 'SOCIAL_TOKEN_INVALID':
      return 'errorSocialTokenInvalid';
    case 'UNAUTHORIZED':
      return 'errorUnauthorized';
    case 'FORBIDDEN':
      return 'errorForbidden';
    case 'NOT_FOUND':
      return 'errorNotFound';
    case 'CONFLICT':
      return 'errorConflict';
    case 'SETUP_NOT_AVAILABLE':
      return 'errorSetupNotAvailable';
    case 'INVALID_SETUP_KEY':
      return 'errorInvalidSetupKey';
    case 'RATE_LIMITED':
      return 'errorRateLimited';
    case 'VALIDATION_FAILED':
    case 'BAD_REQUEST':
    case 'UNPROCESSABLE_ENTITY':
      return 'errorValidation';
    case 'CAMPAIGN_FIELD_LOCKED':
      return 'errorCampaignFieldLocked';
    case 'CAMPAIGN_END_DATE_LOCKED':
      return 'errorCampaignEndDateLocked';
    default:
      return 'errorUnexpected';
  }
}
