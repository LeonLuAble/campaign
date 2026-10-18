// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => '社区活动';

  @override
  String get homeMessage => '社区活动平台';

  @override
  String environmentLabel(String environment) {
    return '环境：$environment';
  }

  @override
  String get openDashboard => '我的仪表板';

  @override
  String get participantDashboardTitle => '我的活动仪表板';

  @override
  String get emptyDashboard => '暂无仪表板数据。管理员配置测量项后，已核准的行动才会显示。';

  @override
  String get progressSection => '进度';

  @override
  String get measurementsSection => '测量';

  @override
  String get outcomesSection => '成果';

  @override
  String get timeSeriesSection => '时间序列';

  @override
  String get visualizationSection => '可视化';

  @override
  String completionLabel(String percent) {
    return '完成度：$percent';
  }

  @override
  String achievedOfTarget(String achieved, String target, String unit) {
    return '$achieved / $target $unit';
  }

  @override
  String get noOutcomes => '暂无成果。影响系数由管理员配置。';

  @override
  String factorSourceLabel(String source) {
    return '来源：$source';
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
  String get treeInactive => '活动可视化尚未配置。';

  @override
  String get anonymousTotalsNote => '合计为匿名统计，不对个人进行排名。';

  @override
  String get languageLabel => '语言';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChinese => '简体中文';

  @override
  String get openNotifications => '通知';

  @override
  String get notificationsTitle => '通知';

  @override
  String get emptyNotifications => '暂无通知。';

  @override
  String get markRead => '标为已读';

  @override
  String get unreadLabel => '未读';

  @override
  String get readLabel => '已读';

  @override
  String get loginTitle => '登录';

  @override
  String get identifierLabel => '邮箱或手机号';

  @override
  String get passwordLabel => '密码';

  @override
  String get loginButton => '登录';

  @override
  String get googleSignIn => '使用 Google 继续';

  @override
  String get appleSignIn => '使用 Apple 继续';

  @override
  String get activateLink => '激活账号';

  @override
  String get forgotPassword => '忘记密码';

  @override
  String get activateTitle => '激活账号';

  @override
  String get activationTokenLabel => '激活令牌';

  @override
  String get newPasswordLabel => '新密码';

  @override
  String get activateButton => '激活';

  @override
  String get resendActivation => '重发激活';

  @override
  String get resetPasswordTitle => '重置密码';

  @override
  String get requestReset => '发送重置邮件';

  @override
  String get confirmReset => '设置新密码';

  @override
  String get resetTokenLabel => '重置令牌';

  @override
  String get acceptedMessage => '如果账号存在，我们已发送说明。';

  @override
  String get campaignsTitle => '活动';

  @override
  String get noCampaigns => '暂无活动。';

  @override
  String get joinCampaign => '参加';

  @override
  String get enrolledLabel => '已报名';

  @override
  String get withdrawnLabel => '已退出';

  @override
  String get pledgeTitle => '承诺';

  @override
  String get pledgeButton => '保存承诺';

  @override
  String get selectChoice => '选择承诺类型';

  @override
  String get targetValueLabel => '目标';

  @override
  String get unitLabel => '单位';

  @override
  String get recordActionTitle => '记录今日';

  @override
  String get quantityLabel => '数量';

  @override
  String get recordButton => '记录';

  @override
  String get cancelAction => '取消记录';

  @override
  String get occurredOnLabel => '日期';

  @override
  String get progressTitle => '我的进度';

  @override
  String get openProgress => '进度';

  @override
  String get openPledge => '承诺';

  @override
  String get openRecord => '记录餐次';

  @override
  String get preferencesTitle => '偏好设置';

  @override
  String get openPreferences => '偏好设置';

  @override
  String get timezoneLabel => '时区';

  @override
  String get remindersEnabled => '每日提醒';

  @override
  String get reminderTime => '提醒时间';

  @override
  String get savePreferences => '保存偏好';

  @override
  String get logout => '退出登录';

  @override
  String get identifierRequired => '请输入邮箱或手机号。';

  @override
  String get passwordTooShort => '密码至少 8 个字符。';

  @override
  String get tokenRequired => '请输入消息中的令牌。';

  @override
  String get quantityInvalid => '请输入整数数量。';

  @override
  String get targetInvalid => '请输入整数目标。';

  @override
  String get campaignStatusDraft => '草稿';

  @override
  String get campaignStatusPublished => '已发布';

  @override
  String get campaignStatusStarted => '已开始';

  @override
  String get campaignStatusCompleted => '已完成';

  @override
  String get usesCampaignDuration => '目标跟随活动日期。';

  @override
  String get errorInvalidCredentials => '邮箱、手机号或密码不正确。';

  @override
  String get errorTokenInvalid => '令牌无效。';

  @override
  String get errorTokenReused => '会话令牌被重用，请重新登录。';

  @override
  String get errorTokenExpired => '令牌已过期。';

  @override
  String get errorIdentityExists => '该邮箱或手机号已注册。';

  @override
  String get errorWeakPassword => '请使用更强的密码（至少 8 个字符）。';

  @override
  String get errorSocialTokenInvalid => '社交登录无法验证。';

  @override
  String get errorUnauthorized => '请先登录。';

  @override
  String get errorForbidden => '你没有执行此操作的权限。';

  @override
  String get errorNotFound => '未找到请求的内容。';

  @override
  String get errorConflict => '此更改与现有数据冲突。';

  @override
  String get errorRateLimited => '尝试次数过多，请稍后再试。';

  @override
  String get errorValidation => '请检查表单后重试。';

  @override
  String get errorUnexpected => '出现问题，请重试。';

  @override
  String get errorAccountInactive => '此账号已停用，请联系你的组织方。';

  @override
  String get errorNetwork => '网络错误，请检查连接后重试。';

  @override
  String get navHome => '首页';

  @override
  String get navCampaigns => '活动';

  @override
  String get navMe => '我的';

  @override
  String get welcomeSubtitle => '加入社区活动，一起记录进度。';

  @override
  String get welcomeSpiritTitle => '如何使用';

  @override
  String get welcomeSpiritBody => '由组织方邀请你加入。激活账号并登录后，即可参加活动并记录每日行动。';

  @override
  String get welcomeContinue => '继续登录';

  @override
  String get welcomeBackLink => '返回欢迎页';

  @override
  String get activateIntro => '粘贴邀请令牌，或邮件/组织方提供的完整激活链接。';

  @override
  String get activationTokenHint => '令牌或 https://…/activate?token=…';

  @override
  String get activateSuccess => '账号已激活，请使用新密码登录。';

  @override
  String get resendActivationHint => '需要新链接？输入邮箱或手机号后重发。';

  @override
  String get backToSignIn => '返回登录';

  @override
  String get retry => '重试';

  @override
  String get noOrganisationLinked => '此账号尚未关联任何组织。';

  @override
  String homeCommunityLabel(String name) {
    return '社区：$name';
  }

  @override
  String get switchOrganisation => '组织';

  @override
  String get switchCommunity => '社区';

  @override
  String get homeCampaignsHeading => '你的活动';

  @override
  String get homeCanJoinLabel => '可参加';

  @override
  String get homeProgressUnavailable => '暂无进度';

  @override
  String get meAnonymousName => '成员';

  @override
  String get dashboardProgressStatusExceeded => '超额完成';

  @override
  String get dashboardProgressStatusAchieved => '已达成';

  @override
  String get dashboardProgressStatusNotStarted => '未开始';

  @override
  String get dashboardProgressStatusInProgress => '进行中';

  @override
  String wholeCampaignDays(String days) {
    return '整段活动（$days 天）';
  }

  @override
  String suggestedTargetLabel(String value, String unit) {
    return '建议：$value $unit';
  }

  @override
  String get errorAlreadyJoined => '你已参加此活动。';

  @override
  String get errorNotEligible => '你不符合此活动的参加条件，请联系组织方。';

  @override
  String get errorCampaignEnded => '此活动已结束。';

  @override
  String get errorCampaignNotOpen => '此活动尚未开放参加。';

  @override
  String campaignDatesLabel(String dates) {
    return '日期：$dates';
  }

  @override
  String get campaignDescriptionHeading => '简介';

  @override
  String get howItWorksHeading => '如何参与';

  @override
  String get communityProgressHeading => '社区目前进度';

  @override
  String get viewParticipation => '查看我的参加情况';

  @override
  String get continueToPledge => '继续承诺';

  @override
  String get joinCampaignTitle => '参加活动';

  @override
  String get changePledgeTitle => '更改承诺';

  @override
  String get confirmPledgeHeading => '确认你的承诺';

  @override
  String confirmPledgeBody(String choice, String dates) {
    return '你将承诺「$choice」，期间为 $dates。';
  }

  @override
  String get joiningInProgress => '正在加入…';

  @override
  String get confirmJoinAndPledge => '确认并加入';

  @override
  String get backToChoices => '返回选择';

  @override
  String get backToCampaign => '返回活动';

  @override
  String get noCommitmentChoices => '此活动暂无可用的承诺选项。';

  @override
  String get reviewPledge => '预览承诺';

  @override
  String get participationTitle => '我的参加';

  @override
  String get myCommitmentHeading => '我的承诺';

  @override
  String get noPledgeYet => '你尚未选择承诺。';

  @override
  String get openCheckIn => '每日打卡';

  @override
  String get withdrawTitle => '退出活动';

  @override
  String get withdrawConfirmBody => '退出后你的历史记录会保留，之后仍可重新加入。';

  @override
  String get withdrawConfirm => '退出';

  @override
  String get cancelLabel => '取消';

  @override
  String get notEnrolledHint => '你尚未参加此活动。';

  @override
  String get checkInTitle => '打卡';

  @override
  String get checkInComingSoon => '每日打卡将在后续版本提供。';

  @override
  String get backToParticipation => '返回参加情况';

  @override
  String get sectionJoined => '已参加';

  @override
  String get sectionOpenToJoin => '可参加';

  @override
  String get sectionPast => '往期';

  @override
  String get emptyJoinedCampaigns => '你还没有参加任何活动。';

  @override
  String get emptyOpenCampaigns => '目前没有可参加的活动。';

  @override
  String get emptyPastCampaigns => '暂无往期活动。';

  @override
  String get errorAlreadyRecorded => '这一天已经记录过了。';

  @override
  String get checkInDidItToday => '我今天做到了';

  @override
  String get checkInSaveMeals => '保存餐次';

  @override
  String get checkInSaving => '保存中…';

  @override
  String get checkInUndo => '撤销今日记录';

  @override
  String get checkInPickDay => '选择日期';

  @override
  String get checkInOptionalNote => '备注（可选）';

  @override
  String checkInNoteLabel(String note) {
    return '备注：$note';
  }

  @override
  String get checkInStatusDone => '已记录';

  @override
  String get checkInStatusPending => '待审核';

  @override
  String get checkInStatusRejected => '未计入';

  @override
  String get checkInStatusNotYet => '尚未记录';

  @override
  String get checkInStatusNotApplicable => '不可用';

  @override
  String checkInRejectedReason(String reason) {
    return '原因：$reason';
  }

  @override
  String get checkInFutureDisabled => '不能记录未来的日期。';

  @override
  String get checkInNoDefinition => '此活动尚未配置可记录的行动类型。';

  @override
  String get checkInMealsPrompt => '今天吃了几餐素？';

  @override
  String checkInPledgeSummary(String choice, String target, String unit) {
    return '承诺：$choice · $target $unit';
  }

  @override
  String get checkInHistoryHeading => '打卡记录';

  @override
  String get checkInHistoryEmpty => '还没有打卡。准备好时再记录第一天即可。';

  @override
  String checkInQuantityLabel(String quantity) {
    return '数量：$quantity';
  }

  @override
  String get myImpactHeading => '我的影响';

  @override
  String get todayCardHeading => '今日';

  @override
  String get todayRecordEarlier => '补记更早的一天';

  @override
  String todayStartsOn(String date) {
    return '开始于 $date';
  }
}

/// The translations for Chinese, using the Han script (`zh_Hans`).
class AppLocalizationsZhHans extends AppLocalizationsZh {
  AppLocalizationsZhHans() : super('zh_Hans');

  @override
  String get appTitle => '社区活动';

  @override
  String get homeMessage => '社区活动平台';

  @override
  String environmentLabel(String environment) {
    return '环境：$environment';
  }

  @override
  String get openDashboard => '我的仪表板';

  @override
  String get participantDashboardTitle => '我的活动仪表板';

  @override
  String get emptyDashboard => '暂无仪表板数据。管理员配置测量项后，已核准的行动才会显示。';

  @override
  String get progressSection => '进度';

  @override
  String get measurementsSection => '测量';

  @override
  String get outcomesSection => '成果';

  @override
  String get timeSeriesSection => '时间序列';

  @override
  String get visualizationSection => '可视化';

  @override
  String completionLabel(String percent) {
    return '完成度：$percent';
  }

  @override
  String achievedOfTarget(String achieved, String target, String unit) {
    return '$achieved / $target $unit';
  }

  @override
  String get noOutcomes => '暂无成果。影响系数由管理员配置。';

  @override
  String factorSourceLabel(String source) {
    return '来源：$source';
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
  String get treeInactive => '活动可视化尚未配置。';

  @override
  String get anonymousTotalsNote => '合计为匿名统计，不对个人进行排名。';

  @override
  String get languageLabel => '语言';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChinese => '简体中文';

  @override
  String get openNotifications => '通知';

  @override
  String get notificationsTitle => '通知';

  @override
  String get emptyNotifications => '暂无通知。';

  @override
  String get markRead => '标为已读';

  @override
  String get unreadLabel => '未读';

  @override
  String get readLabel => '已读';

  @override
  String get loginTitle => '登录';

  @override
  String get identifierLabel => '邮箱或手机号';

  @override
  String get passwordLabel => '密码';

  @override
  String get loginButton => '登录';

  @override
  String get googleSignIn => '使用 Google 继续';

  @override
  String get appleSignIn => '使用 Apple 继续';

  @override
  String get activateLink => '激活账号';

  @override
  String get forgotPassword => '忘记密码';

  @override
  String get activateTitle => '激活账号';

  @override
  String get activationTokenLabel => '激活令牌';

  @override
  String get newPasswordLabel => '新密码';

  @override
  String get activateButton => '激活';

  @override
  String get resendActivation => '重发激活';

  @override
  String get resetPasswordTitle => '重置密码';

  @override
  String get requestReset => '发送重置邮件';

  @override
  String get confirmReset => '设置新密码';

  @override
  String get resetTokenLabel => '重置令牌';

  @override
  String get acceptedMessage => '如果账号存在，我们已发送说明。';

  @override
  String get campaignsTitle => '活动';

  @override
  String get noCampaigns => '暂无活动。';

  @override
  String get joinCampaign => '参加';

  @override
  String get enrolledLabel => '已报名';

  @override
  String get withdrawnLabel => '已退出';

  @override
  String get pledgeTitle => '承诺';

  @override
  String get pledgeButton => '保存承诺';

  @override
  String get selectChoice => '选择承诺类型';

  @override
  String get targetValueLabel => '目标';

  @override
  String get unitLabel => '单位';

  @override
  String get recordActionTitle => '记录今日';

  @override
  String get quantityLabel => '数量';

  @override
  String get recordButton => '记录';

  @override
  String get cancelAction => '取消记录';

  @override
  String get occurredOnLabel => '日期';

  @override
  String get progressTitle => '我的进度';

  @override
  String get openProgress => '进度';

  @override
  String get openPledge => '承诺';

  @override
  String get openRecord => '记录餐次';

  @override
  String get preferencesTitle => '偏好设置';

  @override
  String get openPreferences => '偏好设置';

  @override
  String get timezoneLabel => '时区';

  @override
  String get remindersEnabled => '每日提醒';

  @override
  String get reminderTime => '提醒时间';

  @override
  String get savePreferences => '保存偏好';

  @override
  String get logout => '退出登录';

  @override
  String get identifierRequired => '请输入邮箱或手机号。';

  @override
  String get passwordTooShort => '密码至少 8 个字符。';

  @override
  String get tokenRequired => '请输入消息中的令牌。';

  @override
  String get quantityInvalid => '请输入整数数量。';

  @override
  String get targetInvalid => '请输入整数目标。';

  @override
  String get campaignStatusDraft => '草稿';

  @override
  String get campaignStatusPublished => '已发布';

  @override
  String get campaignStatusStarted => '已开始';

  @override
  String get campaignStatusCompleted => '已完成';

  @override
  String get usesCampaignDuration => '目标跟随活动日期。';

  @override
  String get errorInvalidCredentials => '邮箱、手机号或密码不正确。';

  @override
  String get errorTokenInvalid => '令牌无效。';

  @override
  String get errorTokenReused => '会话令牌被重用，请重新登录。';

  @override
  String get errorTokenExpired => '令牌已过期。';

  @override
  String get errorIdentityExists => '该邮箱或手机号已注册。';

  @override
  String get errorWeakPassword => '请使用更强的密码（至少 8 个字符）。';

  @override
  String get errorSocialTokenInvalid => '社交登录无法验证。';

  @override
  String get errorUnauthorized => '请先登录。';

  @override
  String get errorForbidden => '你没有执行此操作的权限。';

  @override
  String get errorNotFound => '未找到请求的内容。';

  @override
  String get errorConflict => '此更改与现有数据冲突。';

  @override
  String get errorRateLimited => '尝试次数过多，请稍后再试。';

  @override
  String get errorValidation => '请检查表单后重试。';

  @override
  String get errorUnexpected => '出现问题，请重试。';

  @override
  String get errorAccountInactive => '此账号已停用，请联系你的组织方。';

  @override
  String get errorNetwork => '网络错误，请检查连接后重试。';

  @override
  String get navHome => '首页';

  @override
  String get navCampaigns => '活动';

  @override
  String get navMe => '我的';

  @override
  String get welcomeSubtitle => '加入社区活动，一起记录进度。';

  @override
  String get welcomeSpiritTitle => '如何使用';

  @override
  String get welcomeSpiritBody => '由组织方邀请你加入。激活账号并登录后，即可参加活动并记录每日行动。';

  @override
  String get welcomeContinue => '继续登录';

  @override
  String get welcomeBackLink => '返回欢迎页';

  @override
  String get activateIntro => '粘贴邀请令牌，或邮件/组织方提供的完整激活链接。';

  @override
  String get activationTokenHint => '令牌或 https://…/activate?token=…';

  @override
  String get activateSuccess => '账号已激活，请使用新密码登录。';

  @override
  String get resendActivationHint => '需要新链接？输入邮箱或手机号后重发。';

  @override
  String get backToSignIn => '返回登录';

  @override
  String get retry => '重试';

  @override
  String get noOrganisationLinked => '此账号尚未关联任何组织。';

  @override
  String homeCommunityLabel(String name) {
    return '社区：$name';
  }

  @override
  String get switchOrganisation => '组织';

  @override
  String get switchCommunity => '社区';

  @override
  String get homeCampaignsHeading => '你的活动';

  @override
  String get homeCanJoinLabel => '可参加';

  @override
  String get homeProgressUnavailable => '暂无进度';

  @override
  String get meAnonymousName => '成员';

  @override
  String get dashboardProgressStatusExceeded => '超额完成';

  @override
  String get dashboardProgressStatusAchieved => '已达成';

  @override
  String get dashboardProgressStatusNotStarted => '未开始';

  @override
  String get dashboardProgressStatusInProgress => '进行中';

  @override
  String wholeCampaignDays(String days) {
    return '整段活动（$days 天）';
  }

  @override
  String suggestedTargetLabel(String value, String unit) {
    return '建议：$value $unit';
  }

  @override
  String get errorAlreadyJoined => '你已参加此活动。';

  @override
  String get errorNotEligible => '你不符合此活动的参加条件，请联系组织方。';

  @override
  String get errorCampaignEnded => '此活动已结束。';

  @override
  String get errorCampaignNotOpen => '此活动尚未开放参加。';

  @override
  String campaignDatesLabel(String dates) {
    return '日期：$dates';
  }

  @override
  String get campaignDescriptionHeading => '简介';

  @override
  String get howItWorksHeading => '如何参与';

  @override
  String get communityProgressHeading => '社区目前进度';

  @override
  String get viewParticipation => '查看我的参加情况';

  @override
  String get continueToPledge => '继续承诺';

  @override
  String get joinCampaignTitle => '参加活动';

  @override
  String get changePledgeTitle => '更改承诺';

  @override
  String get confirmPledgeHeading => '确认你的承诺';

  @override
  String confirmPledgeBody(String choice, String dates) {
    return '你将承诺「$choice」，期间为 $dates。';
  }

  @override
  String get joiningInProgress => '正在加入…';

  @override
  String get confirmJoinAndPledge => '确认并加入';

  @override
  String get backToChoices => '返回选择';

  @override
  String get backToCampaign => '返回活动';

  @override
  String get noCommitmentChoices => '此活动暂无可用的承诺选项。';

  @override
  String get reviewPledge => '预览承诺';

  @override
  String get participationTitle => '我的参加';

  @override
  String get myCommitmentHeading => '我的承诺';

  @override
  String get noPledgeYet => '你尚未选择承诺。';

  @override
  String get openCheckIn => '每日打卡';

  @override
  String get withdrawTitle => '退出活动';

  @override
  String get withdrawConfirmBody => '退出后你的历史记录会保留，之后仍可重新加入。';

  @override
  String get withdrawConfirm => '退出';

  @override
  String get cancelLabel => '取消';

  @override
  String get notEnrolledHint => '你尚未参加此活动。';

  @override
  String get checkInTitle => '打卡';

  @override
  String get checkInComingSoon => '每日打卡将在后续版本提供。';

  @override
  String get backToParticipation => '返回参加情况';

  @override
  String get sectionJoined => '已参加';

  @override
  String get sectionOpenToJoin => '可参加';

  @override
  String get sectionPast => '往期';

  @override
  String get emptyJoinedCampaigns => '你还没有参加任何活动。';

  @override
  String get emptyOpenCampaigns => '目前没有可参加的活动。';

  @override
  String get emptyPastCampaigns => '暂无往期活动。';

  @override
  String get errorAlreadyRecorded => '这一天已经记录过了。';

  @override
  String get checkInDidItToday => '我今天做到了';

  @override
  String get checkInSaveMeals => '保存餐次';

  @override
  String get checkInSaving => '保存中…';

  @override
  String get checkInUndo => '撤销今日记录';

  @override
  String get checkInPickDay => '选择日期';

  @override
  String get checkInOptionalNote => '备注（可选）';

  @override
  String checkInNoteLabel(String note) {
    return '备注：$note';
  }

  @override
  String get checkInStatusDone => '已记录';

  @override
  String get checkInStatusPending => '待审核';

  @override
  String get checkInStatusRejected => '未计入';

  @override
  String get checkInStatusNotYet => '尚未记录';

  @override
  String get checkInStatusNotApplicable => '不可用';

  @override
  String checkInRejectedReason(String reason) {
    return '原因：$reason';
  }

  @override
  String get checkInFutureDisabled => '不能记录未来的日期。';

  @override
  String get checkInNoDefinition => '此活动尚未配置可记录的行动类型。';

  @override
  String get checkInMealsPrompt => '今天吃了几餐素？';

  @override
  String checkInPledgeSummary(String choice, String target, String unit) {
    return '承诺：$choice · $target $unit';
  }

  @override
  String get checkInHistoryHeading => '打卡记录';

  @override
  String get checkInHistoryEmpty => '还没有打卡。准备好时再记录第一天即可。';

  @override
  String checkInQuantityLabel(String quantity) {
    return '数量：$quantity';
  }

  @override
  String get myImpactHeading => '我的影响';

  @override
  String get todayCardHeading => '今日';

  @override
  String get todayRecordEarlier => '补记更早的一天';

  @override
  String todayStartsOn(String date) {
    return '开始于 $date';
  }
}
