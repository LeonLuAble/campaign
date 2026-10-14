// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => '社区活动管理';

  @override
  String get homeMessage => '管理端';

  @override
  String environmentLabel(String environment) {
    return '环境：$environment';
  }

  @override
  String get openCampaignDashboard => '活动仪表板';

  @override
  String get openCommunityDashboard => '社区仪表板';

  @override
  String get campaignDashboardTitle => '活动仪表板';

  @override
  String get communityDashboardTitle => '社区仪表板';

  @override
  String get emptyDashboard => '暂无仪表板数据。请先配置测量定义和影响系数，并等待已核准的行动。';

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
  String get noOutcomes => '暂无成果。影响系数按活动或租户配置，平台不会硬编码数值。';

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
  String get anonymousTotalsNote => '合计为匿名统计，不对个人进行比较或排名。';

  @override
  String get languageLabel => '语言';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChinese => '简体中文';

  @override
  String get openCampaignReport => '活动报告';

  @override
  String get campaignReportTitle => '活动报告';

  @override
  String get emptyReport => '暂无报告数据。';

  @override
  String get exportCsv => '导出 CSV';

  @override
  String get exportRequiresPermission => 'CSV 导出需要 reports.export 权限，并会写入审计日志。';

  @override
  String get anonymousReportNote => '合计报告不含联系方式，也不对个人排名。';

  @override
  String get loginTitle => '登录';

  @override
  String get identifierLabel => '邮箱或手机号';

  @override
  String get passwordLabel => '密码';

  @override
  String get loginButton => '登录';

  @override
  String get setupTitle => '首次管理员设置';

  @override
  String get setupSubtitle => '为此环境创建首位平台管理员。';

  @override
  String get setupKeyLabel => '设置密钥';

  @override
  String get setupEmailLabel => '管理员邮箱';

  @override
  String get setupConfirmPasswordLabel => '确认密码';

  @override
  String get setupDisplayNameLabel => '显示名称（可选）';

  @override
  String get setupSubmitButton => '创建管理员';

  @override
  String get setupKeyRequired => '请输入完整的设置密钥。';

  @override
  String get setupEmailRequired => '请输入有效的邮箱地址。';

  @override
  String get setupPasswordMismatch => '两次输入的密码不一致。';

  @override
  String get checkingSetup => '正在检查设置状态…';

  @override
  String get logout => '退出登录';

  @override
  String get customersTitle => '客户';

  @override
  String get createCustomer => '创建客户';

  @override
  String get customerNameLabel => '客户名称';

  @override
  String get communitiesTitle => '社区';

  @override
  String get createCommunity => '创建社区';

  @override
  String get communityNameLabel => '社区名称';

  @override
  String get importTitle => 'CSV 导入';

  @override
  String get uploadCsv => '上传 CSV';

  @override
  String get mapFields => '保存映射';

  @override
  String get validateImport => '校验';

  @override
  String get previewImport => '预览';

  @override
  String get confirmImport => '确认导入';

  @override
  String get importResult => '导入结果';

  @override
  String get campaignsTitle => '活动';

  @override
  String get createCampaign => '创建活动';

  @override
  String get campaignNameLabel => '活动名称';

  @override
  String get timezoneLabel => '时区';

  @override
  String get startsOnLabel => '开始日期';

  @override
  String get endsOnLabel => '结束日期';

  @override
  String get publishCampaign => '发布';

  @override
  String get startCampaign => '开始';

  @override
  String get participantsTitle => '参加者';

  @override
  String get submissionsTitle => '提交';

  @override
  String get rejectSubmission => '驳回';

  @override
  String get rejectNoteLabel => '审核备注';

  @override
  String get impactFactorsTitle => '影响系数';

  @override
  String get sourceUnitLabel => '来源单位';

  @override
  String get outcomeMetricLabel => '成果指标';

  @override
  String get outcomeUnitLabel => '成果单位';

  @override
  String get factorValueLabel => '系数值';

  @override
  String get citationLabel => '来源引用';

  @override
  String get effectiveFromLabel => '生效日期';

  @override
  String get saveImpactFactor => '保存影响系数';

  @override
  String get identifierRequired => '请输入邮箱或手机号。';

  @override
  String get passwordTooShort => '密码至少 8 个字符。';

  @override
  String get nameRequired => '请输入名称。';

  @override
  String get openImport => 'CSV 导入';

  @override
  String get openCampaigns => '活动';

  @override
  String get openCommunities => '社区';

  @override
  String get openParticipants => '参加者';

  @override
  String get openSubmissions => '提交';

  @override
  String get openImpactFactors => '影响系数';

  @override
  String get rulesStrategyLabel => '规则策略';

  @override
  String get templateLabel => '模板';

  @override
  String get scopeLabel => '范围';

  @override
  String get emailColumn => '邮箱列';

  @override
  String get mobileColumn => '手机列';

  @override
  String get exportReady => 'CSV 已准备好。';

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
  String get errorSetupNotAvailable => '首次管理员设置不可用。';

  @override
  String get errorInvalidSetupKey => '设置密钥不正确。';

  @override
  String get errorRateLimited => '尝试次数过多，请稍后再试。';

  @override
  String get errorValidation => '请检查表单后重试。';

  @override
  String get errorUnexpected => '出现问题，请重试。';

  @override
  String get noCustomers => '暂无客户。';

  @override
  String get noCommunities => '暂无社区。';

  @override
  String get noCampaigns => '暂无活动。';
}

/// The translations for Chinese, using the Han script (`zh_Hans`).
class AppLocalizationsZhHans extends AppLocalizationsZh {
  AppLocalizationsZhHans() : super('zh_Hans');

  @override
  String get appTitle => '社区活动管理';

  @override
  String get homeMessage => '管理端';

  @override
  String environmentLabel(String environment) {
    return '环境：$environment';
  }

  @override
  String get openCampaignDashboard => '活动仪表板';

  @override
  String get openCommunityDashboard => '社区仪表板';

  @override
  String get campaignDashboardTitle => '活动仪表板';

  @override
  String get communityDashboardTitle => '社区仪表板';

  @override
  String get emptyDashboard => '暂无仪表板数据。请先配置测量定义和影响系数，并等待已核准的行动。';

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
  String get noOutcomes => '暂无成果。影响系数按活动或租户配置，平台不会硬编码数值。';

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
  String get anonymousTotalsNote => '合计为匿名统计，不对个人进行比较或排名。';

  @override
  String get languageLabel => '语言';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChinese => '简体中文';

  @override
  String get openCampaignReport => '活动报告';

  @override
  String get campaignReportTitle => '活动报告';

  @override
  String get emptyReport => '暂无报告数据。';

  @override
  String get exportCsv => '导出 CSV';

  @override
  String get exportRequiresPermission => 'CSV 导出需要 reports.export 权限，并会写入审计日志。';

  @override
  String get anonymousReportNote => '合计报告不含联系方式，也不对个人排名。';

  @override
  String get loginTitle => '登录';

  @override
  String get identifierLabel => '邮箱或手机号';

  @override
  String get passwordLabel => '密码';

  @override
  String get loginButton => '登录';

  @override
  String get setupTitle => '首次管理员设置';

  @override
  String get setupSubtitle => '为此环境创建首位平台管理员。';

  @override
  String get setupKeyLabel => '设置密钥';

  @override
  String get setupEmailLabel => '管理员邮箱';

  @override
  String get setupConfirmPasswordLabel => '确认密码';

  @override
  String get setupDisplayNameLabel => '显示名称（可选）';

  @override
  String get setupSubmitButton => '创建管理员';

  @override
  String get setupKeyRequired => '请输入完整的设置密钥。';

  @override
  String get setupEmailRequired => '请输入有效的邮箱地址。';

  @override
  String get setupPasswordMismatch => '两次输入的密码不一致。';

  @override
  String get checkingSetup => '正在检查设置状态…';

  @override
  String get logout => '退出登录';

  @override
  String get customersTitle => '客户';

  @override
  String get createCustomer => '创建客户';

  @override
  String get customerNameLabel => '客户名称';

  @override
  String get communitiesTitle => '社区';

  @override
  String get createCommunity => '创建社区';

  @override
  String get communityNameLabel => '社区名称';

  @override
  String get importTitle => 'CSV 导入';

  @override
  String get uploadCsv => '上传 CSV';

  @override
  String get mapFields => '保存映射';

  @override
  String get validateImport => '校验';

  @override
  String get previewImport => '预览';

  @override
  String get confirmImport => '确认导入';

  @override
  String get importResult => '导入结果';

  @override
  String get campaignsTitle => '活动';

  @override
  String get createCampaign => '创建活动';

  @override
  String get campaignNameLabel => '活动名称';

  @override
  String get timezoneLabel => '时区';

  @override
  String get startsOnLabel => '开始日期';

  @override
  String get endsOnLabel => '结束日期';

  @override
  String get publishCampaign => '发布';

  @override
  String get startCampaign => '开始';

  @override
  String get participantsTitle => '参加者';

  @override
  String get submissionsTitle => '提交';

  @override
  String get rejectSubmission => '驳回';

  @override
  String get rejectNoteLabel => '审核备注';

  @override
  String get impactFactorsTitle => '影响系数';

  @override
  String get sourceUnitLabel => '来源单位';

  @override
  String get outcomeMetricLabel => '成果指标';

  @override
  String get outcomeUnitLabel => '成果单位';

  @override
  String get factorValueLabel => '系数值';

  @override
  String get citationLabel => '来源引用';

  @override
  String get effectiveFromLabel => '生效日期';

  @override
  String get saveImpactFactor => '保存影响系数';

  @override
  String get identifierRequired => '请输入邮箱或手机号。';

  @override
  String get passwordTooShort => '密码至少 8 个字符。';

  @override
  String get nameRequired => '请输入名称。';

  @override
  String get openImport => 'CSV 导入';

  @override
  String get openCampaigns => '活动';

  @override
  String get openCommunities => '社区';

  @override
  String get openParticipants => '参加者';

  @override
  String get openSubmissions => '提交';

  @override
  String get openImpactFactors => '影响系数';

  @override
  String get rulesStrategyLabel => '规则策略';

  @override
  String get templateLabel => '模板';

  @override
  String get scopeLabel => '范围';

  @override
  String get emailColumn => '邮箱列';

  @override
  String get mobileColumn => '手机列';

  @override
  String get exportReady => 'CSV 已准备好。';

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
  String get errorSetupNotAvailable => '首次管理员设置不可用。';

  @override
  String get errorInvalidSetupKey => '设置密钥不正确。';

  @override
  String get errorRateLimited => '尝试次数过多，请稍后再试。';

  @override
  String get errorValidation => '请检查表单后重试。';

  @override
  String get errorUnexpected => '出现问题，请重试。';

  @override
  String get noCustomers => '暂无客户。';

  @override
  String get noCommunities => '暂无社区。';

  @override
  String get noCampaigns => '暂无活动。';
}
