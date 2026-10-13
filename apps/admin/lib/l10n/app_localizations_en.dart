// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Community Campaign Admin';

  @override
  String get homeMessage => 'Administration shell';

  @override
  String environmentLabel(String environment) {
    return 'Environment: $environment';
  }
}
