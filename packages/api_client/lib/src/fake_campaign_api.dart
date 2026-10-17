import 'errors.dart';
import 'campaign_api.dart';
import 'models.dart';
import 'token_store.dart';

class FakeCampaignApiClient implements CampaignApiClient {
  FakeCampaignApiClient({
    this.tokenStore,
    this.onSessionExpired,
    UserProfile? profile,
    List<Customer>? customers,
    List<Community>? communities,
    List<Campaign>? campaigns,
    List<CampaignTemplate>? templates,
    List<CampaignScope>? scopes,
    List<Participation>? participations,
    CommitmentOptions? commitmentOptions,
    List<ActionDefinition>? actionDefinitions,
    List<RecordedAction>? actions,
    List<InboxNotification>? notifications,
    ParticipantDashboard? participantDashboard,
    AggregateDashboard? campaignDashboard,
    AggregateDashboard? communityDashboard,
    ParticipantProgress? progress,
    VisualizationData? visualization,
    AggregateReport? campaignReport,
    String campaignCsv = 'scope,campaignId\ncampaign,c1\n',
    List<ImpactFactor>? impactFactors,
    NotificationPreferences? preferences,
    this.googleClientConfigured = false,
    this.appleClientConfigured = false,
  }) : profile =
           profile ??
           const UserProfile(
             id: 'user-1',
             displayName: 'Test Member',
             locale: 'en',
             timezone: 'Asia/Kuala_Lumpur',
             isActive: true,
             isPlatformAdmin: false,
             identities: [
               UserIdentity(
                 id: 'id-1',
                 type: 'email',
                 identifier: 'member@example.com',
                 isVerified: true,
               ),
             ],
           ),
       customers =
           customers ??
           const [
             Customer(
               id: 'cust-1',
               name: 'Tzu Chi Malaysia',
               slug: 'tzu-chi-malaysia',
               isActive: true,
             ),
           ],
       communities = communities ?? const [],
       campaigns =
           campaigns ??
           [
             Campaign(
               id: 'camp-1',
               customerId: 'cust-1',
               templateId: 'tmpl-1',
               scopeId: 'scope-1',
               name: '速素数数',
               status: 'started',
               timezone: 'Asia/Kuala_Lumpur',
               startsOn: '2026-01-01',
               endsOn: '2026-12-31',
               communityIds: const [],
               configuration: const {'rulesStrategy': 'vegetarian'},
             ),
           ],
       templates =
           templates ??
           const [
             CampaignTemplate(
               id: 'tmpl-1',
               customerId: 'cust-1',
               key: 'environmental_action',
               name: 'Environmental Action',
               isActive: true,
             ),
           ],
       scopes =
           scopes ??
           const [
             CampaignScope(
               id: 'scope-1',
               customerId: 'cust-1',
               templateId: 'tmpl-1',
               key: 'vegetarian',
               name: 'Vegetarian',
               isActive: true,
             ),
           ],
       participations = participations ?? [],
       commitmentOptions =
           commitmentOptions ??
           const CommitmentOptions(
             campaignId: 'camp-1',
             customerId: 'cust-1',
             strategy: 'vegetarian',
             units: ['days', 'meals'],
             choices: [
               CommitmentChoice(
                 key: 'sui_yuan_su',
                 name: '随缘素',
                 canonicalUnit: 'meals',
                 usesCampaignDuration: false,
               ),
               CommitmentChoice(
                 key: 'huan_xi_su',
                 name: '欢喜素',
                 canonicalUnit: 'meals',
                 usesCampaignDuration: false,
               ),
               CommitmentChoice(
                 key: 'ding_ri_su',
                 name: '定日素',
                 canonicalUnit: 'days',
                 usesCampaignDuration: false,
               ),
               CommitmentChoice(
                 key: 'yi_zhou_su',
                 name: '一周素',
                 canonicalUnit: 'days',
                 suggestedTarget: 7,
                 usesCampaignDuration: false,
               ),
               CommitmentChoice(
                 key: 'quan_yue_su',
                 name: '全月素',
                 canonicalUnit: 'days',
                 suggestedTarget: 30,
                 usesCampaignDuration: false,
               ),
               CommitmentChoice(
                 key: 'fa_yuan_su',
                 name: '发愿素',
                 canonicalUnit: 'days',
                 usesCampaignDuration: false,
               ),
               CommitmentChoice(
                 key: 'yi_quan_su',
                 name: '已全素',
                 canonicalUnit: 'days',
                 usesCampaignDuration: true,
               ),
             ],
           ),
       actionDefinitions =
           actionDefinitions ??
           const [
             ActionDefinition(
               id: 'def-meal',
               campaignId: 'camp-1',
               key: 'vegetarian_meal',
               name: 'Vegetarian meal',
               unit: 'meals',
               isActive: true,
             ),
             ActionDefinition(
               id: 'def-day',
               campaignId: 'camp-1',
               key: 'vegetarian_day',
               name: 'Vegetarian day',
               unit: 'days',
               isActive: true,
             ),
           ],
       actions = actions ?? [],
       notifications = notifications ?? [],
       participantDashboard =
           participantDashboard ??
           const ParticipantDashboard(
             progress: DashboardProgress(
               achievedValue: 2,
               targetValue: 10,
               completionPercent: 20,
               unit: 'days',
             ),
             measurements: [
               MeasurementTotal(sourceUnit: 'days', quantity: 2),
             ],
             outcomes: [
               OutcomeTotal(
                 sourceUnit: 'days',
                 outcomeMetric: 'co2_kg',
                 outcomeUnit: 'kg',
                 value: 4,
                 contributions: [
                   OutcomeContribution(
                     version: 1,
                     factorValue: 2,
                     source: 'Admin-cited conversion',
                   ),
                 ],
               ),
             ],
             timeSeries: [
               TimeSeriesPoint(
                 periodStart: '2026-10-12',
                 periodEnd: '2026-10-18',
                 measurements: [
                   MeasurementTotal(sourceUnit: 'days', quantity: 2),
                 ],
                 outcomes: [],
               ),
             ],
             visualization: VisualizationData(
               type: 'tree',
               displayName: '素心树',
               isActive: true,
               completionPercent: 20,
               unit: 'days',
             ),
           ),
       campaignDashboard =
           campaignDashboard ??
           const AggregateDashboard(
             scope: 'campaign',
             progress: DashboardProgress(
               achievedValue: 5,
               targetValue: 10,
               completionPercent: 50,
               unit: 'days',
               participantCount: 3,
             ),
             measurements: [MeasurementTotal(sourceUnit: 'days', quantity: 5)],
             outcomes: [
               OutcomeTotal(
                 sourceUnit: 'days',
                 outcomeMetric: 'water_liters',
                 outcomeUnit: 'L',
                 value: 50,
                 contributions: [
                   OutcomeContribution(
                     version: 1,
                     factorValue: 10,
                     source: 'Tenant-configured citation',
                   ),
                 ],
               ),
             ],
             timeSeries: [
               TimeSeriesPoint(
                 periodStart: '2026-10-12',
                 periodEnd: '2026-10-12',
                 measurements: [
                   MeasurementTotal(sourceUnit: 'days', quantity: 5),
                 ],
                 outcomes: [],
               ),
             ],
             visualization: VisualizationData(
               type: 'tree',
               displayName: '素心树',
               isActive: true,
               completionPercent: 50,
               unit: 'days',
             ),
           ),
       communityDashboard = communityDashboard,
       progress =
           progress ??
           const ParticipantProgress(
             participationId: 'part-1',
             achievedValue: 2,
             targetValue: 10,
             unit: 'days',
             completionPercent: 20,
             completionStatus: 'in_progress',
           ),
       visualization =
           visualization ??
           const VisualizationData(
             type: 'tree',
             displayName: '素心树',
             isActive: true,
             completionPercent: 20,
           ),
       campaignReport =
           campaignReport ??
           const AggregateReport(
             scope: 'campaign',
             campaignId: 'camp-1',
             generatedAt: '2026-10-14T00:00:00.000Z',
             participantCount: 3,
             committedParticipantCount: 2,
             units: [
               ReportUnit(
                 unit: 'days',
                 achievedValue: 4,
                 targetValue: 10,
                 completionPercent: 40,
               ),
             ],
           ),
       campaignCsv = campaignCsv,
       impactFactors = impactFactors ?? [],
       preferences =
           preferences ??
           const NotificationPreferences(
             userId: 'user-1',
             inAppEnabled: true,
             emailEnabled: true,
             smsEnabled: false,
             pushEnabled: false,
             remindersEnabled: true,
             reminderLocalTime: '09:00',
           );

  UserProfile profile;
  List<Customer> customers;
  List<Community> communities;
  List<Campaign> campaigns;
  List<CampaignTemplate> templates;
  List<CampaignScope> scopes;
  List<Participation> participations;
  List<Commitment> commitments = [];
  CommitmentOptions commitmentOptions;
  List<ActionDefinition> actionDefinitions;
  List<RecordedAction> actions;
  List<InboxNotification> notifications;
  ParticipantDashboard participantDashboard;
  AggregateDashboard campaignDashboard;
  AggregateDashboard? communityDashboard;
  ParticipantProgress progress;
  VisualizationData visualization;
  AggregateReport campaignReport;
  String campaignCsv;
  List<ImpactFactor> impactFactors;
  NotificationPreferences preferences;
  UserImport? currentImport;
  List<UserImportRow> importRows = [];
  bool signedIn = false;
  bool failLogin = false;
  bool tokenReused = false;
  bool setupRequired = false;
  String lastAcceptLanguage = 'en';
  TokenStore? tokenStore;
  void Function()? onSessionExpired;
  final bool googleClientConfigured;
  final bool appleClientConfigured;

  Future<void> _persistTokens(TokenPair pair) async {
    await tokenStore?.writeTokens(
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
    );
  }

  Future<void> _clearSessionTokens() async {
    signedIn = false;
    await tokenStore?.clear();
  }

  Never _throw(String code, {int status = 400, String? message}) {
    throw ApiException(
      statusCode: status,
      code: code,
      message: message ?? code,
    );
  }

  @override
  Future<SetupStatus> getSetupStatus() async {
    return SetupStatus(setupRequired: setupRequired);
  }

  @override
  Future<TokenPair> completeSetup({
    required String setupKey,
    required String email,
    required String password,
    String? displayName,
  }) async {
    if (!setupRequired) {
      _throw('SETUP_NOT_AVAILABLE', status: 409);
    }
    if (setupKey.length < 32) {
      _throw('INVALID_SETUP_KEY', status: 401);
    }
    if (password.length < 8) {
      _throw('WEAK_PASSWORD');
    }
    setupRequired = false;
    signedIn = true;
    if (displayName != null && displayName.trim().isNotEmpty) {
      profile = UserProfile(
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: displayName.trim(),
        locale: profile.locale,
        timezone: profile.timezone,
        isActive: true,
        isPlatformAdmin: true,
        identities: [
          UserIdentity(
            id: 'setup-id',
            type: 'email',
            identifier: email.trim(),
            isVerified: true,
          ),
        ],
      );
    } else {
      profile = UserProfile(
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
        locale: profile.locale,
        timezone: profile.timezone,
        isActive: true,
        isPlatformAdmin: true,
        identities: [
          UserIdentity(
            id: 'setup-id',
            type: 'email',
            identifier: email.trim(),
            isVerified: true,
          ),
        ],
      );
    }
    const pair = TokenPair(accessToken: 'access', refreshToken: 'refresh');
    await _persistTokens(pair);
    return pair;
  }

  @override
  Future<TokenPair> login({
    required String identifier,
    required String password,
  }) async {
    if (failLogin || password.length < 8) {
      _throw('INVALID_CREDENTIALS', status: 401);
    }
    signedIn = true;
    const pair = TokenPair(accessToken: 'access', refreshToken: 'refresh');
    await _persistTokens(pair);
    return pair;
  }

  @override
  Future<TokenPair> socialLogin({
    required String provider,
    required String idToken,
  }) async {
    if (idToken.isEmpty) {
      _throw('SOCIAL_TOKEN_INVALID', status: 401);
    }
    signedIn = true;
    const pair = TokenPair(accessToken: 'access', refreshToken: 'refresh');
    await _persistTokens(pair);
    return pair;
  }

  @override
  Future<void> logout({bool revokeFamily = true}) async {
    await _clearSessionTokens();
  }

  @override
  Future<void> activate({required String token, String? password}) async {
    if (token == 'expired') {
      _throw('TOKEN_EXPIRED', status: 400);
    }
    if (token.isEmpty || token == 'invalid') {
      _throw('TOKEN_INVALID', status: 400);
    }
    if (password != null && password.length < 8) {
      _throw('WEAK_PASSWORD');
    }
  }

  @override
  Future<void> resendActivation(String identifier) async {}

  @override
  Future<void> requestPasswordReset(String identifier) async {}

  @override
  Future<void> confirmPasswordReset({
    required String token,
    required String password,
  }) async {
    if (token == 'expired') {
      _throw('TOKEN_EXPIRED', status: 400);
    }
    if (token.isEmpty || token == 'invalid') {
      _throw('TOKEN_INVALID', status: 400);
    }
    if (password.length < 8) {
      _throw('WEAK_PASSWORD');
    }
  }

  @override
  Future<UserProfile> getMe() async {
    if (tokenReused) {
      await _clearSessionTokens();
      onSessionExpired?.call();
      _throw('TOKEN_REUSED', status: 401);
    }
    final access = await tokenStore?.readAccessToken();
    if (access != null && access.isNotEmpty) {
      signedIn = true;
    }
    if (!signedIn) {
      _throw('UNAUTHORIZED', status: 401);
    }
    return profile;
  }

  @override
  Future<UserProfile> updateMe({String? locale, String? timezone}) async {
    profile = UserProfile(
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      locale: locale ?? profile.locale,
      timezone: timezone ?? profile.timezone,
      isActive: profile.isActive,
      isPlatformAdmin: profile.isPlatformAdmin,
      identities: profile.identities,
    );
    if (locale != null) {
      lastAcceptLanguage = locale;
    }
    return profile;
  }

  @override
  Future<NotificationPreferences> getNotificationPreferences() async =>
      preferences;

  @override
  Future<NotificationPreferences> updateNotificationPreferences({
    bool? inAppEnabled,
    bool? emailEnabled,
    bool? smsEnabled,
    bool? pushEnabled,
    bool? remindersEnabled,
    String? reminderLocalTime,
  }) async {
    preferences = NotificationPreferences(
      userId: preferences.userId,
      inAppEnabled: inAppEnabled ?? preferences.inAppEnabled,
      emailEnabled: emailEnabled ?? preferences.emailEnabled,
      smsEnabled: smsEnabled ?? preferences.smsEnabled,
      pushEnabled: pushEnabled ?? preferences.pushEnabled,
      remindersEnabled: remindersEnabled ?? preferences.remindersEnabled,
      reminderLocalTime: reminderLocalTime ?? preferences.reminderLocalTime,
    );
    return preferences;
  }

  @override
  Future<List<Customer>> listCustomers() async => customers;

  @override
  Future<Customer> getCustomer(String customerId) async =>
      customers.firstWhere((row) => row.id == customerId);

  @override
  Future<Customer> createCustomer({
    required String name,
    String? initialAdminUserId,
    CreateCustomerInitialAdmin? initialAdmin,
  }) async {
    if (!profile.isPlatformAdmin) {
      _throw('FORBIDDEN', status: 403);
    }
    if (initialAdminUserId != null && initialAdmin != null) {
      _throw('VALIDATION_FAILED', status: 400);
    }
    final created = Customer(
      id: 'cust-${customers.length + 1}',
      name: name,
      slug: name.toLowerCase().replaceAll(' ', '-'),
      isActive: true,
      activationToken: initialAdmin == null
          ? null
          : 'fake-activation-${customers.length + 1}',
    );
    customers = [...customers, created];
    return created;
  }

  @override
  Future<Customer> updateCustomer(
    String customerId, {
    String? name,
    bool? isActive,
  }) async {
    final current = await getCustomer(customerId);
    final updated = Customer(
      id: current.id,
      name: name ?? current.name,
      slug: current.slug,
      isActive: isActive ?? current.isActive,
    );
    customers = [
      for (final row in customers)
        if (row.id == customerId) updated else row,
    ];
    return updated;
  }

  @override
  Future<List<Community>> listCommunities(String customerId) async =>
      communities.where((row) => row.customerId == customerId).toList();

  @override
  Future<Community> createCommunity({
    required String customerId,
    required String name,
    String? parentId,
  }) async {
    final created = Community(
      id: 'comm-${communities.length + 1}',
      customerId: customerId,
      parentId: parentId,
      name: name,
      slug: name.toLowerCase().replaceAll(' ', '-'),
      isActive: true,
    );
    communities = [...communities, created];
    return created;
  }

  @override
  Future<Community> updateCommunity(
    String communityId, {
    String? name,
    bool? isActive,
  }) async {
    final current = communities.firstWhere((row) => row.id == communityId);
    final updated = Community(
      id: current.id,
      customerId: current.customerId,
      parentId: current.parentId,
      name: name ?? current.name,
      slug: current.slug,
      isActive: isActive ?? current.isActive,
    );
    communities = [
      for (final row in communities)
        if (row.id == communityId) updated else row,
    ];
    return updated;
  }

  @override
  Future<List<Membership>> listMemberships(String customerId) async => const [];

  @override
  Future<UserImport> uploadUserImport({
    required String customerId,
    required String filename,
    required List<int> bytes,
    String? communityId,
  }) async {
    currentImport = UserImport(
      id: 'import-1',
      customerId: customerId,
      communityId: communityId,
      originalFilename: filename,
      status: 'uploaded',
      headers: const ['email', 'mobile', 'first_name'],
      counts: const UserImportCounts(
        total: 1,
        pending: 1,
        valid: 0,
        invalid: 0,
        review: 0,
        created: 0,
        matched: 0,
      ),
    );
    return currentImport!;
  }

  @override
  Future<UserImport> mapUserImport(
    String userImportId, {
    required Map<String, String> mapping,
  }) async {
    currentImport = UserImport(
      id: userImportId,
      customerId: currentImport?.customerId ?? 'cust-1',
      originalFilename: currentImport?.originalFilename ?? 'users.csv',
      status: 'mapped',
      headers: currentImport?.headers ?? const ['email'],
      mapping: mapping,
      counts:
          currentImport?.counts ??
          const UserImportCounts(
            total: 1,
            pending: 1,
            valid: 0,
            invalid: 0,
            review: 0,
            created: 0,
            matched: 0,
          ),
    );
    return currentImport!;
  }

  @override
  Future<UserImport> validateUserImport(String userImportId) async {
    currentImport = UserImport(
      id: userImportId,
      customerId: currentImport?.customerId ?? 'cust-1',
      originalFilename: currentImport?.originalFilename ?? 'users.csv',
      status: 'validated',
      headers: currentImport?.headers ?? const ['email'],
      mapping: currentImport?.mapping,
      counts: const UserImportCounts(
        total: 1,
        pending: 0,
        valid: 1,
        invalid: 0,
        review: 0,
        created: 0,
        matched: 0,
      ),
    );
    importRows = [
      const UserImportRow(
        id: 'row-1',
        rowNumber: 2,
        rawData: {'email': 'imported@example.com'},
        status: 'valid',
        email: 'imported@example.com',
      ),
    ];
    return currentImport!;
  }

  @override
  Future<UserImportPreview> previewUserImport(String userImportId) async {
    return UserImportPreview(
      importRecord: currentImport ?? await validateUserImport(userImportId),
      rows: importRows,
    );
  }

  @override
  Future<UserImport> confirmUserImport(String userImportId) async {
    currentImport = UserImport(
      id: userImportId,
      customerId: currentImport?.customerId ?? 'cust-1',
      originalFilename: currentImport?.originalFilename ?? 'users.csv',
      status: 'confirmed',
      headers: currentImport?.headers ?? const ['email'],
      mapping: currentImport?.mapping,
      counts: const UserImportCounts(
        total: 1,
        pending: 0,
        valid: 0,
        invalid: 0,
        review: 0,
        created: 1,
        matched: 0,
      ),
    );
    importRows = [
      const UserImportRow(
        id: 'row-1',
        rowNumber: 2,
        rawData: {'email': 'imported@example.com'},
        status: 'created',
        email: 'imported@example.com',
      ),
    ];
    return currentImport!;
  }

  @override
  Future<List<UserImportRow>> listUserImportRows(String userImportId) async =>
      importRows;

  @override
  Future<List<CampaignTemplate>> listTemplates(String customerId) async =>
      templates;

  @override
  Future<List<CampaignScope>> listScopes(
    String customerId, {
    String? templateId,
  }) async {
    return scopes
        .where((row) => templateId == null || row.templateId == templateId)
        .toList();
  }

  @override
  Future<List<Campaign>> listCampaigns(String customerId) async =>
      campaigns.where((row) => row.customerId == customerId).toList();

  @override
  Future<Campaign> getCampaign(String campaignId) async =>
      campaigns.firstWhere((row) => row.id == campaignId);

  @override
  Future<Campaign> createCampaign({
    required String customerId,
    required String templateId,
    required String scopeId,
    required String name,
    required String timezone,
    String? description,
    String? startsOn,
    String? endsOn,
    List<String>? communityIds,
    Map<String, dynamic>? configuration,
  }) async {
    final created = Campaign(
      id: 'camp-${campaigns.length + 1}',
      customerId: customerId,
      templateId: templateId,
      scopeId: scopeId,
      name: name,
      description: description,
      status: 'draft',
      timezone: timezone,
      startsOn: startsOn,
      endsOn: endsOn,
      communityIds: communityIds ?? const [],
      configuration: configuration ?? const {},
    );
    campaigns = [...campaigns, created];
    return created;
  }

  Campaign _withStatus(Campaign campaign, String status) {
    return Campaign(
      id: campaign.id,
      customerId: campaign.customerId,
      templateId: campaign.templateId,
      scopeId: campaign.scopeId,
      name: campaign.name,
      description: campaign.description,
      status: status,
      timezone: campaign.timezone,
      startsOn: campaign.startsOn,
      endsOn: campaign.endsOn,
      communityIds: campaign.communityIds,
      configuration: campaign.configuration,
    );
  }

  Future<Campaign> _transition(String campaignId, String status) async {
    final current = await getCampaign(campaignId);
    final updated = _withStatus(current, status);
    campaigns = [
      for (final row in campaigns)
        if (row.id == campaignId) updated else row,
    ];
    return updated;
  }

  @override
  Future<Campaign> publishCampaign(String campaignId) =>
      _transition(campaignId, 'published');

  @override
  Future<Campaign> startCampaign(String campaignId) =>
      _transition(campaignId, 'started');

  @override
  Future<Campaign> completeCampaign(String campaignId) =>
      _transition(campaignId, 'completed');

  @override
  Future<List<Participation>> listParticipations(String campaignId) async =>
      participations.where((row) => row.campaignId == campaignId).toList();

  @override
  Future<Participation> joinCampaign(String campaignId) async {
    final existing = participations.where((row) => row.campaignId == campaignId);
    if (existing.isNotEmpty) {
      return existing.first;
    }
    final created = Participation(
      id: 'part-${participations.length + 1}',
      customerId: 'cust-1',
      campaignId: campaignId,
      userId: profile.id,
      status: 'enrolled',
    );
    participations = [...participations, created];
    return created;
  }

  @override
  Future<Participation> withdrawParticipation(String participationId) async {
    final current = participations.firstWhere((row) => row.id == participationId);
    final updated = Participation(
      id: current.id,
      customerId: current.customerId,
      campaignId: current.campaignId,
      userId: current.userId,
      communityId: current.communityId,
      status: 'withdrawn',
    );
    participations = [
      for (final row in participations)
        if (row.id == participationId) updated else row,
    ];
    return updated;
  }

  @override
  Future<CommitmentOptions> getCommitmentOptions(String campaignId) async =>
      commitmentOptions;

  @override
  Future<List<Commitment>> listCommitments(String participationId) async =>
      commitments.where((row) => row.participationId == participationId).toList();

  @override
  Future<Commitment> createCommitment({
    required String participationId,
    String? typeKey,
    required num targetValue,
    required String unit,
  }) async {
    final created = Commitment(
      id: 'commit-${commitments.length + 1}',
      participationId: participationId,
      typeKey: typeKey,
      targetValue: targetValue,
      unit: unit,
    );
    commitments = [...commitments, created];
    return created;
  }

  @override
  Future<List<ActionDefinition>> listActionDefinitions(String campaignId) async =>
      actionDefinitions;

  @override
  Future<List<RecordedAction>> listCampaignActions(String campaignId) async =>
      actions.where((row) => row.campaignId == campaignId).toList();

  @override
  Future<List<RecordedAction>> listParticipationActions(
    String participationId,
  ) async =>
      actions.where((row) => row.participationId == participationId).toList();

  @override
  Future<RecordedAction> recordAction({
    required String participationId,
    required String actionDefinitionId,
    String? occurredOn,
    num? quantity,
    String? idempotencyKey,
  }) async {
    final created = RecordedAction(
      id: 'act-${actions.length + 1}',
      campaignId: 'camp-1',
      participationId: participationId,
      userId: profile.id,
      actionDefinitionId: actionDefinitionId,
      occurredOn: occurredOn ?? '2026-10-14',
      quantity: quantity ?? 1,
      status: 'recorded',
      submission: Submission(
        id: 'sub-${actions.length + 1}',
        actionId: 'act-${actions.length + 1}',
        status: 'approved',
      ),
    );
    actions = [...actions, created];
    return created;
  }

  @override
  Future<RecordedAction> cancelAction(String actionId) async {
    final current = actions.firstWhere((row) => row.id == actionId);
    final updated = RecordedAction(
      id: current.id,
      campaignId: current.campaignId,
      participationId: current.participationId,
      userId: current.userId,
      actionDefinitionId: current.actionDefinitionId,
      occurredOn: current.occurredOn,
      quantity: current.quantity,
      status: 'cancelled',
      submission: current.submission,
    );
    actions = [
      for (final row in actions)
        if (row.id == actionId) updated else row,
    ];
    return updated;
  }

  @override
  Future<Submission> rejectSubmission(String submissionId, {String? note}) async {
    return Submission(
      id: submissionId,
      actionId: 'act-1',
      status: 'rejected',
      reviewNote: note,
    );
  }

  @override
  Future<ParticipantProgress> getProgress(String participationId) async =>
      progress;

  @override
  Future<ParticipantDashboard> getParticipantDashboard(
    String participationId,
  ) async => participantDashboard;

  @override
  Future<AggregateDashboard> getCampaignDashboard(String campaignId) async =>
      campaignDashboard;

  @override
  Future<AggregateDashboard> getCommunityDashboard({
    required String campaignId,
    required String communityId,
  }) async =>
      communityDashboard ??
      AggregateDashboard(
        scope: 'community',
        progress: campaignDashboard.progress,
        measurements: campaignDashboard.measurements,
        outcomes: campaignDashboard.outcomes,
        timeSeries: campaignDashboard.timeSeries,
        visualization: campaignDashboard.visualization,
      );

  @override
  Future<VisualizationData> getVisualizationData(String campaignId) async =>
      visualization;

  @override
  Future<List<InboxNotification>> listNotifications(String customerId) async =>
      notifications;

  @override
  Future<InboxNotification> markNotificationRead({
    required String customerId,
    required String notificationId,
  }) async {
    final current = notifications.firstWhere((row) => row.id == notificationId);
    final updated = current.copyWith(readAt: '2026-10-14T00:00:00.000Z');
    notifications = [
      for (final row in notifications)
        if (row.id == notificationId) updated else row,
    ];
    return updated;
  }

  @override
  Future<List<ImpactFactor>> listImpactFactors({
    required String customerId,
    String? campaignId,
  }) async => impactFactors;

  @override
  Future<ImpactFactor> createImpactFactor({
    required String customerId,
    String? campaignId,
    required String sourceUnit,
    required String outcomeMetric,
    required String outcomeUnit,
    required num factorValue,
    required String source,
    required String effectiveFrom,
    String? effectiveTo,
  }) async {
    final created = ImpactFactor(
      id: 'factor-${impactFactors.length + 1}',
      customerId: customerId,
      campaignId: campaignId,
      sourceUnit: sourceUnit,
      outcomeMetric: outcomeMetric,
      outcomeUnit: outcomeUnit,
      factorValue: factorValue,
      version: 1,
      source: source,
      effectiveFrom: effectiveFrom,
      effectiveTo: effectiveTo,
      isActive: true,
    );
    impactFactors = [...impactFactors, created];
    return created;
  }

  @override
  Future<AggregateReport> getCampaignReport(String campaignId) async =>
      campaignReport;

  @override
  Future<String> exportCampaignReportCsv(String campaignId) async => campaignCsv;
}
