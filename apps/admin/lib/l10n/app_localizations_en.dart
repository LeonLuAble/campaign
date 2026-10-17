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
  String get setupTitle => 'First admin setup';

  @override
  String get setupSubtitle =>
      'Create the first platform administrator for this environment.';

  @override
  String get setupKeyLabel => 'Setup key';

  @override
  String get setupEmailLabel => 'Admin email';

  @override
  String get setupConfirmPasswordLabel => 'Confirm password';

  @override
  String get setupDisplayNameLabel => 'Display name (optional)';

  @override
  String get setupSubmitButton => 'Create admin';

  @override
  String get setupKeyRequired => 'Enter the full setup key.';

  @override
  String get setupEmailRequired => 'Enter a valid email address.';

  @override
  String get setupPasswordMismatch => 'Passwords do not match.';

  @override
  String get checkingSetup => 'Checking setup status…';

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
  String get errorSetupNotAvailable => 'First-admin setup is not available.';

  @override
  String get errorInvalidSetupKey => 'The setup key is incorrect.';

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

  @override
  String get navCustomers => 'Customers';

  @override
  String get navCommunities => 'Communities';

  @override
  String get navCampaigns => 'Campaigns';

  @override
  String get navImports => 'Imports';

  @override
  String get navReports => 'Reports';

  @override
  String get selectCustomer => 'Select customer';

  @override
  String get adminNameLabel => 'Admin display name';

  @override
  String get adminEmailLabel => 'Admin email';

  @override
  String get adminEmailRequired => 'Enter the customer admin email.';

  @override
  String get activationLinkTitle => 'Share activation link';

  @override
  String get activationLinkNote =>
      'Email delivery is not built yet. Copy this link and share it with the customer admin so they can set a password.';

  @override
  String get copyLink => 'Copy';

  @override
  String get copiedToClipboard => 'Copied to clipboard';

  @override
  String get close => 'Close';

  @override
  String get reportsTitle => 'Reports';

  @override
  String get activateTitle => 'Activate account';

  @override
  String get activateSubtitle =>
      'Set a password to activate your admin account.';

  @override
  String get activationTokenLabel => 'Activation token';

  @override
  String get activateButton => 'Activate';

  @override
  String get tokenRequired => 'Enter the token from your message.';

  @override
  String get forgotPassword => 'Forgot password';

  @override
  String get resetPasswordTitle => 'Reset password';

  @override
  String get resetRequestSubtitle =>
      'Enter your email or mobile. If an account exists, we will send reset instructions.';

  @override
  String get resetConfirmSubtitle =>
      'Choose a new password using the token from your message.';

  @override
  String get resetConfirmOptionalSubtitle =>
      'Already have a reset token? Set a new password below.';

  @override
  String get requestReset => 'Send reset email';

  @override
  String get confirmReset => 'Set new password';

  @override
  String get resetTokenLabel => 'Reset token';

  @override
  String get newPasswordLabel => 'New password';

  @override
  String get acceptedMessage => 'If the account exists, we sent instructions.';

  @override
  String get activateSuccess => 'Your account is activated. You can sign in.';

  @override
  String get resetSuccess => 'Your password was updated. You can sign in.';

  @override
  String get goToLogin => 'Go to sign in';
}
