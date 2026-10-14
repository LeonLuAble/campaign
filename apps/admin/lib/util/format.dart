import 'package:api_client/api_client.dart';

import '../l10n/app_localizations.dart';

bool looksLikeIdentifier(String value) {
  final trimmed = value.trim();
  if (trimmed.contains('@')) {
    return trimmed.contains('.');
  }
  final digits = trimmed.replaceAll(RegExp(r'[\s+\-()]'), '');
  return RegExp(r'^\d{8,15}$').hasMatch(digits);
}

bool looksLikeEmail(String value) {
  final trimmed = value.trim();
  return trimmed.contains('@') && trimmed.contains('.');
}

String localizeApiError(AppLocalizations l10n, Object error) {
  if (error is! ApiException) {
    return l10n.errorUnexpected;
  }
  switch (apiErrorMessageKey(error.code)) {
    case 'errorInvalidCredentials':
      return l10n.errorInvalidCredentials;
    case 'errorTokenInvalid':
      return l10n.errorTokenInvalid;
    case 'errorTokenReused':
      return l10n.errorTokenReused;
    case 'errorTokenExpired':
      return l10n.errorTokenExpired;
    case 'errorIdentityExists':
      return l10n.errorIdentityExists;
    case 'errorWeakPassword':
      return l10n.errorWeakPassword;
    case 'errorSocialTokenInvalid':
      return l10n.errorSocialTokenInvalid;
    case 'errorUnauthorized':
      return l10n.errorUnauthorized;
    case 'errorForbidden':
      return l10n.errorForbidden;
    case 'errorNotFound':
      return l10n.errorNotFound;
    case 'errorConflict':
      return l10n.errorConflict;
    case 'errorSetupNotAvailable':
      return l10n.errorSetupNotAvailable;
    case 'errorInvalidSetupKey':
      return l10n.errorInvalidSetupKey;
    case 'errorRateLimited':
      return l10n.errorRateLimited;
    case 'errorValidation':
      return l10n.errorValidation;
    default:
      return error.message.isEmpty ? l10n.errorUnexpected : error.message;
  }
}

String formatNumber(num value) {
  if (value % 1 == 0) {
    return value.toInt().toString();
  }
  return value.toString();
}
