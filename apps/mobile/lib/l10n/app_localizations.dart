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
  /// **'Community Campaign'**
  String get appTitle;

  /// No description provided for @homeMessage.
  ///
  /// In en, this message translates to:
  /// **'Community Campaign Platform'**
  String get homeMessage;

  /// No description provided for @environmentLabel.
  ///
  /// In en, this message translates to:
  /// **'Environment: {environment}'**
  String environmentLabel(String environment);

  /// No description provided for @openDashboard.
  ///
  /// In en, this message translates to:
  /// **'My dashboard'**
  String get openDashboard;

  /// No description provided for @participantDashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'My campaign dashboard'**
  String get participantDashboardTitle;

  /// No description provided for @emptyDashboard.
  ///
  /// In en, this message translates to:
  /// **'No dashboard data yet. Record approved actions after an admin configures measurements.'**
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
  /// **'No outcomes yet. Impact factors are configured by administrators.'**
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
  /// **'Totals are anonymous. People are not ranked.'**
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

  /// No description provided for @openNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get openNotifications;

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @emptyNotifications.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet.'**
  String get emptyNotifications;

  /// No description provided for @markRead.
  ///
  /// In en, this message translates to:
  /// **'Mark read'**
  String get markRead;

  /// No description provided for @unreadLabel.
  ///
  /// In en, this message translates to:
  /// **'Unread'**
  String get unreadLabel;

  /// No description provided for @readLabel.
  ///
  /// In en, this message translates to:
  /// **'Read'**
  String get readLabel;

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

  /// No description provided for @googleSignIn.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get googleSignIn;

  /// No description provided for @appleSignIn.
  ///
  /// In en, this message translates to:
  /// **'Continue with Apple'**
  String get appleSignIn;

  /// No description provided for @activateLink.
  ///
  /// In en, this message translates to:
  /// **'Activate account'**
  String get activateLink;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password'**
  String get forgotPassword;

  /// No description provided for @activateTitle.
  ///
  /// In en, this message translates to:
  /// **'Activate account'**
  String get activateTitle;

  /// No description provided for @activationTokenLabel.
  ///
  /// In en, this message translates to:
  /// **'Activation token'**
  String get activationTokenLabel;

  /// No description provided for @newPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get newPasswordLabel;

  /// No description provided for @activateButton.
  ///
  /// In en, this message translates to:
  /// **'Activate'**
  String get activateButton;

  /// No description provided for @resendActivation.
  ///
  /// In en, this message translates to:
  /// **'Resend activation'**
  String get resendActivation;

  /// No description provided for @resetPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Reset password'**
  String get resetPasswordTitle;

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

  /// No description provided for @acceptedMessage.
  ///
  /// In en, this message translates to:
  /// **'If the account exists, we sent instructions.'**
  String get acceptedMessage;

  /// No description provided for @campaignsTitle.
  ///
  /// In en, this message translates to:
  /// **'Campaigns'**
  String get campaignsTitle;

  /// No description provided for @noCampaigns.
  ///
  /// In en, this message translates to:
  /// **'No campaigns yet.'**
  String get noCampaigns;

  /// No description provided for @joinCampaign.
  ///
  /// In en, this message translates to:
  /// **'Join'**
  String get joinCampaign;

  /// No description provided for @enrolledLabel.
  ///
  /// In en, this message translates to:
  /// **'Enrolled'**
  String get enrolledLabel;

  /// No description provided for @withdrawnLabel.
  ///
  /// In en, this message translates to:
  /// **'Withdrawn'**
  String get withdrawnLabel;

  /// No description provided for @pledgeTitle.
  ///
  /// In en, this message translates to:
  /// **'Pledge'**
  String get pledgeTitle;

  /// No description provided for @pledgeButton.
  ///
  /// In en, this message translates to:
  /// **'Save pledge'**
  String get pledgeButton;

  /// No description provided for @selectChoice.
  ///
  /// In en, this message translates to:
  /// **'Choose a pledge'**
  String get selectChoice;

  /// No description provided for @targetValueLabel.
  ///
  /// In en, this message translates to:
  /// **'Target'**
  String get targetValueLabel;

  /// No description provided for @unitLabel.
  ///
  /// In en, this message translates to:
  /// **'Unit'**
  String get unitLabel;

  /// No description provided for @recordActionTitle.
  ///
  /// In en, this message translates to:
  /// **'Record today'**
  String get recordActionTitle;

  /// No description provided for @quantityLabel.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get quantityLabel;

  /// No description provided for @recordButton.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get recordButton;

  /// No description provided for @cancelAction.
  ///
  /// In en, this message translates to:
  /// **'Cancel recording'**
  String get cancelAction;

  /// No description provided for @occurredOnLabel.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get occurredOnLabel;

  /// No description provided for @progressTitle.
  ///
  /// In en, this message translates to:
  /// **'My progress'**
  String get progressTitle;

  /// No description provided for @openProgress.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get openProgress;

  /// No description provided for @openPledge.
  ///
  /// In en, this message translates to:
  /// **'Pledge'**
  String get openPledge;

  /// No description provided for @openRecord.
  ///
  /// In en, this message translates to:
  /// **'Record meals'**
  String get openRecord;

  /// No description provided for @preferencesTitle.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get preferencesTitle;

  /// No description provided for @openPreferences.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get openPreferences;

  /// No description provided for @timezoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Timezone'**
  String get timezoneLabel;

  /// No description provided for @remindersEnabled.
  ///
  /// In en, this message translates to:
  /// **'Daily reminders'**
  String get remindersEnabled;

  /// No description provided for @reminderTime.
  ///
  /// In en, this message translates to:
  /// **'Reminder time'**
  String get reminderTime;

  /// No description provided for @savePreferences.
  ///
  /// In en, this message translates to:
  /// **'Save preferences'**
  String get savePreferences;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get logout;

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

  /// No description provided for @tokenRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter the token from your message.'**
  String get tokenRequired;

  /// No description provided for @quantityInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a whole number quantity.'**
  String get quantityInvalid;

  /// No description provided for @targetInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a whole number target.'**
  String get targetInvalid;

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

  /// No description provided for @usesCampaignDuration.
  ///
  /// In en, this message translates to:
  /// **'Target follows the campaign dates.'**
  String get usesCampaignDuration;

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

  /// No description provided for @errorAccountInactive.
  ///
  /// In en, this message translates to:
  /// **'This account is inactive. Contact your organiser.'**
  String get errorAccountInactive;

  /// No description provided for @errorNetwork.
  ///
  /// In en, this message translates to:
  /// **'Network error. Check your connection and try again.'**
  String get errorNetwork;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navCampaigns.
  ///
  /// In en, this message translates to:
  /// **'Campaigns'**
  String get navCampaigns;

  /// No description provided for @navMe.
  ///
  /// In en, this message translates to:
  /// **'Me'**
  String get navMe;

  /// No description provided for @welcomeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Join community campaigns and track your progress together.'**
  String get welcomeSubtitle;

  /// No description provided for @welcomeSpiritTitle.
  ///
  /// In en, this message translates to:
  /// **'How it works'**
  String get welcomeSpiritTitle;

  /// No description provided for @welcomeSpiritBody.
  ///
  /// In en, this message translates to:
  /// **'Your organiser invites you. Activate your account, sign in, then join campaigns and record daily actions.'**
  String get welcomeSpiritBody;

  /// No description provided for @welcomeContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue to sign in'**
  String get welcomeContinue;

  /// No description provided for @welcomeBackLink.
  ///
  /// In en, this message translates to:
  /// **'Back to welcome'**
  String get welcomeBackLink;

  /// No description provided for @activateIntro.
  ///
  /// In en, this message translates to:
  /// **'Paste the invite token or the full activation link from your email or organiser.'**
  String get activateIntro;

  /// No description provided for @activationTokenHint.
  ///
  /// In en, this message translates to:
  /// **'Token or https://…/activate?token=…'**
  String get activationTokenHint;

  /// No description provided for @activateSuccess.
  ///
  /// In en, this message translates to:
  /// **'Account activated. Sign in with your new password.'**
  String get activateSuccess;

  /// No description provided for @resendActivationHint.
  ///
  /// In en, this message translates to:
  /// **'Need a new link? Enter your email or mobile and resend.'**
  String get resendActivationHint;

  /// No description provided for @backToSignIn.
  ///
  /// In en, this message translates to:
  /// **'Back to sign in'**
  String get backToSignIn;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @noOrganisationLinked.
  ///
  /// In en, this message translates to:
  /// **'No organisation is linked to this account yet.'**
  String get noOrganisationLinked;

  /// No description provided for @homeCommunityLabel.
  ///
  /// In en, this message translates to:
  /// **'Community: {name}'**
  String homeCommunityLabel(String name);

  /// No description provided for @switchOrganisation.
  ///
  /// In en, this message translates to:
  /// **'Organisation'**
  String get switchOrganisation;

  /// No description provided for @switchCommunity.
  ///
  /// In en, this message translates to:
  /// **'Community'**
  String get switchCommunity;

  /// No description provided for @homeCampaignsHeading.
  ///
  /// In en, this message translates to:
  /// **'Your campaigns'**
  String get homeCampaignsHeading;

  /// No description provided for @homeCanJoinLabel.
  ///
  /// In en, this message translates to:
  /// **'Available to join'**
  String get homeCanJoinLabel;

  /// No description provided for @homeProgressUnavailable.
  ///
  /// In en, this message translates to:
  /// **'No progress yet'**
  String get homeProgressUnavailable;

  /// No description provided for @meAnonymousName.
  ///
  /// In en, this message translates to:
  /// **'Member'**
  String get meAnonymousName;

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

  /// No description provided for @dashboardProgressStatusNotStarted.
  ///
  /// In en, this message translates to:
  /// **'Not started'**
  String get dashboardProgressStatusNotStarted;

  /// No description provided for @dashboardProgressStatusInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get dashboardProgressStatusInProgress;
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
