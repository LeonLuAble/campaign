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

  @override
  String get languageLabel => 'Language';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChinese => '简体中文';

  @override
  String get openNotifications => 'Notifications';

  @override
  String get notificationsTitle => 'Notifications';

  @override
  String get emptyNotifications => 'No notifications yet.';

  @override
  String get markRead => 'Mark read';

  @override
  String get unreadLabel => 'Unread';

  @override
  String get readLabel => 'Read';

  @override
  String get loginTitle => 'Sign in';

  @override
  String get identifierLabel => 'Email or mobile';

  @override
  String get passwordLabel => 'Password';

  @override
  String get loginButton => 'Sign in';

  @override
  String get googleSignIn => 'Continue with Google';

  @override
  String get appleSignIn => 'Continue with Apple';

  @override
  String get activateLink => 'Activate account';

  @override
  String get forgotPassword => 'Forgot password';

  @override
  String get activateTitle => 'Activate account';

  @override
  String get activationTokenLabel => 'Activation token';

  @override
  String get newPasswordLabel => 'New password';

  @override
  String get activateButton => 'Activate';

  @override
  String get resendActivation => 'Resend activation';

  @override
  String get resetPasswordTitle => 'Reset password';

  @override
  String get requestReset => 'Send reset email';

  @override
  String get confirmReset => 'Set new password';

  @override
  String get resetTokenLabel => 'Reset token';

  @override
  String get acceptedMessage => 'If the account exists, we sent instructions.';

  @override
  String get campaignsTitle => 'Campaigns';

  @override
  String get noCampaigns => 'No campaigns yet.';

  @override
  String get joinCampaign => 'Join';

  @override
  String get enrolledLabel => 'Enrolled';

  @override
  String get withdrawnLabel => 'Withdrawn';

  @override
  String get pledgeTitle => 'Pledge';

  @override
  String get pledgeButton => 'Save pledge';

  @override
  String get selectChoice => 'Choose a pledge';

  @override
  String get targetValueLabel => 'Target';

  @override
  String get unitLabel => 'Unit';

  @override
  String get recordActionTitle => 'Record today';

  @override
  String get quantityLabel => 'Quantity';

  @override
  String get recordButton => 'Record';

  @override
  String get cancelAction => 'Cancel recording';

  @override
  String get occurredOnLabel => 'Date';

  @override
  String get progressTitle => 'My progress';

  @override
  String get openProgress => 'Progress';

  @override
  String get openPledge => 'Pledge';

  @override
  String get openRecord => 'Record meals';

  @override
  String get preferencesTitle => 'Preferences';

  @override
  String get openPreferences => 'Preferences';

  @override
  String get timezoneLabel => 'Timezone';

  @override
  String get remindersEnabled => 'Daily reminders';

  @override
  String get reminderTime => 'Reminder time';

  @override
  String get savePreferences => 'Save preferences';

  @override
  String get logout => 'Sign out';

  @override
  String get identifierRequired => 'Enter an email or mobile number.';

  @override
  String get passwordTooShort => 'Password must be at least 8 characters.';

  @override
  String get tokenRequired => 'Enter the token from your message.';

  @override
  String get quantityInvalid => 'Enter a whole number quantity.';

  @override
  String get targetInvalid => 'Enter a whole number target.';

  @override
  String get campaignStatusDraft => 'Draft';

  @override
  String get campaignStatusPublished => 'Published';

  @override
  String get campaignStatusStarted => 'Started';

  @override
  String get campaignStatusCompleted => 'Completed';

  @override
  String get usesCampaignDuration => 'Target follows the campaign dates.';

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
  String get errorAccountInactive =>
      'This account is inactive. Contact your organiser.';

  @override
  String get errorNetwork =>
      'Network error. Check your connection and try again.';

  @override
  String get navHome => 'Home';

  @override
  String get navCampaigns => 'Campaigns';

  @override
  String get navMe => 'Me';

  @override
  String get welcomeSubtitle =>
      'Join community campaigns and track your progress together.';

  @override
  String get welcomeSpiritTitle => 'How it works';

  @override
  String get welcomeSpiritBody =>
      'Your organiser invites you. Activate your account, sign in, then join campaigns and record daily actions.';

  @override
  String get welcomeContinue => 'Continue to sign in';

  @override
  String get welcomeBackLink => 'Back to welcome';

  @override
  String get activateIntro =>
      'Paste the invite token or the full activation link from your email or organiser.';

  @override
  String get activationTokenHint => 'Token or https://…/activate?token=…';

  @override
  String get activateSuccess =>
      'Account activated. Sign in with your new password.';

  @override
  String get resendActivationHint =>
      'Need a new link? Enter your email or mobile and resend.';

  @override
  String get backToSignIn => 'Back to sign in';

  @override
  String get retry => 'Retry';

  @override
  String get noOrganisationLinked =>
      'No organisation is linked to this account yet.';

  @override
  String homeCommunityLabel(String name) {
    return 'Community: $name';
  }

  @override
  String get switchOrganisation => 'Organisation';

  @override
  String get switchCommunity => 'Community';

  @override
  String get homeCampaignsHeading => 'Your campaigns';

  @override
  String get homeCanJoinLabel => 'Available to join';

  @override
  String get homeProgressUnavailable => 'No progress yet';

  @override
  String get meAnonymousName => 'Member';

  @override
  String get dashboardProgressStatusExceeded => 'Exceeded';

  @override
  String get dashboardProgressStatusAchieved => 'Achieved';

  @override
  String get dashboardProgressStatusNotStarted => 'Not started';

  @override
  String get dashboardProgressStatusInProgress => 'In progress';

  @override
  String wholeCampaignDays(String days) {
    return 'Whole campaign ($days days)';
  }

  @override
  String suggestedTargetLabel(String value, String unit) {
    return 'Suggested: $value $unit';
  }

  @override
  String get errorAlreadyJoined => 'You have already joined this campaign.';

  @override
  String get errorNotEligible =>
      'You are not eligible for this campaign. Contact your organiser.';

  @override
  String get errorCampaignEnded => 'This campaign has ended.';

  @override
  String get errorCampaignNotOpen =>
      'This campaign is not open for joining yet.';

  @override
  String campaignDatesLabel(String dates) {
    return 'Dates: $dates';
  }

  @override
  String get campaignDescriptionHeading => 'About';

  @override
  String get howItWorksHeading => 'How it works';

  @override
  String get communityProgressHeading => 'Community progress so far';

  @override
  String get viewParticipation => 'View my participation';

  @override
  String get continueToPledge => 'Continue to pledge';

  @override
  String get joinCampaignTitle => 'Join campaign';

  @override
  String get changePledgeTitle => 'Change pledge';

  @override
  String get confirmPledgeHeading => 'Confirm your pledge';

  @override
  String confirmPledgeBody(String choice, String dates) {
    return 'You are committing to $choice for $dates.';
  }

  @override
  String get joiningInProgress => 'Joining…';

  @override
  String get confirmJoinAndPledge => 'Confirm and join';

  @override
  String get backToChoices => 'Back to choices';

  @override
  String get backToCampaign => 'Back to campaign';

  @override
  String get noCommitmentChoices =>
      'No pledge choices are available for this campaign.';

  @override
  String get reviewPledge => 'Review pledge';

  @override
  String get participationTitle => 'My participation';

  @override
  String get myCommitmentHeading => 'My commitment';

  @override
  String get noPledgeYet => 'You have not chosen a pledge yet.';

  @override
  String get openCheckIn => 'Daily check-in';

  @override
  String get withdrawTitle => 'Leave campaign';

  @override
  String get withdrawConfirmBody =>
      'You can leave now. Your past records are kept. You can re-join later.';

  @override
  String get withdrawConfirm => 'Leave';

  @override
  String get cancelLabel => 'Cancel';

  @override
  String get notEnrolledHint => 'You are not enrolled in this campaign.';

  @override
  String get checkInTitle => 'Check-in';

  @override
  String get checkInComingSoon => 'Daily check-in arrives in a later update.';

  @override
  String get backToParticipation => 'Back to participation';

  @override
  String get sectionJoined => 'Joined';

  @override
  String get sectionOpenToJoin => 'Open to join';

  @override
  String get sectionPast => 'Past';

  @override
  String get emptyJoinedCampaigns => 'You have not joined a campaign yet.';

  @override
  String get emptyOpenCampaigns => 'No campaigns are open to join right now.';

  @override
  String get emptyPastCampaigns => 'No past campaigns yet.';
}
