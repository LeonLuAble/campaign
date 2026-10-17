import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hans'),
    Locale('zh'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Community Campaign Admin'**
  String get appTitle;

  /// No description provided for @homeMessage.
  ///
  /// In en, this message translates to:
  /// **'Administration'**
  String get homeMessage;

  /// No description provided for @environmentLabel.
  ///
  /// In en, this message translates to:
  /// **'Environment: {environment}'**
  String environmentLabel(String environment);

  /// No description provided for @openCampaignDashboard.
  ///
  /// In en, this message translates to:
  /// **'Campaign dashboard'**
  String get openCampaignDashboard;

  /// No description provided for @openCommunityDashboard.
  ///
  /// In en, this message translates to:
  /// **'Community dashboard'**
  String get openCommunityDashboard;

  /// No description provided for @campaignDashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'Campaign dashboard'**
  String get campaignDashboardTitle;

  /// No description provided for @communityDashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'Community dashboard'**
  String get communityDashboardTitle;

  /// No description provided for @emptyDashboard.
  ///
  /// In en, this message translates to:
  /// **'No dashboard data yet. Configure measurement definitions and impact factors, then wait for approved actions.'**
  String get emptyDashboard;

  /// No description provided for @progressSection.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get progressSection;

  /// No description provided for @measurementsSection.
  ///
  /// In en, this message translates to:
  /// **'Measurements'**
  String get measurementsSection;

  /// No description provided for @outcomesSection.
  ///
  /// In en, this message translates to:
  /// **'Outcomes'**
  String get outcomesSection;

  /// No description provided for @timeSeriesSection.
  ///
  /// In en, this message translates to:
  /// **'Time series'**
  String get timeSeriesSection;

  /// No description provided for @visualizationSection.
  ///
  /// In en, this message translates to:
  /// **'Visualization'**
  String get visualizationSection;

  /// No description provided for @completionLabel.
  ///
  /// In en, this message translates to:
  /// **'Completion: {percent}'**
  String completionLabel(String percent);

  /// No description provided for @achievedOfTarget.
  ///
  /// In en, this message translates to:
  /// **'{achieved} of {target} {unit}'**
  String achievedOfTarget(String achieved, String target, String unit);

  /// No description provided for @noOutcomes.
  ///
  /// In en, this message translates to:
  /// **'No outcomes yet. Impact factors are configured per campaign or tenant and are never hardcoded.'**
  String get noOutcomes;

  /// No description provided for @factorSourceLabel.
  ///
  /// In en, this message translates to:
  /// **'Source: {source}'**
  String factorSourceLabel(String source);

  /// No description provided for @outcomeValueLabel.
  ///
  /// In en, this message translates to:
  /// **'{value} {unit}'**
  String outcomeValueLabel(String value, String unit);

  /// No description provided for @measurementQuantityLabel.
  ///
  /// In en, this message translates to:
  /// **'{quantity} {unit}'**
  String measurementQuantityLabel(String quantity, String unit);

  /// No description provided for @periodLabel.
  ///
  /// In en, this message translates to:
  /// **'{start} – {end}'**
  String periodLabel(String start, String end);

  /// No description provided for @treeInactive.
  ///
  /// In en, this message translates to:
  /// **'Campaign visualization is not configured.'**
  String get treeInactive;

  /// No description provided for @anonymousTotalsNote.
  ///
  /// In en, this message translates to:
  /// **'Totals are anonymous. People are not ranked or compared.'**
  String get anonymousTotalsNote;

  /// No description provided for @languageLabel.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get languageLabel;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageChinese.
  ///
  /// In en, this message translates to:
  /// **'简体中文'**
  String get languageChinese;

  /// No description provided for @openCampaignReport.
  ///
  /// In en, this message translates to:
  /// **'Campaign report'**
  String get openCampaignReport;

  /// No description provided for @campaignReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Campaign report'**
  String get campaignReportTitle;

  /// No description provided for @emptyReport.
  ///
  /// In en, this message translates to:
  /// **'No report data yet.'**
  String get emptyReport;

  /// No description provided for @exportCsv.
  ///
  /// In en, this message translates to:
  /// **'Export CSV'**
  String get exportCsv;

  /// No description provided for @exportRequiresPermission.
  ///
  /// In en, this message translates to:
  /// **'CSV export requires reports.export and is audited.'**
  String get exportRequiresPermission;

  /// No description provided for @anonymousReportNote.
  ///
  /// In en, this message translates to:
  /// **'Aggregate reports exclude contact details and do not rank people.'**
  String get anonymousReportNote;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginTitle;

  /// No description provided for @identifierLabel.
  ///
  /// In en, this message translates to:
  /// **'Email or mobile'**
  String get identifierLabel;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginButton;

  /// No description provided for @setupTitle.
  ///
  /// In en, this message translates to:
  /// **'First admin setup'**
  String get setupTitle;

  /// No description provided for @setupSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Create the first platform administrator for this environment.'**
  String get setupSubtitle;

  /// No description provided for @setupKeyLabel.
  ///
  /// In en, this message translates to:
  /// **'Setup key'**
  String get setupKeyLabel;

  /// No description provided for @setupEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'Admin email'**
  String get setupEmailLabel;

  /// No description provided for @setupConfirmPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Confirm password'**
  String get setupConfirmPasswordLabel;

  /// No description provided for @setupDisplayNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Display name (optional)'**
  String get setupDisplayNameLabel;

  /// No description provided for @setupSubmitButton.
  ///
  /// In en, this message translates to:
  /// **'Create admin'**
  String get setupSubmitButton;

  /// No description provided for @setupKeyRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter the full setup key.'**
  String get setupKeyRequired;

  /// No description provided for @setupEmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get setupEmailRequired;

  /// No description provided for @setupPasswordMismatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords do not match.'**
  String get setupPasswordMismatch;

  /// No description provided for @checkingSetup.
  ///
  /// In en, this message translates to:
  /// **'Checking setup status…'**
  String get checkingSetup;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get logout;

  /// No description provided for @customersTitle.
  ///
  /// In en, this message translates to:
  /// **'Customers'**
  String get customersTitle;

  /// No description provided for @createCustomer.
  ///
  /// In en, this message translates to:
  /// **'Create customer'**
  String get createCustomer;

  /// No description provided for @customerNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Customer name'**
  String get customerNameLabel;

  /// No description provided for @communitiesTitle.
  ///
  /// In en, this message translates to:
  /// **'Communities'**
  String get communitiesTitle;

  /// No description provided for @createCommunity.
  ///
  /// In en, this message translates to:
  /// **'Create community'**
  String get createCommunity;

  /// No description provided for @communityNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Community name'**
  String get communityNameLabel;

  /// No description provided for @importTitle.
  ///
  /// In en, this message translates to:
  /// **'CSV import'**
  String get importTitle;

  /// No description provided for @uploadCsv.
  ///
  /// In en, this message translates to:
  /// **'Upload CSV'**
  String get uploadCsv;

  /// No description provided for @mapFields.
  ///
  /// In en, this message translates to:
  /// **'Save mapping'**
  String get mapFields;

  /// No description provided for @validateImport.
  ///
  /// In en, this message translates to:
  /// **'Validate'**
  String get validateImport;

  /// No description provided for @previewImport.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get previewImport;

  /// No description provided for @confirmImport.
  ///
  /// In en, this message translates to:
  /// **'Confirm import'**
  String get confirmImport;

  /// No description provided for @importResult.
  ///
  /// In en, this message translates to:
  /// **'Import result'**
  String get importResult;

  /// No description provided for @campaignsTitle.
  ///
  /// In en, this message translates to:
  /// **'Campaigns'**
  String get campaignsTitle;

  /// No description provided for @createCampaign.
  ///
  /// In en, this message translates to:
  /// **'Create campaign'**
  String get createCampaign;

  /// No description provided for @campaignNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Campaign name'**
  String get campaignNameLabel;

  /// No description provided for @timezoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Timezone'**
  String get timezoneLabel;

  /// No description provided for @startsOnLabel.
  ///
  /// In en, this message translates to:
  /// **'Starts on'**
  String get startsOnLabel;

  /// No description provided for @endsOnLabel.
  ///
  /// In en, this message translates to:
  /// **'Ends on'**
  String get endsOnLabel;

  /// No description provided for @publishCampaign.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get publishCampaign;

  /// No description provided for @startCampaign.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get startCampaign;

  /// No description provided for @participantsTitle.
  ///
  /// In en, this message translates to:
  /// **'Participants'**
  String get participantsTitle;

  /// No description provided for @submissionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Submissions'**
  String get submissionsTitle;

  /// No description provided for @rejectSubmission.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get rejectSubmission;

  /// No description provided for @rejectNoteLabel.
  ///
  /// In en, this message translates to:
  /// **'Review note'**
  String get rejectNoteLabel;

  /// No description provided for @impactFactorsTitle.
  ///
  /// In en, this message translates to:
  /// **'Impact factors'**
  String get impactFactorsTitle;

  /// No description provided for @sourceUnitLabel.
  ///
  /// In en, this message translates to:
  /// **'Source unit'**
  String get sourceUnitLabel;

  /// No description provided for @outcomeMetricLabel.
  ///
  /// In en, this message translates to:
  /// **'Outcome metric'**
  String get outcomeMetricLabel;

  /// No description provided for @outcomeUnitLabel.
  ///
  /// In en, this message translates to:
  /// **'Outcome unit'**
  String get outcomeUnitLabel;

  /// No description provided for @factorValueLabel.
  ///
  /// In en, this message translates to:
  /// **'Factor value'**
  String get factorValueLabel;

  /// No description provided for @citationLabel.
  ///
  /// In en, this message translates to:
  /// **'Source citation'**
  String get citationLabel;

  /// No description provided for @effectiveFromLabel.
  ///
  /// In en, this message translates to:
  /// **'Effective from'**
  String get effectiveFromLabel;

  /// No description provided for @saveImpactFactor.
  ///
  /// In en, this message translates to:
  /// **'Save impact factor'**
  String get saveImpactFactor;

  /// No description provided for @identifierRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter an email or mobile number.'**
  String get identifierRequired;

  /// No description provided for @passwordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 8 characters.'**
  String get passwordTooShort;

  /// No description provided for @nameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a name.'**
  String get nameRequired;

  /// No description provided for @openImport.
  ///
  /// In en, this message translates to:
  /// **'CSV import'**
  String get openImport;

  /// No description provided for @openCampaigns.
  ///
  /// In en, this message translates to:
  /// **'Campaigns'**
  String get openCampaigns;

  /// No description provided for @openCommunities.
  ///
  /// In en, this message translates to:
  /// **'Communities'**
  String get openCommunities;

  /// No description provided for @openParticipants.
  ///
  /// In en, this message translates to:
  /// **'Participants'**
  String get openParticipants;

  /// No description provided for @openSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Submissions'**
  String get openSubmissions;

  /// No description provided for @openImpactFactors.
  ///
  /// In en, this message translates to:
  /// **'Impact factors'**
  String get openImpactFactors;

  /// No description provided for @rulesStrategyLabel.
  ///
  /// In en, this message translates to:
  /// **'Rules strategy'**
  String get rulesStrategyLabel;

  /// No description provided for @templateLabel.
  ///
  /// In en, this message translates to:
  /// **'Template'**
  String get templateLabel;

  /// No description provided for @scopeLabel.
  ///
  /// In en, this message translates to:
  /// **'Scope'**
  String get scopeLabel;

  /// No description provided for @emailColumn.
  ///
  /// In en, this message translates to:
  /// **'Email column'**
  String get emailColumn;

  /// No description provided for @mobileColumn.
  ///
  /// In en, this message translates to:
  /// **'Mobile column'**
  String get mobileColumn;

  /// No description provided for @exportReady.
  ///
  /// In en, this message translates to:
  /// **'CSV export is ready.'**
  String get exportReady;

  /// No description provided for @errorInvalidCredentials.
  ///
  /// In en, this message translates to:
  /// **'Email, mobile, or password is incorrect.'**
  String get errorInvalidCredentials;

  /// No description provided for @errorTokenInvalid.
  ///
  /// In en, this message translates to:
  /// **'This token is not valid.'**
  String get errorTokenInvalid;

  /// No description provided for @errorTokenReused.
  ///
  /// In en, this message translates to:
  /// **'Your session was reused. Please sign in again.'**
  String get errorTokenReused;

  /// No description provided for @errorTokenExpired.
  ///
  /// In en, this message translates to:
  /// **'This token has expired.'**
  String get errorTokenExpired;

  /// No description provided for @errorIdentityExists.
  ///
  /// In en, this message translates to:
  /// **'That email or mobile is already registered.'**
  String get errorIdentityExists;

  /// No description provided for @errorWeakPassword.
  ///
  /// In en, this message translates to:
  /// **'Choose a stronger password (at least 8 characters).'**
  String get errorWeakPassword;

  /// No description provided for @errorSocialTokenInvalid.
  ///
  /// In en, this message translates to:
  /// **'Social sign-in could not be verified.'**
  String get errorSocialTokenInvalid;

  /// No description provided for @errorUnauthorized.
  ///
  /// In en, this message translates to:
  /// **'Please sign in.'**
  String get errorUnauthorized;

  /// No description provided for @errorForbidden.
  ///
  /// In en, this message translates to:
  /// **'You do not have permission for this action.'**
  String get errorForbidden;

  /// No description provided for @errorNotFound.
  ///
  /// In en, this message translates to:
  /// **'The requested item was not found.'**
  String get errorNotFound;

  /// No description provided for @errorConflict.
  ///
  /// In en, this message translates to:
  /// **'This change conflicts with existing data.'**
  String get errorConflict;

  /// No description provided for @errorSetupNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'First-admin setup is not available.'**
  String get errorSetupNotAvailable;

  /// No description provided for @errorInvalidSetupKey.
  ///
  /// In en, this message translates to:
  /// **'The setup key is incorrect.'**
  String get errorInvalidSetupKey;

  /// No description provided for @errorRateLimited.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Try again later.'**
  String get errorRateLimited;

  /// No description provided for @errorValidation.
  ///
  /// In en, this message translates to:
  /// **'Please check the form and try again.'**
  String get errorValidation;

  /// No description provided for @errorUnexpected.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Try again.'**
  String get errorUnexpected;

  /// No description provided for @noCustomers.
  ///
  /// In en, this message translates to:
  /// **'No customers yet.'**
  String get noCustomers;

  /// No description provided for @noCommunities.
  ///
  /// In en, this message translates to:
  /// **'No communities yet.'**
  String get noCommunities;

  /// No description provided for @noCampaigns.
  ///
  /// In en, this message translates to:
  /// **'No campaigns yet.'**
  String get noCampaigns;

  /// No description provided for @navCustomers.
  ///
  /// In en, this message translates to:
  /// **'Customers'**
  String get navCustomers;

  /// No description provided for @navOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get navOverview;

  /// No description provided for @navPeople.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get navPeople;

  /// No description provided for @navCommunities.
  ///
  /// In en, this message translates to:
  /// **'Communities'**
  String get navCommunities;

  /// No description provided for @navCampaigns.
  ///
  /// In en, this message translates to:
  /// **'Campaigns'**
  String get navCampaigns;

  /// No description provided for @navImports.
  ///
  /// In en, this message translates to:
  /// **'Imports'**
  String get navImports;

  /// No description provided for @navReports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get navReports;

  /// No description provided for @selectCustomer.
  ///
  /// In en, this message translates to:
  /// **'Select customer'**
  String get selectCustomer;

  /// No description provided for @platformConsole.
  ///
  /// In en, this message translates to:
  /// **'Platform console'**
  String get platformConsole;

  /// No description provided for @skipToContent.
  ///
  /// In en, this message translates to:
  /// **'Skip to content'**
  String get skipToContent;

  /// No description provided for @userProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get userProfile;

  /// No description provided for @profileComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Profile settings are coming soon.'**
  String get profileComingSoon;

  /// No description provided for @overviewSubtitle.
  ///
  /// In en, this message translates to:
  /// **'At-a-glance status for this customer.'**
  String get overviewSubtitle;

  /// No description provided for @metricMembers.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get metricMembers;

  /// No description provided for @metricCommunities.
  ///
  /// In en, this message translates to:
  /// **'Communities'**
  String get metricCommunities;

  /// No description provided for @metricCampaigns.
  ///
  /// In en, this message translates to:
  /// **'Campaigns'**
  String get metricCampaigns;

  /// No description provided for @metricCampaignsByStatus.
  ///
  /// In en, this message translates to:
  /// **'Campaigns · {status}'**
  String metricCampaignsByStatus(String status);

  /// No description provided for @nextStepsTitle.
  ///
  /// In en, this message translates to:
  /// **'Next steps'**
  String get nextStepsTitle;

  /// No description provided for @nextStepCommunities.
  ///
  /// In en, this message translates to:
  /// **'Create communities'**
  String get nextStepCommunities;

  /// No description provided for @nextStepPeople.
  ///
  /// In en, this message translates to:
  /// **'Import or invite people'**
  String get nextStepPeople;

  /// No description provided for @nextStepCampaign.
  ///
  /// In en, this message translates to:
  /// **'Create a campaign'**
  String get nextStepCampaign;

  /// No description provided for @nextStepsComplete.
  ///
  /// In en, this message translates to:
  /// **'You are set up. Keep campaigns moving.'**
  String get nextStepsComplete;

  /// No description provided for @overviewEmptyPermissions.
  ///
  /// In en, this message translates to:
  /// **'No overview metrics are available for your role.'**
  String get overviewEmptyPermissions;

  /// No description provided for @peopleComingSoon.
  ///
  /// In en, this message translates to:
  /// **'The member directory is coming soon.'**
  String get peopleComingSoon;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @adminNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Admin display name'**
  String get adminNameLabel;

  /// No description provided for @adminEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'Admin email'**
  String get adminEmailLabel;

  /// No description provided for @adminEmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter the customer admin email.'**
  String get adminEmailRequired;

  /// No description provided for @activationLinkTitle.
  ///
  /// In en, this message translates to:
  /// **'Share activation link'**
  String get activationLinkTitle;

  /// No description provided for @activationLinkNote.
  ///
  /// In en, this message translates to:
  /// **'Email delivery is not built yet. Copy this link and share it with the customer admin so they can set a password.'**
  String get activationLinkNote;

  /// No description provided for @copyLink.
  ///
  /// In en, this message translates to:
  /// **'Copy'**
  String get copyLink;

  /// No description provided for @copiedToClipboard.
  ///
  /// In en, this message translates to:
  /// **'Copied to clipboard'**
  String get copiedToClipboard;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @reportsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get reportsTitle;

  /// No description provided for @activateTitle.
  ///
  /// In en, this message translates to:
  /// **'Activate account'**
  String get activateTitle;

  /// No description provided for @activateSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Set a password to activate your admin account.'**
  String get activateSubtitle;

  /// No description provided for @activationTokenLabel.
  ///
  /// In en, this message translates to:
  /// **'Activation token'**
  String get activationTokenLabel;

  /// No description provided for @activateButton.
  ///
  /// In en, this message translates to:
  /// **'Activate'**
  String get activateButton;

  /// No description provided for @tokenRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter the token from your message.'**
  String get tokenRequired;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password'**
  String get forgotPassword;

  /// No description provided for @resetPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Reset password'**
  String get resetPasswordTitle;

  /// No description provided for @resetRequestSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your email or mobile. If an account exists, we will send reset instructions.'**
  String get resetRequestSubtitle;

  /// No description provided for @resetConfirmSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Choose a new password using the token from your message.'**
  String get resetConfirmSubtitle;

  /// No description provided for @resetConfirmOptionalSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Already have a reset token? Set a new password below.'**
  String get resetConfirmOptionalSubtitle;

  /// No description provided for @requestReset.
  ///
  /// In en, this message translates to:
  /// **'Send reset email'**
  String get requestReset;

  /// No description provided for @confirmReset.
  ///
  /// In en, this message translates to:
  /// **'Set new password'**
  String get confirmReset;

  /// No description provided for @resetTokenLabel.
  ///
  /// In en, this message translates to:
  /// **'Reset token'**
  String get resetTokenLabel;

  /// No description provided for @newPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get newPasswordLabel;

  /// No description provided for @acceptedMessage.
  ///
  /// In en, this message translates to:
  /// **'If the account exists, we sent instructions.'**
  String get acceptedMessage;

  /// No description provided for @activateSuccess.
  ///
  /// In en, this message translates to:
  /// **'Your account is activated. You can sign in.'**
  String get activateSuccess;

  /// No description provided for @resetSuccess.
  ///
  /// In en, this message translates to:
  /// **'Your password was updated. You can sign in.'**
  String get resetSuccess;

  /// No description provided for @goToLogin.
  ///
  /// In en, this message translates to:
  /// **'Go to sign in'**
  String get goToLogin;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'zh'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when language+script codes are specified.
  switch (locale.languageCode) {
    case 'zh':
      {
        switch (locale.scriptCode) {
          case 'Hans':
            return AppLocalizationsZhHans();
        }
        break;
      }
  }

  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
