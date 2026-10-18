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

  /// No description provided for @importsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Upload member CSVs, review validation, and confirm imports.'**
  String get importsSubtitle;

  /// No description provided for @newImport.
  ///
  /// In en, this message translates to:
  /// **'New import'**
  String get newImport;

  /// No description provided for @noImportsYet.
  ///
  /// In en, this message translates to:
  /// **'No imports yet. Start with a template CSV.'**
  String get noImportsYet;

  /// No description provided for @backToImports.
  ///
  /// In en, this message translates to:
  /// **'Back to imports'**
  String get backToImports;

  /// No description provided for @importWizardSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Guided upload, mapping, validation, and confirm.'**
  String get importWizardSubtitle;

  /// No description provided for @importStepUpload.
  ///
  /// In en, this message translates to:
  /// **'Upload'**
  String get importStepUpload;

  /// No description provided for @importStepMap.
  ///
  /// In en, this message translates to:
  /// **'Map'**
  String get importStepMap;

  /// No description provided for @importStepValidate.
  ///
  /// In en, this message translates to:
  /// **'Validate'**
  String get importStepValidate;

  /// No description provided for @importStepPreview.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get importStepPreview;

  /// No description provided for @importStepConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get importStepConfirm;

  /// No description provided for @downloadImportTemplate.
  ///
  /// In en, this message translates to:
  /// **'Download template'**
  String get downloadImportTemplate;

  /// No description provided for @templateDownloaded.
  ///
  /// In en, this message translates to:
  /// **'Template ready.'**
  String get templateDownloaded;

  /// No description provided for @importUploadHint.
  ///
  /// In en, this message translates to:
  /// **'Download the template, then choose a CSV file. Optionally set a default community for rows without communityPath.'**
  String get importUploadHint;

  /// No description provided for @importSelectedFile.
  ///
  /// In en, this message translates to:
  /// **'Selected: {name}'**
  String importSelectedFile(String name);

  /// No description provided for @importDefaultCommunity.
  ///
  /// In en, this message translates to:
  /// **'Default community (optional)'**
  String get importDefaultCommunity;

  /// No description provided for @importFileRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose a CSV file to continue.'**
  String get importFileRequired;

  /// No description provided for @importBadFileType.
  ///
  /// In en, this message translates to:
  /// **'Choose a .csv file.'**
  String get importBadFileType;

  /// No description provided for @importEmptyFile.
  ///
  /// In en, this message translates to:
  /// **'The file is empty.'**
  String get importEmptyFile;

  /// No description provided for @importMissingRequiredColumns.
  ///
  /// In en, this message translates to:
  /// **'Map at least an email or mobile column.'**
  String get importMissingRequiredColumns;

  /// No description provided for @importPickerUnavailable.
  ///
  /// In en, this message translates to:
  /// **'File picking is not available in this environment.'**
  String get importPickerUnavailable;

  /// No description provided for @importMapHint.
  ///
  /// In en, this message translates to:
  /// **'Match each CSV column to a field. Email or mobile is required.'**
  String get importMapHint;

  /// No description provided for @mappingUnmapped.
  ///
  /// In en, this message translates to:
  /// **'Not mapped'**
  String get mappingUnmapped;

  /// No description provided for @canonicalEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get canonicalEmail;

  /// No description provided for @canonicalMobile.
  ///
  /// In en, this message translates to:
  /// **'Mobile'**
  String get canonicalMobile;

  /// No description provided for @canonicalExternalId.
  ///
  /// In en, this message translates to:
  /// **'External ID'**
  String get canonicalExternalId;

  /// No description provided for @canonicalFirstName.
  ///
  /// In en, this message translates to:
  /// **'First name'**
  String get canonicalFirstName;

  /// No description provided for @canonicalLastName.
  ///
  /// In en, this message translates to:
  /// **'Last name'**
  String get canonicalLastName;

  /// No description provided for @canonicalDisplayName.
  ///
  /// In en, this message translates to:
  /// **'Display name'**
  String get canonicalDisplayName;

  /// No description provided for @canonicalCommunityId.
  ///
  /// In en, this message translates to:
  /// **'Community ID'**
  String get canonicalCommunityId;

  /// No description provided for @canonicalCommunityPath.
  ///
  /// In en, this message translates to:
  /// **'Community path'**
  String get canonicalCommunityPath;

  /// No description provided for @importValidateHeading.
  ///
  /// In en, this message translates to:
  /// **'Validation results'**
  String get importValidateHeading;

  /// No description provided for @importPreviewHeading.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get importPreviewHeading;

  /// No description provided for @importValidateSummary.
  ///
  /// In en, this message translates to:
  /// **'{valid} valid · {invalid} errors · {review} need review'**
  String importValidateSummary(int valid, int invalid, int review);

  /// No description provided for @importNoProblemRows.
  ///
  /// In en, this message translates to:
  /// **'No error or review rows.'**
  String get importNoProblemRows;

  /// No description provided for @importNoRows.
  ///
  /// In en, this message translates to:
  /// **'No rows to show.'**
  String get importNoRows;

  /// No description provided for @importReviewInstruction.
  ///
  /// In en, this message translates to:
  /// **'Rows marked review cannot be resolved here. Fix the CSV and re-import.'**
  String get importReviewInstruction;

  /// No description provided for @importConfirmHint.
  ///
  /// In en, this message translates to:
  /// **'Confirm to create or match members and send activation invites where needed.'**
  String get importConfirmHint;

  /// No description provided for @importConfirmSummary.
  ///
  /// In en, this message translates to:
  /// **'{ready} rows will be imported. {skipped} error or review rows will be skipped.'**
  String importConfirmSummary(int ready, int skipped);

  /// No description provided for @importResultSummary.
  ///
  /// In en, this message translates to:
  /// **'Created {created} · matched {matched} · errors {errors}'**
  String importResultSummary(int created, int matched, int errors);

  /// No description provided for @importRowTitle.
  ///
  /// In en, this message translates to:
  /// **'Row {number}: {identifier}'**
  String importRowTitle(int number, String identifier);

  /// No description provided for @downloadErrorCsv.
  ///
  /// In en, this message translates to:
  /// **'Download error CSV'**
  String get downloadErrorCsv;

  /// No description provided for @errorCsvDownloaded.
  ///
  /// In en, this message translates to:
  /// **'Error CSV ready.'**
  String get errorCsvDownloaded;

  /// No description provided for @importColumnFile.
  ///
  /// In en, this message translates to:
  /// **'File'**
  String get importColumnFile;

  /// No description provided for @importColumnStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get importColumnStatus;

  /// No description provided for @importColumnDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get importColumnDate;

  /// No description provided for @importColumnCounts.
  ///
  /// In en, this message translates to:
  /// **'Counts'**
  String get importColumnCounts;

  /// No description provided for @importCountsSummary.
  ///
  /// In en, this message translates to:
  /// **'Created {created} · matched {matched} · errors {errors}'**
  String importCountsSummary(int created, int matched, int errors);

  /// No description provided for @importStatusUploaded.
  ///
  /// In en, this message translates to:
  /// **'Uploaded'**
  String get importStatusUploaded;

  /// No description provided for @importStatusMapped.
  ///
  /// In en, this message translates to:
  /// **'Mapped'**
  String get importStatusMapped;

  /// No description provided for @importStatusValidated.
  ///
  /// In en, this message translates to:
  /// **'Validated'**
  String get importStatusValidated;

  /// No description provided for @importStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get importStatusConfirmed;

  /// No description provided for @importStatusFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get importStatusFailed;

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

  /// No description provided for @peopleSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Search, filter, invite, and manage memberships.'**
  String get peopleSubtitle;

  /// No description provided for @navRoles.
  ///
  /// In en, this message translates to:
  /// **'Roles'**
  String get navRoles;

  /// No description provided for @rolesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'System and custom roles with their permission keys (read-only).'**
  String get rolesSubtitle;

  /// No description provided for @backToPeople.
  ///
  /// In en, this message translates to:
  /// **'Back to people'**
  String get backToPeople;

  /// No description provided for @noRoles.
  ///
  /// In en, this message translates to:
  /// **'No roles yet.'**
  String get noRoles;

  /// No description provided for @systemRoleBadge.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get systemRoleBadge;

  /// No description provided for @rolePermissionsHeading.
  ///
  /// In en, this message translates to:
  /// **'Permissions'**
  String get rolePermissionsHeading;

  /// No description provided for @peopleSearchLabel.
  ///
  /// In en, this message translates to:
  /// **'Search name, email, or mobile'**
  String get peopleSearchLabel;

  /// No description provided for @peopleFilterCommunity.
  ///
  /// In en, this message translates to:
  /// **'Community'**
  String get peopleFilterCommunity;

  /// No description provided for @peopleFilterRole.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get peopleFilterRole;

  /// No description provided for @peopleFilterStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get peopleFilterStatus;

  /// No description provided for @includeSubCommunities.
  ///
  /// In en, this message translates to:
  /// **'Include sub-communities'**
  String get includeSubCommunities;

  /// No description provided for @pendingOnlyFilter.
  ///
  /// In en, this message translates to:
  /// **'Pending only'**
  String get pendingOnlyFilter;

  /// No description provided for @anyCommunity.
  ///
  /// In en, this message translates to:
  /// **'Any community'**
  String get anyCommunity;

  /// No description provided for @anyRole.
  ///
  /// In en, this message translates to:
  /// **'Any role'**
  String get anyRole;

  /// No description provided for @anyStatus.
  ///
  /// In en, this message translates to:
  /// **'Any status'**
  String get anyStatus;

  /// No description provided for @clearFilter.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get clearFilter;

  /// No description provided for @pickCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose community'**
  String get pickCommunityTitle;

  /// No description provided for @pickCommunityRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose a community'**
  String get pickCommunityRequired;

  /// No description provided for @peopleColumnName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get peopleColumnName;

  /// No description provided for @peopleColumnContact.
  ///
  /// In en, this message translates to:
  /// **'Email / mobile'**
  String get peopleColumnContact;

  /// No description provided for @peopleColumnCommunity.
  ///
  /// In en, this message translates to:
  /// **'Community'**
  String get peopleColumnCommunity;

  /// No description provided for @peopleColumnRoles.
  ///
  /// In en, this message translates to:
  /// **'Roles'**
  String get peopleColumnRoles;

  /// No description provided for @peopleColumnStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get peopleColumnStatus;

  /// No description provided for @noMembers.
  ///
  /// In en, this message translates to:
  /// **'No members match these filters.'**
  String get noMembers;

  /// No description provided for @loadMore.
  ///
  /// In en, this message translates to:
  /// **'Load more'**
  String get loadMore;

  /// No description provided for @rowActions.
  ///
  /// In en, this message translates to:
  /// **'Actions'**
  String get rowActions;

  /// No description provided for @viewMember.
  ///
  /// In en, this message translates to:
  /// **'View'**
  String get viewMember;

  /// No description provided for @inviteMember.
  ///
  /// In en, this message translates to:
  /// **'Invite member'**
  String get inviteMember;

  /// No description provided for @inviteMemberTitle.
  ///
  /// In en, this message translates to:
  /// **'Invite member'**
  String get inviteMemberTitle;

  /// No description provided for @inviteMemberConfirm.
  ///
  /// In en, this message translates to:
  /// **'Send invite'**
  String get inviteMemberConfirm;

  /// No description provided for @inviteEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get inviteEmailLabel;

  /// No description provided for @inviteMobileLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile'**
  String get inviteMobileLabel;

  /// No description provided for @inviteDisplayNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Display name'**
  String get inviteDisplayNameLabel;

  /// No description provided for @inviteRoleLabel.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get inviteRoleLabel;

  /// No description provided for @inviteIdentifierRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter an email or mobile number.'**
  String get inviteIdentifierRequired;

  /// No description provided for @inviteEmailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get inviteEmailInvalid;

  /// No description provided for @inviteMobileInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid mobile number.'**
  String get inviteMobileInvalid;

  /// No description provided for @inviteEmailSentTitle.
  ///
  /// In en, this message translates to:
  /// **'Invitation sent'**
  String get inviteEmailSentTitle;

  /// No description provided for @inviteEmailSentBody.
  ///
  /// In en, this message translates to:
  /// **'An activation email was sent to {email}.'**
  String inviteEmailSentBody(String email);

  /// No description provided for @inviteMobileLinkTitle.
  ///
  /// In en, this message translates to:
  /// **'One-time activation link'**
  String get inviteMobileLinkTitle;

  /// No description provided for @inviteMobileLinkBody.
  ///
  /// In en, this message translates to:
  /// **'No email was sent. Copy this link and share it once with the member.'**
  String get inviteMobileLinkBody;

  /// No description provided for @activationLinkShownOnceNote.
  ///
  /// In en, this message translates to:
  /// **'This link is shown once. It expires in 24 hours.'**
  String get activationLinkShownOnceNote;

  /// No description provided for @membershipStatusInactive.
  ///
  /// In en, this message translates to:
  /// **'Deactivated'**
  String get membershipStatusInactive;

  /// No description provided for @tenantLevelMembership.
  ///
  /// In en, this message translates to:
  /// **'Organisation-wide'**
  String get tenantLevelMembership;

  /// No description provided for @memberCommunityLabel.
  ///
  /// In en, this message translates to:
  /// **'Community: {name}'**
  String memberCommunityLabel(String name);

  /// No description provided for @memberRolesHeading.
  ///
  /// In en, this message translates to:
  /// **'Roles'**
  String get memberRolesHeading;

  /// No description provided for @assignRoleAction.
  ///
  /// In en, this message translates to:
  /// **'Add role'**
  String get assignRoleAction;

  /// No description provided for @assignRoleTitle.
  ///
  /// In en, this message translates to:
  /// **'Assign role'**
  String get assignRoleTitle;

  /// No description provided for @noRolesToAssign.
  ///
  /// In en, this message translates to:
  /// **'All available roles are already assigned.'**
  String get noRolesToAssign;

  /// No description provided for @removeRoleTitle.
  ///
  /// In en, this message translates to:
  /// **'Remove role'**
  String get removeRoleTitle;

  /// No description provided for @removeRoleBody.
  ///
  /// In en, this message translates to:
  /// **'Remove the {name} role from this member?'**
  String removeRoleBody(String name);

  /// No description provided for @removeRoleConfirm.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get removeRoleConfirm;

  /// No description provided for @deactivateMember.
  ///
  /// In en, this message translates to:
  /// **'Deactivate'**
  String get deactivateMember;

  /// No description provided for @reactivateMember.
  ///
  /// In en, this message translates to:
  /// **'Reactivate'**
  String get reactivateMember;

  /// No description provided for @deactivateMemberTitle.
  ///
  /// In en, this message translates to:
  /// **'Deactivate membership'**
  String get deactivateMemberTitle;

  /// No description provided for @reactivateMemberTitle.
  ///
  /// In en, this message translates to:
  /// **'Reactivate membership'**
  String get reactivateMemberTitle;

  /// No description provided for @deactivateMemberBody.
  ///
  /// In en, this message translates to:
  /// **'Deactivate {name}? They will lose access until reactivated.'**
  String deactivateMemberBody(String name);

  /// No description provided for @reactivateMemberBody.
  ///
  /// In en, this message translates to:
  /// **'Reactivate {name}?'**
  String reactivateMemberBody(String name);

  /// No description provided for @deactivateMemberConfirm.
  ///
  /// In en, this message translates to:
  /// **'Deactivate'**
  String get deactivateMemberConfirm;

  /// No description provided for @reactivateMemberConfirm.
  ///
  /// In en, this message translates to:
  /// **'Reactivate'**
  String get reactivateMemberConfirm;

  /// No description provided for @memberDeactivatedSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Membership deactivated.'**
  String get memberDeactivatedSnackbar;

  /// No description provided for @memberReactivatedSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Membership reactivated.'**
  String get memberReactivatedSnackbar;

  /// No description provided for @errorLastTenantAdmin.
  ///
  /// In en, this message translates to:
  /// **'You cannot remove or deactivate the last organisation admin.'**
  String get errorLastTenantAdmin;

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

  /// No description provided for @platformCustomersTitle.
  ///
  /// In en, this message translates to:
  /// **'Customers'**
  String get platformCustomersTitle;

  /// No description provided for @platformCustomersSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Onboard organisations. Platform metadata only — no tenant data.'**
  String get platformCustomersSubtitle;

  /// No description provided for @searchCustomers.
  ///
  /// In en, this message translates to:
  /// **'Search by name or slug'**
  String get searchCustomers;

  /// No description provided for @noPlatformCustomers.
  ///
  /// In en, this message translates to:
  /// **'No customers yet. Create the first organisation.'**
  String get noPlatformCustomers;

  /// No description provided for @noSearchResults.
  ///
  /// In en, this message translates to:
  /// **'No customers match your search.'**
  String get noSearchResults;

  /// No description provided for @customerSlugLabel.
  ///
  /// In en, this message translates to:
  /// **'Slug'**
  String get customerSlugLabel;

  /// No description provided for @customerStatusLabel.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get customerStatusLabel;

  /// No description provided for @customerCreatedLabel.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get customerCreatedLabel;

  /// No description provided for @adminCountLabel.
  ///
  /// In en, this message translates to:
  /// **'Admins'**
  String get adminCountLabel;

  /// No description provided for @pendingInvitesLabel.
  ///
  /// In en, this message translates to:
  /// **'Pending invites'**
  String get pendingInvitesLabel;

  /// No description provided for @statusActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get statusActive;

  /// No description provided for @statusInactive.
  ///
  /// In en, this message translates to:
  /// **'Inactive'**
  String get statusInactive;

  /// No description provided for @customerDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get customerDetailTitle;

  /// No description provided for @wizardStepOrganisation.
  ///
  /// In en, this message translates to:
  /// **'Organisation'**
  String get wizardStepOrganisation;

  /// No description provided for @wizardStepAdmin.
  ///
  /// In en, this message translates to:
  /// **'First admin'**
  String get wizardStepAdmin;

  /// No description provided for @wizardStepReview.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get wizardStepReview;

  /// No description provided for @wizardNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get wizardNext;

  /// No description provided for @wizardBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get wizardBack;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @adminNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter the admin display name.'**
  String get adminNameRequired;

  /// No description provided for @adminLocaleLabel.
  ///
  /// In en, this message translates to:
  /// **'Admin language'**
  String get adminLocaleLabel;

  /// No description provided for @createCustomerSuccessTitle.
  ///
  /// In en, this message translates to:
  /// **'Customer created'**
  String get createCustomerSuccessTitle;

  /// No description provided for @createCustomerSuccessMessage.
  ///
  /// In en, this message translates to:
  /// **'An activation email was sent to {email}.'**
  String createCustomerSuccessMessage(String email);

  /// No description provided for @createCustomerSuccessDetail.
  ///
  /// In en, this message translates to:
  /// **'{name} is ready. The admin can activate and sign in.'**
  String createCustomerSuccessDetail(String name);

  /// No description provided for @createCustomerFailureHint.
  ///
  /// In en, this message translates to:
  /// **'You can retry create, or open the customer and resend the activation email.'**
  String get createCustomerFailureHint;

  /// No description provided for @viewCustomer.
  ///
  /// In en, this message translates to:
  /// **'View customer'**
  String get viewCustomer;

  /// No description provided for @backToCustomers.
  ///
  /// In en, this message translates to:
  /// **'Back to customers'**
  String get backToCustomers;

  /// No description provided for @resendActivation.
  ///
  /// In en, this message translates to:
  /// **'Resend activation'**
  String get resendActivation;

  /// No description provided for @activationResentSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Activation email sent again.'**
  String get activationResentSnackbar;

  /// No description provided for @adminsSectionTitle.
  ///
  /// In en, this message translates to:
  /// **'Admins'**
  String get adminsSectionTitle;

  /// No description provided for @noAdminsYet.
  ///
  /// In en, this message translates to:
  /// **'No admins recorded yet. Invite one to get started.'**
  String get noAdminsYet;

  /// No description provided for @inviteAnotherAdmin.
  ///
  /// In en, this message translates to:
  /// **'Invite another admin'**
  String get inviteAnotherAdmin;

  /// No description provided for @inviteAdminTitle.
  ///
  /// In en, this message translates to:
  /// **'Invite admin'**
  String get inviteAdminTitle;

  /// No description provided for @inviteAdminConfirm.
  ///
  /// In en, this message translates to:
  /// **'Send invite'**
  String get inviteAdminConfirm;

  /// No description provided for @inviteAdminConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Send an activation invite to {email}?'**
  String inviteAdminConfirmBody(String email);

  /// No description provided for @inviteAdminSuccessSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Invitation sent.'**
  String get inviteAdminSuccessSnackbar;

  /// No description provided for @resendActivationConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Resend the activation email to {email}?'**
  String resendActivationConfirmBody(String email);

  /// No description provided for @activationStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get activationStatusPending;

  /// No description provided for @activationStatusActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get activationStatusActive;

  /// No description provided for @adminCountSummary.
  ///
  /// In en, this message translates to:
  /// **'{admins} admins · {pending} pending invites'**
  String adminCountSummary(int admins, int pending);

  /// No description provided for @communitiesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Organise members into a hierarchy of any depth.'**
  String get communitiesSubtitle;

  /// No description provided for @createFirstCommunity.
  ///
  /// In en, this message translates to:
  /// **'Create your first community'**
  String get createFirstCommunity;

  /// No description provided for @createRootCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Create community'**
  String get createRootCommunityTitle;

  /// No description provided for @createChildCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Add child community'**
  String get createChildCommunityTitle;

  /// No description provided for @addChildCommunity.
  ///
  /// In en, this message translates to:
  /// **'Add child'**
  String get addChildCommunity;

  /// No description provided for @renameCommunity.
  ///
  /// In en, this message translates to:
  /// **'Rename'**
  String get renameCommunity;

  /// No description provided for @renameCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Rename community'**
  String get renameCommunityTitle;

  /// No description provided for @moveCommunity.
  ///
  /// In en, this message translates to:
  /// **'Move to…'**
  String get moveCommunity;

  /// No description provided for @moveCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Move community'**
  String get moveCommunityTitle;

  /// No description provided for @moveCommunityHint.
  ///
  /// In en, this message translates to:
  /// **'Choose a new parent for {name}. Its own descendants are excluded.'**
  String moveCommunityHint(String name);

  /// No description provided for @moveCommunityConfirm.
  ///
  /// In en, this message translates to:
  /// **'Move'**
  String get moveCommunityConfirm;

  /// No description provided for @communityRootLabel.
  ///
  /// In en, this message translates to:
  /// **'Organisation root (no parent)'**
  String get communityRootLabel;

  /// No description provided for @noMoveTargets.
  ///
  /// In en, this message translates to:
  /// **'No other communities available as a parent.'**
  String get noMoveTargets;

  /// No description provided for @deactivateCommunity.
  ///
  /// In en, this message translates to:
  /// **'Deactivate'**
  String get deactivateCommunity;

  /// No description provided for @reactivateCommunity.
  ///
  /// In en, this message translates to:
  /// **'Reactivate'**
  String get reactivateCommunity;

  /// No description provided for @deactivateCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Deactivate community'**
  String get deactivateCommunityTitle;

  /// No description provided for @reactivateCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Reactivate community'**
  String get reactivateCommunityTitle;

  /// No description provided for @deactivateCommunityBody.
  ///
  /// In en, this message translates to:
  /// **'Deactivate {name}? It will stay in the tree but mark as inactive.'**
  String deactivateCommunityBody(String name);

  /// No description provided for @reactivateCommunityBody.
  ///
  /// In en, this message translates to:
  /// **'Reactivate {name}?'**
  String reactivateCommunityBody(String name);

  /// No description provided for @deactivateCommunityConfirm.
  ///
  /// In en, this message translates to:
  /// **'Deactivate'**
  String get deactivateCommunityConfirm;

  /// No description provided for @reactivateCommunityConfirm.
  ///
  /// In en, this message translates to:
  /// **'Reactivate'**
  String get reactivateCommunityConfirm;

  /// No description provided for @communityCycleError.
  ///
  /// In en, this message translates to:
  /// **'That move would create a cycle. Choose a different parent.'**
  String get communityCycleError;

  /// No description provided for @communityCreatedSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Community created.'**
  String get communityCreatedSnackbar;

  /// No description provided for @communityRenamedSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Community renamed.'**
  String get communityRenamedSnackbar;

  /// No description provided for @communityMovedSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Community moved.'**
  String get communityMovedSnackbar;

  /// No description provided for @communityDeactivatedSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Community deactivated.'**
  String get communityDeactivatedSnackbar;

  /// No description provided for @communityReactivatedSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Community reactivated.'**
  String get communityReactivatedSnackbar;

  /// No description provided for @expandNode.
  ///
  /// In en, this message translates to:
  /// **'Expand'**
  String get expandNode;

  /// No description provided for @collapseNode.
  ///
  /// In en, this message translates to:
  /// **'Collapse'**
  String get collapseNode;

  /// No description provided for @communityActions.
  ///
  /// In en, this message translates to:
  /// **'Community actions'**
  String get communityActions;

  /// No description provided for @communityNodeSemantics.
  ///
  /// In en, this message translates to:
  /// **'Community {name}'**
  String communityNodeSemantics(String name);

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @createAction.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get createAction;

  /// No description provided for @newCampaign.
  ///
  /// In en, this message translates to:
  /// **'New campaign'**
  String get newCampaign;

  /// No description provided for @campaignSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search campaigns'**
  String get campaignSearchHint;

  /// No description provided for @campaignFilterStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get campaignFilterStatus;

  /// No description provided for @campaignFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All statuses'**
  String get campaignFilterAll;

  /// No description provided for @campaignStatusDraft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get campaignStatusDraft;

  /// No description provided for @campaignStatusPublished.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get campaignStatusPublished;

  /// No description provided for @campaignStatusStarted.
  ///
  /// In en, this message translates to:
  /// **'Started'**
  String get campaignStatusStarted;

  /// No description provided for @campaignStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get campaignStatusCompleted;

  /// No description provided for @campaignColumnName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get campaignColumnName;

  /// No description provided for @campaignColumnStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get campaignColumnStatus;

  /// No description provided for @campaignColumnDates.
  ///
  /// In en, this message translates to:
  /// **'Dates'**
  String get campaignColumnDates;

  /// No description provided for @campaignColumnParticipants.
  ///
  /// In en, this message translates to:
  /// **'Participants'**
  String get campaignColumnParticipants;

  /// No description provided for @campaignDatesUnset.
  ///
  /// In en, this message translates to:
  /// **'Dates not set'**
  String get campaignDatesUnset;

  /// No description provided for @campaignParticipantCount.
  ///
  /// In en, this message translates to:
  /// **'{count}'**
  String campaignParticipantCount(int count);

  /// No description provided for @campaignWizardTitle.
  ///
  /// In en, this message translates to:
  /// **'Create campaign'**
  String get campaignWizardTitle;

  /// No description provided for @campaignStepBasics.
  ///
  /// In en, this message translates to:
  /// **'Basics'**
  String get campaignStepBasics;

  /// No description provided for @campaignStepSchedule.
  ///
  /// In en, this message translates to:
  /// **'Schedule'**
  String get campaignStepSchedule;

  /// No description provided for @campaignStepRules.
  ///
  /// In en, this message translates to:
  /// **'Rules'**
  String get campaignStepRules;

  /// No description provided for @campaignStepAudience.
  ///
  /// In en, this message translates to:
  /// **'Audience'**
  String get campaignStepAudience;

  /// No description provided for @campaignStepActions.
  ///
  /// In en, this message translates to:
  /// **'Actions'**
  String get campaignStepActions;

  /// No description provided for @campaignStepReview.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get campaignStepReview;

  /// No description provided for @campaignNameZhLabel.
  ///
  /// In en, this message translates to:
  /// **'Name (简体中文)'**
  String get campaignNameZhLabel;

  /// No description provided for @campaignDescriptionZhLabel.
  ///
  /// In en, this message translates to:
  /// **'Description (简体中文)'**
  String get campaignDescriptionZhLabel;

  /// No description provided for @campaignNameEnLabel.
  ///
  /// In en, this message translates to:
  /// **'Name (English, optional)'**
  String get campaignNameEnLabel;

  /// No description provided for @campaignDescriptionEnLabel.
  ///
  /// In en, this message translates to:
  /// **'Description (English, optional)'**
  String get campaignDescriptionEnLabel;

  /// No description provided for @campaignPickStartDate.
  ///
  /// In en, this message translates to:
  /// **'Pick start date'**
  String get campaignPickStartDate;

  /// No description provided for @campaignPickEndDate.
  ///
  /// In en, this message translates to:
  /// **'Pick end date'**
  String get campaignPickEndDate;

  /// No description provided for @campaignTimezoneSearch.
  ///
  /// In en, this message translates to:
  /// **'Search timezone'**
  String get campaignTimezoneSearch;

  /// No description provided for @campaignRulesStrategyHint.
  ///
  /// In en, this message translates to:
  /// **'Choose a rules strategy. Pledge rules come from the server — do not type a free-text strategy key.'**
  String get campaignRulesStrategyHint;

  /// No description provided for @campaignAudienceCustomerWide.
  ///
  /// In en, this message translates to:
  /// **'Whole organisation'**
  String get campaignAudienceCustomerWide;

  /// No description provided for @campaignAudienceSelected.
  ///
  /// In en, this message translates to:
  /// **'Selected communities'**
  String get campaignAudienceSelected;

  /// No description provided for @campaignAudiencePickCommunities.
  ///
  /// In en, this message translates to:
  /// **'Select communities'**
  String get campaignAudiencePickCommunities;

  /// No description provided for @campaignAudienceRequired.
  ///
  /// In en, this message translates to:
  /// **'Select at least one community, or choose whole organisation.'**
  String get campaignAudienceRequired;

  /// No description provided for @campaignReviewModeLabel.
  ///
  /// In en, this message translates to:
  /// **'Submission review'**
  String get campaignReviewModeLabel;

  /// No description provided for @campaignReviewModeAuto.
  ///
  /// In en, this message translates to:
  /// **'Auto'**
  String get campaignReviewModeAuto;

  /// No description provided for @campaignReviewModeManual.
  ///
  /// In en, this message translates to:
  /// **'Manual'**
  String get campaignReviewModeManual;

  /// No description provided for @campaignReviewModeAutoHelp.
  ///
  /// In en, this message translates to:
  /// **'Records are approved automatically. Leaders can still spot-check and reject mistaken entries.'**
  String get campaignReviewModeAutoHelp;

  /// No description provided for @campaignReviewModeManualHelp.
  ///
  /// In en, this message translates to:
  /// **'Every record waits in a review queue until a leader approves or rejects it.'**
  String get campaignReviewModeManualHelp;

  /// No description provided for @campaignActionDefinitionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Action definitions'**
  String get campaignActionDefinitionsTitle;

  /// No description provided for @campaignActionNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Action name'**
  String get campaignActionNameLabel;

  /// No description provided for @campaignActionKeyLabel.
  ///
  /// In en, this message translates to:
  /// **'Key'**
  String get campaignActionKeyLabel;

  /// No description provided for @campaignActionUnitLabel.
  ///
  /// In en, this message translates to:
  /// **'Unit'**
  String get campaignActionUnitLabel;

  /// No description provided for @campaignAddActionDefinition.
  ///
  /// In en, this message translates to:
  /// **'Add action'**
  String get campaignAddActionDefinition;

  /// No description provided for @campaignRemoveActionDefinition.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get campaignRemoveActionDefinition;

  /// No description provided for @campaignApplyRecommendedActions.
  ///
  /// In en, this message translates to:
  /// **'Apply recommended definitions'**
  String get campaignApplyRecommendedActions;

  /// No description provided for @campaignCreateAsDraft.
  ///
  /// In en, this message translates to:
  /// **'Create as draft'**
  String get campaignCreateAsDraft;

  /// No description provided for @campaignReviewSummary.
  ///
  /// In en, this message translates to:
  /// **'Review your campaign, then create it as a draft.'**
  String get campaignReviewSummary;

  /// No description provided for @campaignWorkspaceOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get campaignWorkspaceOverview;

  /// No description provided for @campaignWorkspaceSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get campaignWorkspaceSettings;

  /// No description provided for @campaignWorkspaceParticipants.
  ///
  /// In en, this message translates to:
  /// **'Participants'**
  String get campaignWorkspaceParticipants;

  /// No description provided for @campaignWorkspaceSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Submissions'**
  String get campaignWorkspaceSubmissions;

  /// No description provided for @campaignWorkspaceMilestonesImpact.
  ///
  /// In en, this message translates to:
  /// **'Milestones & impact'**
  String get campaignWorkspaceMilestonesImpact;

  /// No description provided for @campaignWorkspaceDashboardReports.
  ///
  /// In en, this message translates to:
  /// **'Dashboard & reports'**
  String get campaignWorkspaceDashboardReports;

  /// No description provided for @campaignWorkspaceDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get campaignWorkspaceDashboard;

  /// No description provided for @campaignWorkspaceReports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get campaignWorkspaceReports;

  /// No description provided for @dashboardGranularityDay.
  ///
  /// In en, this message translates to:
  /// **'Day'**
  String get dashboardGranularityDay;

  /// No description provided for @dashboardGranularityWeek.
  ///
  /// In en, this message translates to:
  /// **'Week'**
  String get dashboardGranularityWeek;

  /// No description provided for @dashboardMetricParticipants.
  ///
  /// In en, this message translates to:
  /// **'Participants'**
  String get dashboardMetricParticipants;

  /// No description provided for @dashboardMetricParticipationRate.
  ///
  /// In en, this message translates to:
  /// **'Participation rate'**
  String get dashboardMetricParticipationRate;

  /// No description provided for @dashboardMetricCompleted.
  ///
  /// In en, this message translates to:
  /// **'Total completed'**
  String get dashboardMetricCompleted;

  /// No description provided for @dashboardMetricProgress.
  ///
  /// In en, this message translates to:
  /// **'Progress vs target'**
  String get dashboardMetricProgress;

  /// No description provided for @dashboardParticipationRateValue.
  ///
  /// In en, this message translates to:
  /// **'{percent}%'**
  String dashboardParticipationRateValue(String percent);

  /// No description provided for @dashboardProgressStatusExceeded.
  ///
  /// In en, this message translates to:
  /// **'Exceeded'**
  String get dashboardProgressStatusExceeded;

  /// No description provided for @dashboardProgressStatusAchieved.
  ///
  /// In en, this message translates to:
  /// **'Achieved'**
  String get dashboardProgressStatusAchieved;

  /// No description provided for @dashboardProgressStatusInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get dashboardProgressStatusInProgress;

  /// No description provided for @dashboardProgressStatusNotStarted.
  ///
  /// In en, this message translates to:
  /// **'Not started'**
  String get dashboardProgressStatusNotStarted;

  /// No description provided for @dashboardChartMode.
  ///
  /// In en, this message translates to:
  /// **'Chart'**
  String get dashboardChartMode;

  /// No description provided for @dashboardTableMode.
  ///
  /// In en, this message translates to:
  /// **'Table'**
  String get dashboardTableMode;

  /// No description provided for @dashboardChartEmpty.
  ///
  /// In en, this message translates to:
  /// **'No time-series data yet.'**
  String get dashboardChartEmpty;

  /// No description provided for @dashboardCommunityPickerLabel.
  ///
  /// In en, this message translates to:
  /// **'Community'**
  String get dashboardCommunityPickerLabel;

  /// No description provided for @dashboardCommunityWholeCampaign.
  ///
  /// In en, this message translates to:
  /// **'Whole campaign'**
  String get dashboardCommunityWholeCampaign;

  /// No description provided for @dashboardIncludeSubCommunities.
  ///
  /// In en, this message translates to:
  /// **'Include sub-communities'**
  String get dashboardIncludeSubCommunities;

  /// No description provided for @dashboardIncludeSubCommunitiesHelp.
  ///
  /// In en, this message translates to:
  /// **'Community metrics always include the selected community and its descendants.'**
  String get dashboardIncludeSubCommunitiesHelp;

  /// No description provided for @dashboardTreeTextAlternative.
  ///
  /// In en, this message translates to:
  /// **'{name}: {percent}% of campaign target'**
  String dashboardTreeTextAlternative(String name, String percent);

  /// No description provided for @reportCampaignTitle.
  ///
  /// In en, this message translates to:
  /// **'Campaign aggregate report'**
  String get reportCampaignTitle;

  /// No description provided for @reportCampaignDescription.
  ///
  /// In en, this message translates to:
  /// **'Anonymous campaign totals: participants, commitments, and completion by unit. No contact details.'**
  String get reportCampaignDescription;

  /// No description provided for @reportCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Community aggregate report'**
  String get reportCommunityTitle;

  /// No description provided for @reportCommunityDescription.
  ///
  /// In en, this message translates to:
  /// **'Anonymous subtree totals for a community. No contact details or rankings.'**
  String get reportCommunityDescription;

  /// No description provided for @reportPickCommunity.
  ///
  /// In en, this message translates to:
  /// **'Choose a community for the community report'**
  String get reportPickCommunity;

  /// No description provided for @reportExportDownloaded.
  ///
  /// In en, this message translates to:
  /// **'CSV download started.'**
  String get reportExportDownloaded;

  /// No description provided for @reportNoDateFilter.
  ///
  /// In en, this message translates to:
  /// **'Date-range filters are not available on this report yet.'**
  String get reportNoDateFilter;

  /// No description provided for @reportGeneratedAt.
  ///
  /// In en, this message translates to:
  /// **'Generated {when}'**
  String reportGeneratedAt(String when);

  /// No description provided for @reportUnitLine.
  ///
  /// In en, this message translates to:
  /// **'{unit}: {achieved} of {target} ({percent})'**
  String reportUnitLine(
    String unit,
    String achieved,
    String target,
    String percent,
  );

  /// No description provided for @campaignPublishChecklistTitle.
  ///
  /// In en, this message translates to:
  /// **'Ready to publish'**
  String get campaignPublishChecklistTitle;

  /// No description provided for @campaignChecklistDates.
  ///
  /// In en, this message translates to:
  /// **'Start and end dates'**
  String get campaignChecklistDates;

  /// No description provided for @campaignChecklistActions.
  ///
  /// In en, this message translates to:
  /// **'At least one action definition'**
  String get campaignChecklistActions;

  /// No description provided for @campaignChecklistAudience.
  ///
  /// In en, this message translates to:
  /// **'Audience (organisation-wide or communities)'**
  String get campaignChecklistAudience;

  /// No description provided for @campaignChecklistMissing.
  ///
  /// In en, this message translates to:
  /// **'Missing'**
  String get campaignChecklistMissing;

  /// No description provided for @campaignChecklistReady.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get campaignChecklistReady;

  /// No description provided for @publishCampaignConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Publish campaign?'**
  String get publishCampaignConfirmTitle;

  /// No description provided for @publishCampaignConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Members will be able to see and join. Setup fields lock after publish; only the description and extending the end date stay editable.'**
  String get publishCampaignConfirmBody;

  /// No description provided for @startCampaignConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Start campaign?'**
  String get startCampaignConfirmTitle;

  /// No description provided for @startCampaignConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Enrolled participants will be notified that the campaign has started. Recording becomes available.'**
  String get startCampaignConfirmBody;

  /// No description provided for @completeCampaign.
  ///
  /// In en, this message translates to:
  /// **'Complete'**
  String get completeCampaign;

  /// No description provided for @completeCampaignConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Complete campaign?'**
  String get completeCampaignConfirmTitle;

  /// No description provided for @completeCampaignConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Recording closes; action definitions lock; history is kept. This cannot be undone.'**
  String get completeCampaignConfirmBody;

  /// No description provided for @confirmAction.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirmAction;

  /// No description provided for @campaignFieldLocked.
  ///
  /// In en, this message translates to:
  /// **'Locked after publish'**
  String get campaignFieldLocked;

  /// No description provided for @campaignSaveSettings.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get campaignSaveSettings;

  /// No description provided for @campaignSettingsSaved.
  ///
  /// In en, this message translates to:
  /// **'Campaign updated.'**
  String get campaignSettingsSaved;

  /// No description provided for @campaignMilestonesComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Milestone management arrives in a later phase. Impact factors are available below.'**
  String get campaignMilestonesComingSoon;

  /// No description provided for @campaignDescriptionLabel.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get campaignDescriptionLabel;

  /// No description provided for @errorCampaignFieldLocked.
  ///
  /// In en, this message translates to:
  /// **'Only the description and extending the end date can be changed after publish.'**
  String get errorCampaignFieldLocked;

  /// No description provided for @errorCampaignEndDateLocked.
  ///
  /// In en, this message translates to:
  /// **'The end date may only be extended after publish.'**
  String get errorCampaignEndDateLocked;

  /// No description provided for @campaignDatesRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose start and end dates.'**
  String get campaignDatesRequired;

  /// No description provided for @campaignStrategyRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose a rules strategy.'**
  String get campaignStrategyRequired;

  /// No description provided for @campaignActionsRequired.
  ///
  /// In en, this message translates to:
  /// **'Add at least one action definition.'**
  String get campaignActionsRequired;
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
