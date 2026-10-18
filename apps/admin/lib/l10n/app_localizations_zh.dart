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
  String get importsSubtitle => '上传成员 CSV、查看验证结果并确认导入。';

  @override
  String get newImport => '新建导入';

  @override
  String get noImportsYet => '暂无导入记录。可先下载模板 CSV。';

  @override
  String get backToImports => '返回导入';

  @override
  String get importWizardSubtitle => '引导式上传、映射、验证与确认。';

  @override
  String get importStepUpload => '上传';

  @override
  String get importStepMap => '映射';

  @override
  String get importStepValidate => '验证';

  @override
  String get importStepPreview => '预览';

  @override
  String get importStepConfirm => '确认';

  @override
  String get downloadImportTemplate => '下载模板';

  @override
  String get templateDownloaded => '模板已就绪。';

  @override
  String get importUploadHint => '先下载模板，再选择 CSV。可选择默认社区，用于没有 communityPath 的行。';

  @override
  String importSelectedFile(String name) {
    return '已选：$name';
  }

  @override
  String get importDefaultCommunity => '默认社区（可选）';

  @override
  String get importFileRequired => '请选择 CSV 文件后继续。';

  @override
  String get importBadFileType => '请选择 .csv 文件。';

  @override
  String get importEmptyFile => '文件为空。';

  @override
  String get importMissingRequiredColumns => '请至少映射邮箱或手机列。';

  @override
  String get importPickerUnavailable => '当前环境无法选择文件。';

  @override
  String get importMapHint => '将 CSV 列映射到字段。邮箱或手机为必填。';

  @override
  String get mappingUnmapped => '未映射';

  @override
  String get canonicalEmail => '邮箱';

  @override
  String get canonicalMobile => '手机';

  @override
  String get canonicalExternalId => '外部 ID';

  @override
  String get canonicalFirstName => '名';

  @override
  String get canonicalLastName => '姓';

  @override
  String get canonicalDisplayName => '显示名称';

  @override
  String get canonicalCommunityId => '社区 ID';

  @override
  String get canonicalCommunityPath => '社区路径';

  @override
  String get importValidateHeading => '验证结果';

  @override
  String get importPreviewHeading => '预览';

  @override
  String importValidateSummary(int valid, int invalid, int review) {
    return '$valid 有效 · $invalid 错误 · $review 待复核';
  }

  @override
  String get importNoProblemRows => '没有错误或待复核行。';

  @override
  String get importNoRows => '没有可显示的行。';

  @override
  String get importReviewInstruction => '标记为“待复核”的行无法在此处理。请修正 CSV 后重新导入。';

  @override
  String get importConfirmHint => '确认后将创建或匹配成员，并在需要时发送激活邀请。';

  @override
  String importConfirmSummary(int ready, int skipped) {
    return '将导入 $ready 行。$skipped 行错误或待复核将被跳过。';
  }

  @override
  String importResultSummary(int created, int matched, int errors) {
    return '已创建 $created · 已匹配 $matched · 错误 $errors';
  }

  @override
  String importRowTitle(int number, String identifier) {
    return '第 $number 行：$identifier';
  }

  @override
  String get downloadErrorCsv => '下载错误 CSV';

  @override
  String get errorCsvDownloaded => '错误 CSV 已就绪。';

  @override
  String get importColumnFile => '文件';

  @override
  String get importColumnStatus => '状态';

  @override
  String get importColumnDate => '日期';

  @override
  String get importColumnCounts => '计数';

  @override
  String importCountsSummary(int created, int matched, int errors) {
    return '已创建 $created · 已匹配 $matched · 错误 $errors';
  }

  @override
  String get importStatusUploaded => '已上传';

  @override
  String get importStatusMapped => '已映射';

  @override
  String get importStatusValidated => '已验证';

  @override
  String get importStatusConfirmed => '已确认';

  @override
  String get importStatusFailed => '失败';

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

  @override
  String get navCustomers => '客户';

  @override
  String get navOverview => '概览';

  @override
  String get navPeople => '成员';

  @override
  String get navCommunities => '社区';

  @override
  String get navCampaigns => '活动';

  @override
  String get navImports => '导入';

  @override
  String get navReports => '报表';

  @override
  String get selectCustomer => '选择客户';

  @override
  String get platformConsole => '平台控制台';

  @override
  String get skipToContent => '跳到主要内容';

  @override
  String get userProfile => '个人资料';

  @override
  String get profileComingSoon => '个人资料设置即将推出。';

  @override
  String get overviewSubtitle => '此客户的概览状态。';

  @override
  String get metricMembers => '成员';

  @override
  String get metricCommunities => '社区';

  @override
  String get metricCampaigns => '活动';

  @override
  String metricCampaignsByStatus(String status) {
    return '活动 · $status';
  }

  @override
  String get nextStepsTitle => '下一步';

  @override
  String get nextStepCommunities => '创建社区';

  @override
  String get nextStepPeople => '导入或邀请成员';

  @override
  String get nextStepCampaign => '创建活动';

  @override
  String get nextStepsComplete => '已完成基础设置，继续推进活动。';

  @override
  String get overviewEmptyPermissions => '当前角色没有可用的概览指标。';

  @override
  String get peopleComingSoon => '成员名录即将推出。';

  @override
  String get peopleSubtitle => '搜索、筛选、邀请并管理成员。';

  @override
  String get navRoles => '角色';

  @override
  String get rolesSubtitle => '系统与自定义角色及其权限键（只读）。';

  @override
  String get backToPeople => '返回成员';

  @override
  String get noRoles => '暂无角色。';

  @override
  String get systemRoleBadge => '系统';

  @override
  String get rolePermissionsHeading => '权限';

  @override
  String get peopleSearchLabel => '搜索姓名、邮箱或手机';

  @override
  String get peopleFilterCommunity => '社区';

  @override
  String get peopleFilterRole => '角色';

  @override
  String get peopleFilterStatus => '状态';

  @override
  String get includeSubCommunities => '包含子社区';

  @override
  String get pendingOnlyFilter => '仅待激活';

  @override
  String get anyCommunity => '全部社区';

  @override
  String get anyRole => '全部角色';

  @override
  String get anyStatus => '全部状态';

  @override
  String get clearFilter => '清除';

  @override
  String get pickCommunityTitle => '选择社区';

  @override
  String get pickCommunityRequired => '请选择社区';

  @override
  String get peopleColumnName => '姓名';

  @override
  String get peopleColumnContact => '邮箱 / 手机';

  @override
  String get peopleColumnCommunity => '社区';

  @override
  String get peopleColumnRoles => '角色';

  @override
  String get peopleColumnStatus => '状态';

  @override
  String get noMembers => '没有符合条件的成员。';

  @override
  String get loadMore => '加载更多';

  @override
  String get rowActions => '操作';

  @override
  String get viewMember => '查看';

  @override
  String get inviteMember => '邀请成员';

  @override
  String get inviteMemberTitle => '邀请成员';

  @override
  String get inviteMemberConfirm => '发送邀请';

  @override
  String get inviteEmailLabel => '邮箱';

  @override
  String get inviteMobileLabel => '手机';

  @override
  String get inviteDisplayNameLabel => '显示名称';

  @override
  String get inviteRoleLabel => '角色';

  @override
  String get inviteIdentifierRequired => '请输入邮箱或手机号。';

  @override
  String get inviteEmailInvalid => '请输入有效的邮箱地址。';

  @override
  String get inviteMobileInvalid => '请输入有效的手机号。';

  @override
  String get inviteEmailSentTitle => '邀请已发送';

  @override
  String inviteEmailSentBody(String email) {
    return '已向 $email 发送激活邮件。';
  }

  @override
  String get inviteMobileLinkTitle => '一次性激活链接';

  @override
  String get inviteMobileLinkBody => '未发送短信。请复制此链接并仅分享一次给该成员。';

  @override
  String get activationLinkShownOnceNote => '此链接仅显示一次，24 小时后过期。';

  @override
  String get membershipStatusInactive => '已停用';

  @override
  String get tenantLevelMembership => '组织级';

  @override
  String memberCommunityLabel(String name) {
    return '社区：$name';
  }

  @override
  String get memberRolesHeading => '角色';

  @override
  String get assignRoleAction => '添加角色';

  @override
  String get assignRoleTitle => '分配角色';

  @override
  String get noRolesToAssign => '可用角色均已分配。';

  @override
  String get removeRoleTitle => '移除角色';

  @override
  String removeRoleBody(String name) {
    return '从该成员移除 $name 角色？';
  }

  @override
  String get removeRoleConfirm => '移除';

  @override
  String get deactivateMember => '停用';

  @override
  String get reactivateMember => '重新启用';

  @override
  String get deactivateMemberTitle => '停用成员资格';

  @override
  String get reactivateMemberTitle => '重新启用成员资格';

  @override
  String deactivateMemberBody(String name) {
    return '停用 $name？停用后将无法访问，直至重新启用。';
  }

  @override
  String reactivateMemberBody(String name) {
    return '重新启用 $name？';
  }

  @override
  String get deactivateMemberConfirm => '停用';

  @override
  String get reactivateMemberConfirm => '重新启用';

  @override
  String get memberDeactivatedSnackbar => '成员资格已停用。';

  @override
  String get memberReactivatedSnackbar => '成员资格已重新启用。';

  @override
  String get errorLastTenantAdmin => '不能移除或停用组织中的最后一位管理员。';

  @override
  String get retry => '重试';

  @override
  String get adminNameLabel => '管理员显示名称';

  @override
  String get adminEmailLabel => '管理员邮箱';

  @override
  String get adminEmailRequired => '请输入客户管理员邮箱。';

  @override
  String get activationLinkTitle => '分享激活链接';

  @override
  String get activationLinkNote => '邮件发送尚未接入。请复制此链接并手动发给客户管理员，以便其设置密码。';

  @override
  String get copyLink => '复制';

  @override
  String get copiedToClipboard => '已复制到剪贴板';

  @override
  String get close => '关闭';

  @override
  String get reportsTitle => '报表';

  @override
  String get activateTitle => '激活账户';

  @override
  String get activateSubtitle => '设置密码以激活管理员账户。';

  @override
  String get activationTokenLabel => '激活令牌';

  @override
  String get activateButton => '激活';

  @override
  String get tokenRequired => '请输入消息中的令牌。';

  @override
  String get forgotPassword => '忘记密码';

  @override
  String get resetPasswordTitle => '重置密码';

  @override
  String get resetRequestSubtitle => '请输入邮箱或手机号。如果账户存在，我们将发送重置说明。';

  @override
  String get resetConfirmSubtitle => '使用消息中的令牌设置新密码。';

  @override
  String get resetConfirmOptionalSubtitle => '已有重置令牌？在下方设置新密码。';

  @override
  String get requestReset => '发送重置邮件';

  @override
  String get confirmReset => '设置新密码';

  @override
  String get resetTokenLabel => '重置令牌';

  @override
  String get newPasswordLabel => '新密码';

  @override
  String get acceptedMessage => '如果账户存在，我们已发送说明。';

  @override
  String get activateSuccess => '账户已激活，可以登录。';

  @override
  String get resetSuccess => '密码已更新，可以登录。';

  @override
  String get goToLogin => '前往登录';

  @override
  String get platformCustomersTitle => '客户';

  @override
  String get platformCustomersSubtitle => '入驻组织。仅平台元数据，不含租户业务数据。';

  @override
  String get searchCustomers => '按名称或 slug 搜索';

  @override
  String get noPlatformCustomers => '暂无客户。请创建第一个组织。';

  @override
  String get noSearchResults => '没有匹配的客户。';

  @override
  String get customerSlugLabel => 'Slug';

  @override
  String get customerStatusLabel => '状态';

  @override
  String get customerCreatedLabel => '创建时间';

  @override
  String get adminCountLabel => '管理员';

  @override
  String get pendingInvitesLabel => '待激活邀请';

  @override
  String get statusActive => '启用';

  @override
  String get statusInactive => '停用';

  @override
  String get customerDetailTitle => '客户';

  @override
  String get wizardStepOrganisation => '组织';

  @override
  String get wizardStepAdmin => '首位管理员';

  @override
  String get wizardStepReview => '确认';

  @override
  String get wizardNext => '下一步';

  @override
  String get wizardBack => '上一步';

  @override
  String get cancel => '取消';

  @override
  String get adminNameRequired => '请输入管理员显示名称。';

  @override
  String get adminLocaleLabel => '管理员语言';

  @override
  String get createCustomerSuccessTitle => '客户已创建';

  @override
  String createCustomerSuccessMessage(String email) {
    return '激活邮件已发送至 $email。';
  }

  @override
  String createCustomerSuccessDetail(String name) {
    return '$name 已就绪。管理员可激活并登录。';
  }

  @override
  String get createCustomerFailureHint => '可重试创建，或打开客户详情重新发送激活邮件。';

  @override
  String get viewCustomer => '查看客户';

  @override
  String get backToCustomers => '返回客户列表';

  @override
  String get resendActivation => '重发激活邮件';

  @override
  String get activationResentSnackbar => '已再次发送激活邮件。';

  @override
  String get adminsSectionTitle => '管理员';

  @override
  String get noAdminsYet => '尚未记录管理员。请邀请一位以开始。';

  @override
  String get inviteAnotherAdmin => '邀请另一位管理员';

  @override
  String get inviteAdminTitle => '邀请管理员';

  @override
  String get inviteAdminConfirm => '发送邀请';

  @override
  String inviteAdminConfirmBody(String email) {
    return '向 $email 发送激活邀请？';
  }

  @override
  String get inviteAdminSuccessSnackbar => '邀请已发送。';

  @override
  String resendActivationConfirmBody(String email) {
    return '向 $email 重新发送激活邮件？';
  }

  @override
  String get activationStatusPending => '待激活';

  @override
  String get activationStatusActive => '已激活';

  @override
  String adminCountSummary(int admins, int pending) {
    return '$admins 位管理员 · $pending 个待激活邀请';
  }

  @override
  String get communitiesSubtitle => '将成员组织成任意深度的层级结构。';

  @override
  String get createFirstCommunity => '创建第一个社区';

  @override
  String get createRootCommunityTitle => '创建社区';

  @override
  String get createChildCommunityTitle => '添加子社区';

  @override
  String get addChildCommunity => '添加子节点';

  @override
  String get renameCommunity => '重命名';

  @override
  String get renameCommunityTitle => '重命名社区';

  @override
  String get moveCommunity => '移动到…';

  @override
  String get moveCommunityTitle => '移动社区';

  @override
  String moveCommunityHint(String name) {
    return '为 $name 选择新的上级。其自身的子孙节点已被排除。';
  }

  @override
  String get moveCommunityConfirm => '移动';

  @override
  String get communityRootLabel => '组织根（无上级）';

  @override
  String get noMoveTargets => '没有可用作上级的其他社区。';

  @override
  String get deactivateCommunity => '停用';

  @override
  String get reactivateCommunity => '重新启用';

  @override
  String get deactivateCommunityTitle => '停用社区';

  @override
  String get reactivateCommunityTitle => '重新启用社区';

  @override
  String deactivateCommunityBody(String name) {
    return '停用 $name？它仍会保留在树中，但标记为停用。';
  }

  @override
  String reactivateCommunityBody(String name) {
    return '重新启用 $name？';
  }

  @override
  String get deactivateCommunityConfirm => '停用';

  @override
  String get reactivateCommunityConfirm => '重新启用';

  @override
  String get communityCycleError => '该移动会造成循环，请选择其他上级。';

  @override
  String get communityCreatedSnackbar => '社区已创建。';

  @override
  String get communityRenamedSnackbar => '社区已重命名。';

  @override
  String get communityMovedSnackbar => '社区已移动。';

  @override
  String get communityDeactivatedSnackbar => '社区已停用。';

  @override
  String get communityReactivatedSnackbar => '社区已重新启用。';

  @override
  String get expandNode => '展开';

  @override
  String get collapseNode => '折叠';

  @override
  String get communityActions => '社区操作';

  @override
  String communityNodeSemantics(String name) {
    return '社区 $name';
  }

  @override
  String get save => '保存';

  @override
  String get createAction => '创建';

  @override
  String get newCampaign => '新建活动';

  @override
  String get campaignSearchHint => '搜索活动';

  @override
  String get campaignFilterStatus => '状态';

  @override
  String get campaignFilterAll => '全部状态';

  @override
  String get campaignStatusDraft => '草稿';

  @override
  String get campaignStatusPublished => '已发布';

  @override
  String get campaignStatusStarted => '已开始';

  @override
  String get campaignStatusCompleted => '已完成';

  @override
  String get campaignColumnName => '名称';

  @override
  String get campaignColumnStatus => '状态';

  @override
  String get campaignColumnDates => '日期';

  @override
  String get campaignColumnParticipants => '参加者';

  @override
  String get campaignDatesUnset => '未设置日期';

  @override
  String campaignParticipantCount(int count) {
    return '$count';
  }

  @override
  String get campaignWizardTitle => '创建活动';

  @override
  String get campaignStepBasics => '基本信息';

  @override
  String get campaignStepSchedule => '日程';

  @override
  String get campaignStepRules => '规则';

  @override
  String get campaignStepAudience => '受众';

  @override
  String get campaignStepActions => '行动';

  @override
  String get campaignStepReview => '确认';

  @override
  String get campaignNameZhLabel => '名称（简体中文）';

  @override
  String get campaignDescriptionZhLabel => '描述（简体中文）';

  @override
  String get campaignNameEnLabel => '名称（英文，可选）';

  @override
  String get campaignDescriptionEnLabel => '描述（英文，可选）';

  @override
  String get campaignPickStartDate => '选择开始日期';

  @override
  String get campaignPickEndDate => '选择结束日期';

  @override
  String get campaignTimezoneSearch => '搜索时区';

  @override
  String get campaignRulesStrategyHint => '请从列表选择规则策略。承诺规则由服务器提供，请勿手写策略键。';

  @override
  String get campaignAudienceCustomerWide => '整个组织';

  @override
  String get campaignAudienceSelected => '选定社区';

  @override
  String get campaignAudiencePickCommunities => '选择社区';

  @override
  String get campaignAudienceRequired => '请至少选择一个社区，或选择整个组织。';

  @override
  String get campaignReviewModeLabel => '提交审核方式';

  @override
  String get campaignReviewModeAuto => '自动';

  @override
  String get campaignReviewModeManual => '人工';

  @override
  String get campaignReviewModeAutoHelp => '记录自动通过。负责人仍可抽查并驳回错误记录。';

  @override
  String get campaignReviewModeManualHelp => '每条记录进入审核队列，由负责人批准或驳回。';

  @override
  String get campaignActionDefinitionsTitle => '行动定义';

  @override
  String get campaignActionNameLabel => '行动名称';

  @override
  String get campaignActionKeyLabel => '键';

  @override
  String get campaignActionUnitLabel => '单位';

  @override
  String get campaignAddActionDefinition => '添加行动';

  @override
  String get campaignRemoveActionDefinition => '移除';

  @override
  String get campaignApplyRecommendedActions => '应用推荐定义';

  @override
  String get campaignCreateAsDraft => '创建为草稿';

  @override
  String get campaignReviewSummary => '请确认活动信息，然后创建为草稿。';

  @override
  String get campaignWorkspaceOverview => '概览';

  @override
  String get campaignWorkspaceSettings => '设置';

  @override
  String get campaignWorkspaceParticipants => '参加者';

  @override
  String get campaignWorkspaceSubmissions => '提交';

  @override
  String get campaignWorkspaceMilestonesImpact => '里程碑与影响';

  @override
  String get campaignWorkspaceDashboardReports => '看板与报表';

  @override
  String get campaignWorkspaceDashboard => '看板';

  @override
  String get campaignWorkspaceReports => '报表';

  @override
  String get dashboardGranularityDay => '按日';

  @override
  String get dashboardGranularityWeek => '按周';

  @override
  String get dashboardMetricParticipants => '参加者';

  @override
  String get dashboardMetricParticipationRate => '参与率';

  @override
  String get dashboardMetricCompleted => '已完成总量';

  @override
  String get dashboardMetricProgress => '相对目标进度';

  @override
  String dashboardParticipationRateValue(String percent) {
    return '$percent%';
  }

  @override
  String get dashboardProgressStatusExceeded => '已超额';

  @override
  String get dashboardProgressStatusAchieved => '已达成';

  @override
  String get dashboardProgressStatusInProgress => '进行中';

  @override
  String get dashboardProgressStatusNotStarted => '未开始';

  @override
  String get dashboardChartMode => '图表';

  @override
  String get dashboardTableMode => '表格';

  @override
  String get dashboardChartEmpty => '暂无时间序列数据。';

  @override
  String get dashboardCommunityPickerLabel => '社区';

  @override
  String get dashboardCommunityWholeCampaign => '整个活动';

  @override
  String get dashboardIncludeSubCommunities => '包含下级社区';

  @override
  String get dashboardIncludeSubCommunitiesHelp => '社区指标始终包含所选社区及其下级。';

  @override
  String dashboardTreeTextAlternative(String name, String percent) {
    return '$name：活动目标的 $percent%';
  }

  @override
  String get reportCampaignTitle => '活动汇总报表';

  @override
  String get reportCampaignDescription => '匿名活动合计：参加者、承诺与按单位完成情况。不含联系方式。';

  @override
  String get reportCommunityTitle => '社区汇总报表';

  @override
  String get reportCommunityDescription => '某社区子树的匿名合计。不含联系方式或排名。';

  @override
  String get reportPickCommunity => '为社区报表选择社区';

  @override
  String get reportExportDownloaded => '已开始下载 CSV。';

  @override
  String get reportNoDateFilter => '此报表暂不支持日期范围筛选。';

  @override
  String reportGeneratedAt(String when) {
    return '生成于 $when';
  }

  @override
  String reportUnitLine(
    String unit,
    String achieved,
    String target,
    String percent,
  ) {
    return '$unit：$achieved / $target（$percent）';
  }

  @override
  String get campaignPublishChecklistTitle => '发布检查清单';

  @override
  String get campaignChecklistDates => '开始与结束日期';

  @override
  String get campaignChecklistActions => '至少一个行动定义';

  @override
  String get campaignChecklistAudience => '受众（全组织或社区）';

  @override
  String get campaignChecklistMissing => '缺失';

  @override
  String get campaignChecklistReady => '就绪';

  @override
  String get publishCampaignConfirmTitle => '发布活动？';

  @override
  String get publishCampaignConfirmBody =>
      '成员将可以看到并加入。发布后设置字段会锁定；仅描述与延长结束日期仍可编辑。';

  @override
  String get startCampaignConfirmTitle => '开始活动？';

  @override
  String get startCampaignConfirmBody => '已报名参加者将收到活动开始通知，并可开始记录。';

  @override
  String get completeCampaign => '完成';

  @override
  String get completeCampaignConfirmTitle => '完成活动？';

  @override
  String get completeCampaignConfirmBody => '记录将关闭；行动定义锁定；历史保留。此操作不可撤销。';

  @override
  String get confirmAction => '确认';

  @override
  String get campaignFieldLocked => '发布后已锁定';

  @override
  String get campaignSaveSettings => '保存更改';

  @override
  String get campaignSettingsSaved => '活动已更新。';

  @override
  String get campaignMilestonesComingSoon => '里程碑管理将在后续阶段提供。下方可管理影响系数。';

  @override
  String get campaignDescriptionLabel => '描述';

  @override
  String get errorCampaignFieldLocked => '发布后仅可修改描述，以及延长结束日期。';

  @override
  String get errorCampaignEndDateLocked => '发布后结束日期只能延长，不能提前。';

  @override
  String get campaignDatesRequired => '请选择开始与结束日期。';

  @override
  String get campaignStrategyRequired => '请选择规则策略。';

  @override
  String get campaignActionsRequired => '请至少添加一个行动定义。';
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
  String get importsSubtitle => '上传成员 CSV、查看验证结果并确认导入。';

  @override
  String get newImport => '新建导入';

  @override
  String get noImportsYet => '暂无导入记录。可先下载模板 CSV。';

  @override
  String get backToImports => '返回导入';

  @override
  String get importWizardSubtitle => '引导式上传、映射、验证与确认。';

  @override
  String get importStepUpload => '上传';

  @override
  String get importStepMap => '映射';

  @override
  String get importStepValidate => '验证';

  @override
  String get importStepPreview => '预览';

  @override
  String get importStepConfirm => '确认';

  @override
  String get downloadImportTemplate => '下载模板';

  @override
  String get templateDownloaded => '模板已就绪。';

  @override
  String get importUploadHint => '先下载模板，再选择 CSV。可选择默认社区，用于没有 communityPath 的行。';

  @override
  String importSelectedFile(String name) {
    return '已选：$name';
  }

  @override
  String get importDefaultCommunity => '默认社区（可选）';

  @override
  String get importFileRequired => '请选择 CSV 文件后继续。';

  @override
  String get importBadFileType => '请选择 .csv 文件。';

  @override
  String get importEmptyFile => '文件为空。';

  @override
  String get importMissingRequiredColumns => '请至少映射邮箱或手机列。';

  @override
  String get importPickerUnavailable => '当前环境无法选择文件。';

  @override
  String get importMapHint => '将 CSV 列映射到字段。邮箱或手机为必填。';

  @override
  String get mappingUnmapped => '未映射';

  @override
  String get canonicalEmail => '邮箱';

  @override
  String get canonicalMobile => '手机';

  @override
  String get canonicalExternalId => '外部 ID';

  @override
  String get canonicalFirstName => '名';

  @override
  String get canonicalLastName => '姓';

  @override
  String get canonicalDisplayName => '显示名称';

  @override
  String get canonicalCommunityId => '社区 ID';

  @override
  String get canonicalCommunityPath => '社区路径';

  @override
  String get importValidateHeading => '验证结果';

  @override
  String get importPreviewHeading => '预览';

  @override
  String importValidateSummary(int valid, int invalid, int review) {
    return '$valid 有效 · $invalid 错误 · $review 待复核';
  }

  @override
  String get importNoProblemRows => '没有错误或待复核行。';

  @override
  String get importNoRows => '没有可显示的行。';

  @override
  String get importReviewInstruction => '标记为“待复核”的行无法在此处理。请修正 CSV 后重新导入。';

  @override
  String get importConfirmHint => '确认后将创建或匹配成员，并在需要时发送激活邀请。';

  @override
  String importConfirmSummary(int ready, int skipped) {
    return '将导入 $ready 行。$skipped 行错误或待复核将被跳过。';
  }

  @override
  String importResultSummary(int created, int matched, int errors) {
    return '已创建 $created · 已匹配 $matched · 错误 $errors';
  }

  @override
  String importRowTitle(int number, String identifier) {
    return '第 $number 行：$identifier';
  }

  @override
  String get downloadErrorCsv => '下载错误 CSV';

  @override
  String get errorCsvDownloaded => '错误 CSV 已就绪。';

  @override
  String get importColumnFile => '文件';

  @override
  String get importColumnStatus => '状态';

  @override
  String get importColumnDate => '日期';

  @override
  String get importColumnCounts => '计数';

  @override
  String importCountsSummary(int created, int matched, int errors) {
    return '已创建 $created · 已匹配 $matched · 错误 $errors';
  }

  @override
  String get importStatusUploaded => '已上传';

  @override
  String get importStatusMapped => '已映射';

  @override
  String get importStatusValidated => '已验证';

  @override
  String get importStatusConfirmed => '已确认';

  @override
  String get importStatusFailed => '失败';

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

  @override
  String get navCustomers => '客户';

  @override
  String get navOverview => '概览';

  @override
  String get navPeople => '成员';

  @override
  String get navCommunities => '社区';

  @override
  String get navCampaigns => '活动';

  @override
  String get navImports => '导入';

  @override
  String get navReports => '报表';

  @override
  String get selectCustomer => '选择客户';

  @override
  String get platformConsole => '平台控制台';

  @override
  String get skipToContent => '跳到主要内容';

  @override
  String get userProfile => '个人资料';

  @override
  String get profileComingSoon => '个人资料设置即将推出。';

  @override
  String get overviewSubtitle => '此客户的概览状态。';

  @override
  String get metricMembers => '成员';

  @override
  String get metricCommunities => '社区';

  @override
  String get metricCampaigns => '活动';

  @override
  String metricCampaignsByStatus(String status) {
    return '活动 · $status';
  }

  @override
  String get nextStepsTitle => '下一步';

  @override
  String get nextStepCommunities => '创建社区';

  @override
  String get nextStepPeople => '导入或邀请成员';

  @override
  String get nextStepCampaign => '创建活动';

  @override
  String get nextStepsComplete => '已完成基础设置，继续推进活动。';

  @override
  String get overviewEmptyPermissions => '当前角色没有可用的概览指标。';

  @override
  String get peopleComingSoon => '成员名录即将推出。';

  @override
  String get peopleSubtitle => '搜索、筛选、邀请并管理成员。';

  @override
  String get navRoles => '角色';

  @override
  String get rolesSubtitle => '系统与自定义角色及其权限键（只读）。';

  @override
  String get backToPeople => '返回成员';

  @override
  String get noRoles => '暂无角色。';

  @override
  String get systemRoleBadge => '系统';

  @override
  String get rolePermissionsHeading => '权限';

  @override
  String get peopleSearchLabel => '搜索姓名、邮箱或手机';

  @override
  String get peopleFilterCommunity => '社区';

  @override
  String get peopleFilterRole => '角色';

  @override
  String get peopleFilterStatus => '状态';

  @override
  String get includeSubCommunities => '包含子社区';

  @override
  String get pendingOnlyFilter => '仅待激活';

  @override
  String get anyCommunity => '全部社区';

  @override
  String get anyRole => '全部角色';

  @override
  String get anyStatus => '全部状态';

  @override
  String get clearFilter => '清除';

  @override
  String get pickCommunityTitle => '选择社区';

  @override
  String get pickCommunityRequired => '请选择社区';

  @override
  String get peopleColumnName => '姓名';

  @override
  String get peopleColumnContact => '邮箱 / 手机';

  @override
  String get peopleColumnCommunity => '社区';

  @override
  String get peopleColumnRoles => '角色';

  @override
  String get peopleColumnStatus => '状态';

  @override
  String get noMembers => '没有符合条件的成员。';

  @override
  String get loadMore => '加载更多';

  @override
  String get rowActions => '操作';

  @override
  String get viewMember => '查看';

  @override
  String get inviteMember => '邀请成员';

  @override
  String get inviteMemberTitle => '邀请成员';

  @override
  String get inviteMemberConfirm => '发送邀请';

  @override
  String get inviteEmailLabel => '邮箱';

  @override
  String get inviteMobileLabel => '手机';

  @override
  String get inviteDisplayNameLabel => '显示名称';

  @override
  String get inviteRoleLabel => '角色';

  @override
  String get inviteIdentifierRequired => '请输入邮箱或手机号。';

  @override
  String get inviteEmailInvalid => '请输入有效的邮箱地址。';

  @override
  String get inviteMobileInvalid => '请输入有效的手机号。';

  @override
  String get inviteEmailSentTitle => '邀请已发送';

  @override
  String inviteEmailSentBody(String email) {
    return '已向 $email 发送激活邮件。';
  }

  @override
  String get inviteMobileLinkTitle => '一次性激活链接';

  @override
  String get inviteMobileLinkBody => '未发送短信。请复制此链接并仅分享一次给该成员。';

  @override
  String get activationLinkShownOnceNote => '此链接仅显示一次，24 小时后过期。';

  @override
  String get membershipStatusInactive => '已停用';

  @override
  String get tenantLevelMembership => '组织级';

  @override
  String memberCommunityLabel(String name) {
    return '社区：$name';
  }

  @override
  String get memberRolesHeading => '角色';

  @override
  String get assignRoleAction => '添加角色';

  @override
  String get assignRoleTitle => '分配角色';

  @override
  String get noRolesToAssign => '可用角色均已分配。';

  @override
  String get removeRoleTitle => '移除角色';

  @override
  String removeRoleBody(String name) {
    return '从该成员移除 $name 角色？';
  }

  @override
  String get removeRoleConfirm => '移除';

  @override
  String get deactivateMember => '停用';

  @override
  String get reactivateMember => '重新启用';

  @override
  String get deactivateMemberTitle => '停用成员资格';

  @override
  String get reactivateMemberTitle => '重新启用成员资格';

  @override
  String deactivateMemberBody(String name) {
    return '停用 $name？停用后将无法访问，直至重新启用。';
  }

  @override
  String reactivateMemberBody(String name) {
    return '重新启用 $name？';
  }

  @override
  String get deactivateMemberConfirm => '停用';

  @override
  String get reactivateMemberConfirm => '重新启用';

  @override
  String get memberDeactivatedSnackbar => '成员资格已停用。';

  @override
  String get memberReactivatedSnackbar => '成员资格已重新启用。';

  @override
  String get errorLastTenantAdmin => '不能移除或停用组织中的最后一位管理员。';

  @override
  String get retry => '重试';

  @override
  String get adminNameLabel => '管理员显示名称';

  @override
  String get adminEmailLabel => '管理员邮箱';

  @override
  String get adminEmailRequired => '请输入客户管理员邮箱。';

  @override
  String get activationLinkTitle => '分享激活链接';

  @override
  String get activationLinkNote => '邮件发送尚未接入。请复制此链接并手动发给客户管理员，以便其设置密码。';

  @override
  String get copyLink => '复制';

  @override
  String get copiedToClipboard => '已复制到剪贴板';

  @override
  String get close => '关闭';

  @override
  String get reportsTitle => '报表';

  @override
  String get activateTitle => '激活账户';

  @override
  String get activateSubtitle => '设置密码以激活管理员账户。';

  @override
  String get activationTokenLabel => '激活令牌';

  @override
  String get activateButton => '激活';

  @override
  String get tokenRequired => '请输入消息中的令牌。';

  @override
  String get forgotPassword => '忘记密码';

  @override
  String get resetPasswordTitle => '重置密码';

  @override
  String get resetRequestSubtitle => '请输入邮箱或手机号。如果账户存在，我们将发送重置说明。';

  @override
  String get resetConfirmSubtitle => '使用消息中的令牌设置新密码。';

  @override
  String get resetConfirmOptionalSubtitle => '已有重置令牌？在下方设置新密码。';

  @override
  String get requestReset => '发送重置邮件';

  @override
  String get confirmReset => '设置新密码';

  @override
  String get resetTokenLabel => '重置令牌';

  @override
  String get newPasswordLabel => '新密码';

  @override
  String get acceptedMessage => '如果账户存在，我们已发送说明。';

  @override
  String get activateSuccess => '账户已激活，可以登录。';

  @override
  String get resetSuccess => '密码已更新，可以登录。';

  @override
  String get goToLogin => '前往登录';

  @override
  String get platformCustomersTitle => '客户';

  @override
  String get platformCustomersSubtitle => '入驻组织。仅平台元数据，不含租户业务数据。';

  @override
  String get searchCustomers => '按名称或 slug 搜索';

  @override
  String get noPlatformCustomers => '暂无客户。请创建第一个组织。';

  @override
  String get noSearchResults => '没有匹配的客户。';

  @override
  String get customerSlugLabel => 'Slug';

  @override
  String get customerStatusLabel => '状态';

  @override
  String get customerCreatedLabel => '创建时间';

  @override
  String get adminCountLabel => '管理员';

  @override
  String get pendingInvitesLabel => '待激活邀请';

  @override
  String get statusActive => '启用';

  @override
  String get statusInactive => '停用';

  @override
  String get customerDetailTitle => '客户';

  @override
  String get wizardStepOrganisation => '组织';

  @override
  String get wizardStepAdmin => '首位管理员';

  @override
  String get wizardStepReview => '确认';

  @override
  String get wizardNext => '下一步';

  @override
  String get wizardBack => '上一步';

  @override
  String get cancel => '取消';

  @override
  String get adminNameRequired => '请输入管理员显示名称。';

  @override
  String get adminLocaleLabel => '管理员语言';

  @override
  String get createCustomerSuccessTitle => '客户已创建';

  @override
  String createCustomerSuccessMessage(String email) {
    return '激活邮件已发送至 $email。';
  }

  @override
  String createCustomerSuccessDetail(String name) {
    return '$name 已就绪。管理员可激活并登录。';
  }

  @override
  String get createCustomerFailureHint => '可重试创建，或打开客户详情重新发送激活邮件。';

  @override
  String get viewCustomer => '查看客户';

  @override
  String get backToCustomers => '返回客户列表';

  @override
  String get resendActivation => '重发激活邮件';

  @override
  String get activationResentSnackbar => '已再次发送激活邮件。';

  @override
  String get adminsSectionTitle => '管理员';

  @override
  String get noAdminsYet => '尚未记录管理员。请邀请一位以开始。';

  @override
  String get inviteAnotherAdmin => '邀请另一位管理员';

  @override
  String get inviteAdminTitle => '邀请管理员';

  @override
  String get inviteAdminConfirm => '发送邀请';

  @override
  String inviteAdminConfirmBody(String email) {
    return '向 $email 发送激活邀请？';
  }

  @override
  String get inviteAdminSuccessSnackbar => '邀请已发送。';

  @override
  String resendActivationConfirmBody(String email) {
    return '向 $email 重新发送激活邮件？';
  }

  @override
  String get activationStatusPending => '待激活';

  @override
  String get activationStatusActive => '已激活';

  @override
  String adminCountSummary(int admins, int pending) {
    return '$admins 位管理员 · $pending 个待激活邀请';
  }

  @override
  String get communitiesSubtitle => '将成员组织成任意深度的层级结构。';

  @override
  String get createFirstCommunity => '创建第一个社区';

  @override
  String get createRootCommunityTitle => '创建社区';

  @override
  String get createChildCommunityTitle => '添加子社区';

  @override
  String get addChildCommunity => '添加子节点';

  @override
  String get renameCommunity => '重命名';

  @override
  String get renameCommunityTitle => '重命名社区';

  @override
  String get moveCommunity => '移动到…';

  @override
  String get moveCommunityTitle => '移动社区';

  @override
  String moveCommunityHint(String name) {
    return '为 $name 选择新的上级。其自身的子孙节点已被排除。';
  }

  @override
  String get moveCommunityConfirm => '移动';

  @override
  String get communityRootLabel => '组织根（无上级）';

  @override
  String get noMoveTargets => '没有可用作上级的其他社区。';

  @override
  String get deactivateCommunity => '停用';

  @override
  String get reactivateCommunity => '重新启用';

  @override
  String get deactivateCommunityTitle => '停用社区';

  @override
  String get reactivateCommunityTitle => '重新启用社区';

  @override
  String deactivateCommunityBody(String name) {
    return '停用 $name？它仍会保留在树中，但标记为停用。';
  }

  @override
  String reactivateCommunityBody(String name) {
    return '重新启用 $name？';
  }

  @override
  String get deactivateCommunityConfirm => '停用';

  @override
  String get reactivateCommunityConfirm => '重新启用';

  @override
  String get communityCycleError => '该移动会造成循环，请选择其他上级。';

  @override
  String get communityCreatedSnackbar => '社区已创建。';

  @override
  String get communityRenamedSnackbar => '社区已重命名。';

  @override
  String get communityMovedSnackbar => '社区已移动。';

  @override
  String get communityDeactivatedSnackbar => '社区已停用。';

  @override
  String get communityReactivatedSnackbar => '社区已重新启用。';

  @override
  String get expandNode => '展开';

  @override
  String get collapseNode => '折叠';

  @override
  String get communityActions => '社区操作';

  @override
  String communityNodeSemantics(String name) {
    return '社区 $name';
  }

  @override
  String get save => '保存';

  @override
  String get createAction => '创建';

  @override
  String get newCampaign => '新建活动';

  @override
  String get campaignSearchHint => '搜索活动';

  @override
  String get campaignFilterStatus => '状态';

  @override
  String get campaignFilterAll => '全部状态';

  @override
  String get campaignStatusDraft => '草稿';

  @override
  String get campaignStatusPublished => '已发布';

  @override
  String get campaignStatusStarted => '已开始';

  @override
  String get campaignStatusCompleted => '已完成';

  @override
  String get campaignColumnName => '名称';

  @override
  String get campaignColumnStatus => '状态';

  @override
  String get campaignColumnDates => '日期';

  @override
  String get campaignColumnParticipants => '参加者';

  @override
  String get campaignDatesUnset => '未设置日期';

  @override
  String campaignParticipantCount(int count) {
    return '$count';
  }

  @override
  String get campaignWizardTitle => '创建活动';

  @override
  String get campaignStepBasics => '基本信息';

  @override
  String get campaignStepSchedule => '日程';

  @override
  String get campaignStepRules => '规则';

  @override
  String get campaignStepAudience => '受众';

  @override
  String get campaignStepActions => '行动';

  @override
  String get campaignStepReview => '确认';

  @override
  String get campaignNameZhLabel => '名称（简体中文）';

  @override
  String get campaignDescriptionZhLabel => '描述（简体中文）';

  @override
  String get campaignNameEnLabel => '名称（英文，可选）';

  @override
  String get campaignDescriptionEnLabel => '描述（英文，可选）';

  @override
  String get campaignPickStartDate => '选择开始日期';

  @override
  String get campaignPickEndDate => '选择结束日期';

  @override
  String get campaignTimezoneSearch => '搜索时区';

  @override
  String get campaignRulesStrategyHint => '请从列表选择规则策略。承诺规则由服务器提供，请勿手写策略键。';

  @override
  String get campaignAudienceCustomerWide => '整个组织';

  @override
  String get campaignAudienceSelected => '选定社区';

  @override
  String get campaignAudiencePickCommunities => '选择社区';

  @override
  String get campaignAudienceRequired => '请至少选择一个社区，或选择整个组织。';

  @override
  String get campaignReviewModeLabel => '提交审核方式';

  @override
  String get campaignReviewModeAuto => '自动';

  @override
  String get campaignReviewModeManual => '人工';

  @override
  String get campaignReviewModeAutoHelp => '记录自动通过。负责人仍可抽查并驳回错误记录。';

  @override
  String get campaignReviewModeManualHelp => '每条记录进入审核队列，由负责人批准或驳回。';

  @override
  String get campaignActionDefinitionsTitle => '行动定义';

  @override
  String get campaignActionNameLabel => '行动名称';

  @override
  String get campaignActionKeyLabel => '键';

  @override
  String get campaignActionUnitLabel => '单位';

  @override
  String get campaignAddActionDefinition => '添加行动';

  @override
  String get campaignRemoveActionDefinition => '移除';

  @override
  String get campaignApplyRecommendedActions => '应用推荐定义';

  @override
  String get campaignCreateAsDraft => '创建为草稿';

  @override
  String get campaignReviewSummary => '请确认活动信息，然后创建为草稿。';

  @override
  String get campaignWorkspaceOverview => '概览';

  @override
  String get campaignWorkspaceSettings => '设置';

  @override
  String get campaignWorkspaceParticipants => '参加者';

  @override
  String get campaignWorkspaceSubmissions => '提交';

  @override
  String get campaignWorkspaceMilestonesImpact => '里程碑与影响';

  @override
  String get campaignWorkspaceDashboardReports => '看板与报表';

  @override
  String get campaignWorkspaceDashboard => '看板';

  @override
  String get campaignWorkspaceReports => '报表';

  @override
  String get dashboardGranularityDay => '按日';

  @override
  String get dashboardGranularityWeek => '按周';

  @override
  String get dashboardMetricParticipants => '参加者';

  @override
  String get dashboardMetricParticipationRate => '参与率';

  @override
  String get dashboardMetricCompleted => '已完成总量';

  @override
  String get dashboardMetricProgress => '相对目标进度';

  @override
  String dashboardParticipationRateValue(String percent) {
    return '$percent%';
  }

  @override
  String get dashboardProgressStatusExceeded => '已超额';

  @override
  String get dashboardProgressStatusAchieved => '已达成';

  @override
  String get dashboardProgressStatusInProgress => '进行中';

  @override
  String get dashboardProgressStatusNotStarted => '未开始';

  @override
  String get dashboardChartMode => '图表';

  @override
  String get dashboardTableMode => '表格';

  @override
  String get dashboardChartEmpty => '暂无时间序列数据。';

  @override
  String get dashboardCommunityPickerLabel => '社区';

  @override
  String get dashboardCommunityWholeCampaign => '整个活动';

  @override
  String get dashboardIncludeSubCommunities => '包含下级社区';

  @override
  String get dashboardIncludeSubCommunitiesHelp => '社区指标始终包含所选社区及其下级。';

  @override
  String dashboardTreeTextAlternative(String name, String percent) {
    return '$name：活动目标的 $percent%';
  }

  @override
  String get reportCampaignTitle => '活动汇总报表';

  @override
  String get reportCampaignDescription => '匿名活动合计：参加者、承诺与按单位完成情况。不含联系方式。';

  @override
  String get reportCommunityTitle => '社区汇总报表';

  @override
  String get reportCommunityDescription => '某社区子树的匿名合计。不含联系方式或排名。';

  @override
  String get reportPickCommunity => '为社区报表选择社区';

  @override
  String get reportExportDownloaded => '已开始下载 CSV。';

  @override
  String get reportNoDateFilter => '此报表暂不支持日期范围筛选。';

  @override
  String reportGeneratedAt(String when) {
    return '生成于 $when';
  }

  @override
  String reportUnitLine(
    String unit,
    String achieved,
    String target,
    String percent,
  ) {
    return '$unit：$achieved / $target（$percent）';
  }

  @override
  String get campaignPublishChecklistTitle => '发布检查清单';

  @override
  String get campaignChecklistDates => '开始与结束日期';

  @override
  String get campaignChecklistActions => '至少一个行动定义';

  @override
  String get campaignChecklistAudience => '受众（全组织或社区）';

  @override
  String get campaignChecklistMissing => '缺失';

  @override
  String get campaignChecklistReady => '就绪';

  @override
  String get publishCampaignConfirmTitle => '发布活动？';

  @override
  String get publishCampaignConfirmBody =>
      '成员将可以看到并加入。发布后设置字段会锁定；仅描述与延长结束日期仍可编辑。';

  @override
  String get startCampaignConfirmTitle => '开始活动？';

  @override
  String get startCampaignConfirmBody => '已报名参加者将收到活动开始通知，并可开始记录。';

  @override
  String get completeCampaign => '完成';

  @override
  String get completeCampaignConfirmTitle => '完成活动？';

  @override
  String get completeCampaignConfirmBody => '记录将关闭；行动定义锁定；历史保留。此操作不可撤销。';

  @override
  String get confirmAction => '确认';

  @override
  String get campaignFieldLocked => '发布后已锁定';

  @override
  String get campaignSaveSettings => '保存更改';

  @override
  String get campaignSettingsSaved => '活动已更新。';

  @override
  String get campaignMilestonesComingSoon => '里程碑管理将在后续阶段提供。下方可管理影响系数。';

  @override
  String get campaignDescriptionLabel => '描述';

  @override
  String get errorCampaignFieldLocked => '发布后仅可修改描述，以及延长结束日期。';

  @override
  String get errorCampaignEndDateLocked => '发布后结束日期只能延长，不能提前。';

  @override
  String get campaignDatesRequired => '请选择开始与结束日期。';

  @override
  String get campaignStrategyRequired => '请选择规则策略。';

  @override
  String get campaignActionsRequired => '请至少添加一个行动定义。';
}
