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
}
