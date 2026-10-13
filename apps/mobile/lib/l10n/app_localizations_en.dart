// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Community Campaign';

  @override
  String get homeMessage => 'Community Campaign Platform';

  @override
  String environmentLabel(String environment) {
    return 'Environment: $environment';
  }

  @override
  String get openDashboard => 'My dashboard';

  @override
  String get participantDashboardTitle => 'My campaign dashboard';

  @override
  String get emptyDashboard =>
      'No dashboard data yet. Record approved actions after an admin configures measurements.';

  @override
  String get progressSection => 'Progress';

  @override
  String get measurementsSection => 'Measurements';

  @override
  String get outcomesSection => 'Outcomes';

  @override
  String get timeSeriesSection => 'Time series';

  @override
  String get visualizationSection => 'Visualization';

  @override
  String completionLabel(String percent) {
    return 'Completion: $percent';
  }

  @override
  String achievedOfTarget(String achieved, String target, String unit) {
    return '$achieved of $target $unit';
  }

  @override
  String get noOutcomes =>
      'No outcomes yet. Impact factors are configured by administrators.';

  @override
  String factorSourceLabel(String source) {
    return 'Source: $source';
  }

  @override
  String outcomeValueLabel(String value, String unit) {
    return '$value $unit';
  }

  @override
  String measurementQuantityLabel(String quantity, String unit) {
    return '$quantity $unit';
  }

  @override
  String periodLabel(String start, String end) {
    return '$start – $end';
  }

  @override
  String get treeInactive => 'Campaign visualization is not configured.';

  @override
  String get anonymousTotalsNote =>
      'Totals are anonymous. People are not ranked.';
}
