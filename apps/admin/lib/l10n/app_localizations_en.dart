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
  String get homeMessage => 'Administration';

  @override
  String environmentLabel(String environment) {
    return 'Environment: $environment';
  }

  @override
  String get openCampaignDashboard => 'Campaign dashboard';

  @override
  String get openCommunityDashboard => 'Community dashboard';

  @override
  String get campaignDashboardTitle => 'Campaign dashboard';

  @override
  String get communityDashboardTitle => 'Community dashboard';

  @override
  String get emptyDashboard =>
      'No dashboard data yet. Configure measurement definitions and impact factors, then wait for approved actions.';

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
      'No outcomes yet. Impact factors are configured per campaign or tenant and are never hardcoded.';

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
      'Totals are anonymous. People are not ranked or compared.';

  @override
  String get languageLabel => 'Language';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChinese => '简体中文';

  @override
  String get openCampaignReport => 'Campaign report';

  @override
  String get campaignReportTitle => 'Campaign report';

  @override
  String get emptyReport => 'No report data yet.';

  @override
  String get exportCsv => 'Export CSV';

  @override
  String get exportRequiresPermission =>
      'CSV export requires reports.export and is audited.';

  @override
  String get anonymousReportNote =>
      'Aggregate reports exclude contact details and do not rank people.';

  @override
  String get loginTitle => 'Sign in';

  @override
  String get identifierLabel => 'Email or mobile';

  @override
  String get passwordLabel => 'Password';

  @override
  String get loginButton => 'Sign in';

  @override
  String get logout => 'Sign out';

  @override
  String get customersTitle => 'Customers';

  @override
  String get createCustomer => 'Create customer';

  @override
  String get customerNameLabel => 'Customer name';

  @override
  String get communitiesTitle => 'Communities';

  @override
  String get createCommunity => 'Create community';

  @override
  String get communityNameLabel => 'Community name';

  @override
  String get importTitle => 'CSV import';

  @override
  String get uploadCsv => 'Upload CSV';

  @override
  String get mapFields => 'Save mapping';

  @override
  String get validateImport => 'Validate';

  @override
  String get previewImport => 'Preview';

  @override
  String get confirmImport => 'Confirm import';

  @override
  String get importResult => 'Import result';

  @override
  String get campaignsTitle => 'Campaigns';

  @override
  String get createCampaign => 'Create campaign';

  @override
  String get campaignNameLabel => 'Campaign name';

  @override
  String get timezoneLabel => 'Timezone';

  @override
  String get startsOnLabel => 'Starts on';

  @override
  String get endsOnLabel => 'Ends on';

  @override
  String get publishCampaign => 'Publish';

  @override
  String get startCampaign => 'Start';

  @override
  String get participantsTitle => 'Participants';

  @override
  String get submissionsTitle => 'Submissions';

  @override
  String get rejectSubmission => 'Reject';

  @override
  String get rejectNoteLabel => 'Review note';

  @override
  String get impactFactorsTitle => 'Impact factors';

  @override
  String get sourceUnitLabel => 'Source unit';

  @override
  String get outcomeMetricLabel => 'Outcome metric';

  @override
  String get outcomeUnitLabel => 'Outcome unit';

  @override
  String get factorValueLabel => 'Factor value';

  @override
  String get citationLabel => 'Source citation';

  @override
  String get effectiveFromLabel => 'Effective from';

  @override
  String get saveImpactFactor => 'Save impact factor';

  @override
  String get identifierRequired => 'Enter an email or mobile number.';

  @override
  String get passwordTooShort => 'Password must be at least 8 characters.';

  @override
  String get nameRequired => 'Enter a name.';

  @override
  String get openImport => 'CSV import';

  @override
  String get openCampaigns => 'Campaigns';

  @override
  String get openCommunities => 'Communities';

  @override
  String get openParticipants => 'Participants';

  @override
  String get openSubmissions => 'Submissions';

  @override
  String get openImpactFactors => 'Impact factors';

  @override
  String get rulesStrategyLabel => 'Rules strategy';

  @override
  String get templateLabel => 'Template';

  @override
  String get scopeLabel => 'Scope';

  @override
  String get emailColumn => 'Email column';

  @override
  String get mobileColumn => 'Mobile column';

  @override
  String get exportReady => 'CSV export is ready.';

  @override
  String get errorInvalidCredentials =>
      'Email, mobile, or password is incorrect.';

  @override
  String get errorTokenInvalid => 'This token is not valid.';

  @override
  String get errorTokenReused =>
      'Your session was reused. Please sign in again.';

  @override
  String get errorTokenExpired => 'This token has expired.';

  @override
  String get errorIdentityExists =>
      'That email or mobile is already registered.';

  @override
  String get errorWeakPassword =>
      'Choose a stronger password (at least 8 characters).';

  @override
  String get errorSocialTokenInvalid => 'Social sign-in could not be verified.';

  @override
  String get errorUnauthorized => 'Please sign in.';

  @override
  String get errorForbidden => 'You do not have permission for this action.';

  @override
  String get errorNotFound => 'The requested item was not found.';

  @override
  String get errorConflict => 'This change conflicts with existing data.';

  @override
  String get errorRateLimited => 'Too many attempts. Try again later.';

  @override
  String get errorValidation => 'Please check the form and try again.';

  @override
  String get errorUnexpected => 'Something went wrong. Try again.';

  @override
  String get noCustomers => 'No customers yet.';

  @override
  String get noCommunities => 'No communities yet.';

  @override
  String get noCampaigns => 'No campaigns yet.';
}
