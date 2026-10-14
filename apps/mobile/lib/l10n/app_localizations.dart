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
