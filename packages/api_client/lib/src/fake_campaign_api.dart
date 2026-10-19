import 'errors.dart';
import 'campaign_api.dart';
import 'campaign_periods.dart';
import 'models.dart';
import 'token_store.dart';

/// Platform-admin row tracked by [FakeCampaignApiClient] for console UI tests.
class FakePlatformAdmin {
  const FakePlatformAdmin({
    required this.userId,
    required this.email,
    required this.displayName,
    required this.activationStatus,
    this.locale = 'en',
  });

  final String userId;
  final String email;
  final String displayName;
  final String activationStatus;
  final String locale;
}

class FakeCampaignApiClient implements CampaignApiClient {
  /// Default tenant-admin style access used when [customerAccess] is omitted.
  static const CustomerAccess defaultTenantAccess = CustomerAccess(
    roles: [
      RoleSummary(id: 'role-ta', key: 'tenant_admin', name: 'Tenant Admin'),
    ],
    permissionKeys: [
      'customers.read',
      'customers.update',
      'communities.create',
      'communities.read',
      'communities.update',
      'memberships.create',
      'memberships.read',
      'memberships.update',
      'memberships.delete',
      'roles.read',
      'roles.assign',
      'user_imports.create',
      'user_imports.read',
      'campaigns.create',
      'campaigns.read',
      'campaigns.update',
      'campaign_templates.create',
      'campaign_templates.read',
      'campaign_scopes.create',
      'campaign_scopes.read',
      'action_definitions.create',
      'action_definitions.read',
      'participations.create',
      'participations.read',
      'participations.update',
      'submissions.read',
      'submissions.update',
      'impact_factors.create',
      'impact_factors.read',
      'impact_factors.update',
      'dashboards.read',
      'reports.read',
      'reports.export',
    ],
    isTenantLevel: true,
    communityIds: [],
  );

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
    CustomerAccess? customerAccess,
    List<Membership>? memberships,
    List<Role>? roles,
    List<PlatformCustomerSummary>? platformCustomerSummaries,
    this.googleClientConfigured = false,
    this.appleClientConfigured = false,
    this.lastTenantAdminGuard = false,
  }) : customerAccess = customerAccess ?? defaultTenantAccess,
       memberships = memberships ?? const [],
       roles = roles ??
           const [
             Role(
               id: 'role-member',
               customerId: 'cust-1',
               key: 'member',
               name: 'Member',
               isSystem: true,
               permissionKeys: [
                 'customers.read',
                 'communities.read',
                 'campaigns.read',
               ],
             ),
             Role(
               id: 'role-ta',
               customerId: 'cust-1',
               key: 'tenant_admin',
               name: 'Tenant Admin',
               isSystem: true,
               permissionKeys: [
                 'memberships.create',
                 'memberships.read',
                 'memberships.update',
                 'roles.assign',
                 'roles.read',
               ],
             ),
           ],
       platformCustomerSummaries = platformCustomerSummaries ?? const [],
       profile =
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
  CustomerAccess customerAccess;
  List<Membership> memberships;
  List<Role> roles;
  /// When true, deactivate/unassign of the last tenant admin throws FORBIDDEN.
  bool lastTenantAdminGuard;
  List<PlatformCustomerSummary> platformCustomerSummaries;
  /// Admins known to the fake platform console (create / invite).
  final Map<String, List<FakePlatformAdmin>> platformAdmins = {};
  ApiException? createCustomerError;
  ApiException? listPlatformCustomersError;
  bool forceCycleOnNextCommunityUpdate = false;
  final List<({String customerId, String userId})> resendActivationCalls = [];
  List<Campaign> campaigns;
  List<CampaignTemplate> templates;
  List<CampaignScope> scopes;
  List<Participation> participations;
  List<Commitment> commitments = [];
  List<Milestone> milestones = [];
  List<MilestoneEvaluation> milestoneEvaluations = [];
  /// Collective totals used by milestone progress and evaluation.
  num fakeMilestoneAchievedValue = 0;
  num fakeMilestoneTargetValue = 0;
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
  List<UserImport> importHistory = [];
  List<UserImportRow> importRows = [];
  /// When true, validate produces invalid + review rows for wizard tests.
  bool importForceInvalidRows = false;
  bool signedIn = false;
  bool failLogin = false;
  bool tokenReused = false;
  bool setupRequired = false;
  /// When set, [joinCampaign] throws this API code (e.g. CONFLICT, BAD_REQUEST).
  String? joinFailureCode;
  String? joinFailureMessage;
  /// Forces the not-eligible BAD_REQUEST path used by membership targeting.
  bool failJoinNotEligible = false;
  /// When true, [recordAction] throws a network-style error.
  bool failRecordNetwork = false;
  /// Override "today" (YYYY-MM-DD) for check-in tests.
  String? fakeToday;
  /// Force submission status on new recordings (`approved`|`submitted`|`rejected`).
  String? forceSubmissionStatus;
  String? forceReviewNote;
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
    if (createCustomerError != null) {
      final error = createCustomerError!;
      createCustomerError = null;
      throw error;
    }
    if (initialAdminUserId != null && initialAdmin != null) {
      _throw('VALIDATION_FAILED', status: 400);
    }
    if (platformCustomerSummaries.isEmpty) {
      platformCustomerSummaries = [
        for (final customer in customers)
          PlatformCustomerSummary(
            id: customer.id,
            name: customer.name,
            slug: customer.slug,
            isActive: customer.isActive,
            createdAt: DateTime.now().toUtc().toIso8601String(),
            adminCount: 1,
            pendingAdminInvites: 0,
          ),
      ];
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
    platformCustomerSummaries = [
      ...platformCustomerSummaries,
      PlatformCustomerSummary(
        id: created.id,
        name: created.name,
        slug: created.slug,
        isActive: created.isActive,
        createdAt: DateTime.now().toUtc().toIso8601String(),
        adminCount: 1,
        pendingAdminInvites: initialAdmin == null ? 0 : 1,
      ),
    ];
    if (initialAdmin != null) {
      final adminId = 'admin-${created.id}';
      platformAdmins[created.id] = [
        FakePlatformAdmin(
          userId: adminId,
          email: initialAdmin.email,
          displayName: initialAdmin.displayName ?? initialAdmin.email,
          activationStatus: 'pending',
          locale: initialAdmin.locale ?? 'en',
        ),
      ];
    }
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
    platformCustomerSummaries = [
      for (final row in platformCustomerSummaries)
        if (row.id == customerId)
          PlatformCustomerSummary(
            id: row.id,
            name: updated.name,
            slug: row.slug,
            isActive: updated.isActive,
            createdAt: row.createdAt,
            adminCount: row.adminCount,
            pendingAdminInvites: row.pendingAdminInvites,
          )
        else
          row,
    ];
    return updated;
  }

  @override
  Future<List<PlatformCustomerSummary>> listPlatformCustomers() async {
    if (!profile.isPlatformAdmin) {
      _throw('FORBIDDEN', status: 403);
    }
    if (listPlatformCustomersError != null) {
      final error = listPlatformCustomersError!;
      listPlatformCustomersError = null;
      throw error;
    }
    if (platformCustomerSummaries.isNotEmpty) {
      return platformCustomerSummaries;
    }
    return [
      for (final customer in customers)
        PlatformCustomerSummary(
          id: customer.id,
          name: customer.name,
          slug: customer.slug,
          isActive: customer.isActive,
          createdAt: DateTime.now().toUtc().toIso8601String(),
          adminCount: 1,
          pendingAdminInvites: 0,
        ),
    ];
  }

  List<FakePlatformAdmin> platformAdminsFor(String customerId) =>
      List.unmodifiable(platformAdmins[customerId] ?? const []);

  @override
  Future<PlatformAdminInviteResult> invitePlatformAdmin(
    String customerId, {
    required String email,
    String? displayName,
    String? locale,
  }) async {
    if (!profile.isPlatformAdmin) {
      _throw('FORBIDDEN', status: 403);
    }
    await getCustomer(customerId);
    final existing = platformAdmins[customerId] ?? [];
    final matchIndex = existing.indexWhere(
      (row) => row.email.toLowerCase() == email.toLowerCase(),
    );
    late final FakePlatformAdmin admin;
    if (matchIndex >= 0) {
      admin = existing[matchIndex];
    } else {
      admin = FakePlatformAdmin(
        userId: 'invited-${existing.length + 1}-$customerId',
        email: email,
        displayName: displayName ?? email,
        activationStatus: 'pending',
        locale: locale ?? 'en',
      );
      platformAdmins[customerId] = [...existing, admin];
      platformCustomerSummaries = [
        for (final row in platformCustomerSummaries)
          if (row.id == customerId)
            PlatformCustomerSummary(
              id: row.id,
              name: row.name,
              slug: row.slug,
              isActive: row.isActive,
              createdAt: row.createdAt,
              adminCount: row.adminCount + 1,
              pendingAdminInvites: row.pendingAdminInvites + 1,
            )
          else
            row,
      ];
    }
    return PlatformAdminInviteResult(
      customerId: customerId,
      userId: admin.userId,
      email: admin.email,
      activationStatus: admin.activationStatus,
      activationToken: 'fake-invite-token',
    );
  }

  @override
  Future<void> resendPlatformAdminActivation(
    String customerId,
    String userId,
  ) async {
    if (!profile.isPlatformAdmin) {
      _throw('FORBIDDEN', status: 403);
    }
    await getCustomer(customerId);
    final admins = platformAdmins[customerId] ?? const [];
    if (!admins.any((row) => row.userId == userId)) {
      _throw('NOT_FOUND', status: 404);
    }
    resendActivationCalls.add((customerId: customerId, userId: userId));
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
    bool updateParent = false,
    String? parentId,
  }) async {
    if (forceCycleOnNextCommunityUpdate) {
      forceCycleOnNextCommunityUpdate = false;
      _throw(
        'BAD_REQUEST',
        status: 400,
        message: 'Community parent would create a cycle',
      );
    }
    final current = communities.firstWhere((row) => row.id == communityId);
    var nextParent = current.parentId;
    if (updateParent) {
      if (parentId != null) {
        if (parentId == communityId ||
            _isDescendantOf(ancestorId: communityId, nodeId: parentId)) {
          _throw(
            'BAD_REQUEST',
            status: 400,
            message: 'Community parent would create a cycle',
          );
        }
        final parentExists = communities.any((row) => row.id == parentId);
        if (!parentExists) {
          _throw('NOT_FOUND', status: 404);
        }
      }
      nextParent = parentId;
    }
    final updated = Community(
      id: current.id,
      customerId: current.customerId,
      parentId: nextParent,
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

  bool _isDescendantOf({required String ancestorId, required String nodeId}) {
    final byId = {for (final row in communities) row.id: row};
    var current = byId[nodeId]?.parentId;
    final seen = <String>{};
    while (current != null && !seen.contains(current)) {
      if (current == ancestorId) {
        return true;
      }
      seen.add(current);
      current = byId[current]?.parentId;
    }
    return false;
  }

  @override
  Future<MembershipListPage> listMemberships(
    String customerId, {
    String? q,
    String? communityId,
    bool? includeDescendants,
    String? roleKey,
    String? status,
    int? limit,
    String? cursor,
  }) async {
    var items =
        memberships.where((row) => row.customerId == customerId).toList();
    if (!customerAccess.isTenantLevel) {
      final visible = <String>{};
      for (final root in customerAccess.communityIds) {
        visible.addAll(communitySubtreeIds(communities, root));
      }
      items = items
          .where(
            (row) =>
                row.communityId != null && visible.contains(row.communityId),
          )
          .map(
            (row) => Membership(
              id: row.id,
              customerId: row.customerId,
              userId: row.userId,
              communityId: row.communityId,
              isActive: row.isActive,
              roles: row.roles,
              community: row.community,
              user: row.user == null
                  ? null
                  : MembershipUserSummary(
                      id: row.user!.id,
                      displayName: row.user!.displayName,
                      activationStatus: row.user!.activationStatus,
                    ),
            ),
          )
          .toList();
    }
    if (communityId != null) {
      final allowed = includeDescendants == true
          ? communitySubtreeIds(communities, communityId)
          : {communityId};
      items = items
          .where(
            (row) =>
                row.communityId != null && allowed.contains(row.communityId),
          )
          .toList();
    }
    if (status == 'pending') {
      items = items
          .where((row) => row.user?.activationStatus == 'pending')
          .toList();
    } else if (status == 'active') {
      items = items
          .where((row) => row.user?.activationStatus == 'active')
          .toList();
    }
    if (roleKey != null) {
      items = items
          .where((row) => row.roles.any((role) => role.key == roleKey))
          .toList();
    }
    if (q != null && q.trim().isNotEmpty) {
      final needle = q.trim().toLowerCase();
      items = items.where((row) {
        final user = row.user;
        final haystack = [
          user?.displayName,
          user?.email,
          user?.mobile,
        ].whereType<String>().join(' ').toLowerCase();
        return haystack.contains(needle);
      }).toList();
    }
    final take = limit ?? 50;
    final start = cursor == null ? 0 : (int.tryParse(cursor) ?? 0);
    final slice = items.skip(start).take(take).toList();
    final next = start + slice.length;
    return MembershipListPage(
      items: slice,
      nextCursor: next < items.length ? '$next' : null,
    );
  }

  Set<String> communitySubtreeIds(List<Community> flat, String nodeId) {
    final childrenOf = <String?, List<String>>{};
    for (final community in flat) {
      final list = childrenOf.putIfAbsent(community.parentId, () => <String>[]);
      list.add(community.id);
    }
    final result = <String>{nodeId};
    final queue = <String>[nodeId];
    while (queue.isNotEmpty) {
      final current = queue.removeLast();
      for (final child in childrenOf[current] ?? const <String>[]) {
        if (result.add(child)) {
          queue.add(child);
        }
      }
    }
    return result;
  }

  @override
  Future<Membership> getMembership(String membershipId) async {
    final match = memberships.where((row) => row.id == membershipId);
    if (match.isEmpty) {
      _throw('NOT_FOUND', status: 404);
    }
    return match.first;
  }

  @override
  Future<Membership> updateMembership(
    String membershipId, {
    required bool isActive,
  }) async {
    final current = await getMembership(membershipId);
    if (!isActive && lastTenantAdminGuard) {
      final isAdmin = current.roles.any((role) => role.key == 'tenant_admin');
      if (isAdmin && current.communityId == null && current.isActive) {
        _throw(
          'FORBIDDEN',
          status: 403,
          message: 'Cannot remove the last tenant admin',
        );
      }
    }
    final updated = Membership(
      id: current.id,
      customerId: current.customerId,
      userId: current.userId,
      communityId: current.communityId,
      isActive: isActive,
      roles: current.roles,
      user: current.user,
      community: current.community,
    );
    memberships = [
      for (final row in memberships)
        if (row.id == membershipId) updated else row,
    ];
    return updated;
  }

  @override
  Future<List<RoleSummary>> assignMembershipRole(
    String membershipId,
    String roleId,
  ) async {
    final current = await getMembership(membershipId);
    final roleMatch = roles.where((row) => row.id == roleId);
    if (roleMatch.isEmpty) {
      _throw('NOT_FOUND', status: 404, message: 'Role not found');
    }
    final role = roleMatch.first.summary;
    if (current.roles.any((row) => row.id == roleId)) {
      return current.roles;
    }
    final updated = Membership(
      id: current.id,
      customerId: current.customerId,
      userId: current.userId,
      communityId: current.communityId,
      isActive: current.isActive,
      roles: [...current.roles, role],
      user: current.user,
      community: current.community,
    );
    memberships = [
      for (final row in memberships)
        if (row.id == membershipId) updated else row,
    ];
    return updated.roles;
  }

  @override
  Future<List<RoleSummary>> unassignMembershipRole(
    String membershipId,
    String roleId,
  ) async {
    final current = await getMembership(membershipId);
    final removing = current.roles.where((row) => row.id == roleId);
    if (removing.isNotEmpty &&
        removing.first.key == 'tenant_admin' &&
        lastTenantAdminGuard &&
        current.communityId == null &&
        current.isActive) {
      _throw(
        'FORBIDDEN',
        status: 403,
        message: 'Cannot remove the last tenant admin',
      );
    }
    final updated = Membership(
      id: current.id,
      customerId: current.customerId,
      userId: current.userId,
      communityId: current.communityId,
      isActive: current.isActive,
      roles: [
        for (final role in current.roles)
          if (role.id != roleId) role,
      ],
      user: current.user,
      community: current.community,
    );
    memberships = [
      for (final row in memberships)
        if (row.id == membershipId) updated else row,
    ];
    return updated.roles;
  }

  @override
  Future<List<Role>> listRoles(String customerId) async {
    return roles.where((row) => row.customerId == customerId).toList();
  }

  @override
  Future<Role> getRole(String roleId) async {
    final match = roles.where((row) => row.id == roleId);
    if (match.isEmpty) {
      _throw('NOT_FOUND', status: 404);
    }
    return match.first;
  }

  @override
  Future<CustomerAccess> getCustomerAccess(String customerId) async {
    if (customers.every((row) => row.id != customerId)) {
      _throw('NOT_FOUND', status: 404);
    }
    return customerAccess;
  }

  @override
  Future<MembershipInvitationResult> inviteMembership({
    required String customerId,
    String? email,
    String? mobile,
    String? displayName,
    String? communityId,
    List<String>? roleKeys,
  }) async {
    if (email == null && mobile == null) {
      _throw('BAD_REQUEST', status: 400);
    }
    final existing = memberships.where(
      (row) =>
          row.customerId == customerId &&
          row.communityId == communityId &&
          ((email != null && row.user?.email == email) ||
              (mobile != null && row.user?.mobile == mobile)),
    );
    if (existing.isNotEmpty) {
      final row = existing.first;
      return MembershipInvitationResult(
        membershipId: row.id,
        userId: row.userId,
        customerId: customerId,
        communityId: communityId,
        email: email ?? row.user?.email,
        mobile: mobile ?? row.user?.mobile,
        activationStatus: row.user?.activationStatus ?? 'pending',
        created: false,
      );
    }
    final userId = 'invited-user-${memberships.length + 1}';
    final membershipId = 'mem-invite-${memberships.length + 1}';
    final pending = email != null || mobile != null;
    memberships = [
      ...memberships,
      Membership(
        id: membershipId,
        customerId: customerId,
        userId: userId,
        communityId: communityId,
        isActive: true,
        roles: const [
          RoleSummary(id: 'role-member', key: 'member', name: 'Member'),
        ],
        user: MembershipUserSummary(
          id: userId,
          displayName: displayName ?? email ?? mobile,
          email: email,
          mobile: mobile,
          activationStatus: pending ? 'pending' : 'active',
        ),
      ),
    ];
    return MembershipInvitationResult(
      membershipId: membershipId,
      userId: userId,
      customerId: customerId,
      communityId: communityId,
      email: email,
      mobile: mobile,
      activationStatus: 'pending',
      created: true,
      activationLink: email == null && mobile != null
          ? 'http://localhost:8080/activate?token=fake-mobile-token'
          : null,
    );
  }

  @override
  Future<ResendMembershipActivationResult> resendMembershipActivation(
    String membershipId,
  ) async {
    final match = memberships.where((row) => row.id == membershipId);
    if (match.isEmpty) {
      _throw('NOT_FOUND', status: 404);
    }
    final membership = match.first;
    if (membership.user?.activationStatus == 'active') {
      _throw('CONFLICT', status: 409, message: 'User is already active');
    }
    final mobileOnly =
        membership.user?.email == null && membership.user?.mobile != null;
    return ResendMembershipActivationResult(
      accepted: true,
      activationLink: mobileOnly
          ? 'http://localhost:8080/activate?token=fake-mobile-resend'
          : null,
    );
  }

  @override
  Future<List<UserImport>> listUserImports(String customerId) async {
    return [
      for (final row in importHistory)
        if (row.customerId == customerId) row,
      if (currentImport != null &&
          currentImport!.customerId == customerId &&
          importHistory.every((row) => row.id != currentImport!.id))
        currentImport!,
    ];
  }

  @override
  Future<UserImport> getUserImport(String userImportId) async {
    final fromHistory = importHistory.where((row) => row.id == userImportId);
    if (fromHistory.isNotEmpty) {
      return fromHistory.first;
    }
    if (currentImport?.id == userImportId) {
      return currentImport!;
    }
    _throw('NOT_FOUND', status: 404);
  }

  @override
  Future<UserImport> uploadUserImport({
    required String customerId,
    required String filename,
    required List<int> bytes,
    String? communityId,
  }) async {
    final text = String.fromCharCodes(bytes);
    final lines = text
        .split(RegExp(r'\r?\n'))
        .where((line) => line.trim().isNotEmpty)
        .toList();
    final headers = lines.isEmpty
        ? <String>[]
        : lines.first.split(',').map((h) => h.trim()).toList();
    final id = 'import-${importHistory.length + 1}';
    currentImport = UserImport(
      id: id,
      customerId: customerId,
      communityId: communityId,
      originalFilename: filename,
      status: 'uploaded',
      headers: headers.isEmpty
          ? const ['email', 'mobile', 'display_name', 'communityPath']
          : headers,
      counts: UserImportCounts(
        total: lines.length > 1 ? lines.length - 1 : 0,
        pending: lines.length > 1 ? lines.length - 1 : 0,
        valid: 0,
        invalid: 0,
        review: 0,
        created: 0,
        matched: 0,
      ),
      createdAt: '2026-10-17T00:00:00.000Z',
      updatedAt: '2026-10-17T00:00:00.000Z',
    );
    importRows = const [];
    return currentImport!;
  }

  @override
  Future<UserImport> mapUserImport(
    String userImportId, {
    required Map<String, String> mapping,
  }) async {
    final current = await getUserImport(userImportId);
    currentImport = UserImport(
      id: current.id,
      customerId: current.customerId,
      communityId: current.communityId,
      originalFilename: current.originalFilename,
      status: 'mapped',
      headers: current.headers,
      mapping: mapping,
      counts: current.counts,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      confirmedAt: current.confirmedAt,
    );
    return currentImport!;
  }

  @override
  Future<UserImport> validateUserImport(String userImportId) async {
    final current = await getUserImport(userImportId);
    if (importForceInvalidRows) {
      importRows = const [
        UserImportRow(
          id: 'row-ok',
          rowNumber: 2,
          rawData: {'email': 'ok@example.com', 'communityPath': 'Region/Branch'},
          status: 'valid',
          email: 'ok@example.com',
        ),
        UserImportRow(
          id: 'row-bad',
          rowNumber: 3,
          rawData: {
            'email': 'bad@example.com',
            'communityPath': 'Region/Missing',
          },
          status: 'invalid',
          email: 'bad@example.com',
          errorCode: 'UNKNOWN_COMMUNITY_PATH',
          errorMessage: 'Unknown community path: Region/Missing',
        ),
        UserImportRow(
          id: 'row-review',
          rowNumber: 4,
          rawData: {'email': 'review@example.com'},
          status: 'review',
          email: 'review@example.com',
          errorCode: 'IDENTITY_OUTSIDE_TENANT',
          errorMessage: 'Identity exists outside this customer — fix CSV',
        ),
      ];
      currentImport = UserImport(
        id: current.id,
        customerId: current.customerId,
        communityId: current.communityId,
        originalFilename: current.originalFilename,
        status: 'validated',
        headers: current.headers,
        mapping: current.mapping,
        counts: const UserImportCounts(
          total: 3,
          pending: 0,
          valid: 1,
          invalid: 1,
          review: 1,
          created: 0,
          matched: 0,
        ),
        createdAt: current.createdAt,
        updatedAt: current.updatedAt,
      );
      return currentImport!;
    }
    importRows = [
      const UserImportRow(
        id: 'row-1',
        rowNumber: 2,
        rawData: {'email': 'imported@example.com'},
        status: 'valid',
        email: 'imported@example.com',
      ),
      const UserImportRow(
        id: 'row-2',
        rowNumber: 3,
        rawData: {'email': 'matched@example.com'},
        status: 'valid',
        email: 'matched@example.com',
      ),
    ];
    currentImport = UserImport(
      id: current.id,
      customerId: current.customerId,
      communityId: current.communityId,
      originalFilename: current.originalFilename,
      status: 'validated',
      headers: current.headers,
      mapping: current.mapping,
      counts: const UserImportCounts(
        total: 2,
        pending: 0,
        valid: 2,
        invalid: 0,
        review: 0,
        created: 0,
        matched: 0,
      ),
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    );
    return currentImport!;
  }

  @override
  Future<UserImportPreview> previewUserImport(String userImportId) async {
    final current = currentImport ?? await validateUserImport(userImportId);
    return UserImportPreview(importRecord: current, rows: importRows);
  }

  @override
  Future<UserImport> confirmUserImport(String userImportId) async {
    final current = await getUserImport(userImportId);
    if (current.status == 'confirmed') {
      return current;
    }
    final created = importRows.where((row) => row.status == 'valid').length;
    final matched = 0;
    final invalid = importRows.where((row) => row.status == 'invalid').length;
    final review = importRows.where((row) => row.status == 'review').length;
    importRows = [
      for (final row in importRows)
        if (row.status == 'valid')
          UserImportRow(
            id: row.id,
            rowNumber: row.rowNumber,
            rawData: row.rawData,
            status: 'created',
            email: row.email,
            mobile: row.mobile,
            externalId: row.externalId,
          )
        else
          row,
    ];
    currentImport = UserImport(
      id: current.id,
      customerId: current.customerId,
      communityId: current.communityId,
      originalFilename: current.originalFilename,
      status: 'confirmed',
      headers: current.headers,
      mapping: current.mapping,
      counts: UserImportCounts(
        total: importRows.length,
        pending: 0,
        valid: 0,
        invalid: invalid,
        review: review,
        created: created,
        matched: matched,
      ),
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      confirmedAt: '2026-10-17T01:00:00.000Z',
    );
    importHistory = [
      currentImport!,
      ...importHistory.where((row) => row.id != currentImport!.id),
    ];
    return currentImport!;
  }

  @override
  Future<List<UserImportRow>> listUserImportRows(String userImportId) async =>
      importRows;

  @override
  Future<List<CampaignTemplate>> listTemplates(String customerId) async =>
      templates.where((row) => row.customerId == customerId).toList();

  @override
  Future<CampaignTemplate> createTemplate({
    required String customerId,
    required String name,
    String? key,
    String? description,
  }) async {
    final created = CampaignTemplate(
      id: 'tmpl-${templates.length + 1}',
      customerId: customerId,
      key: key ?? 'template_${templates.length + 1}',
      name: name,
      description: description,
      isActive: true,
    );
    templates = [...templates, created];
    return created;
  }

  @override
  Future<List<CampaignScope>> listScopes(
    String customerId, {
    String? templateId,
  }) async {
    return scopes
        .where(
          (row) =>
              row.customerId == customerId &&
              (templateId == null || row.templateId == templateId),
        )
        .toList();
  }

  @override
  Future<CampaignScope> createScope({
    required String customerId,
    required String templateId,
    required String name,
    String? key,
    String? description,
  }) async {
    final created = CampaignScope(
      id: 'scope-${scopes.length + 1}',
      customerId: customerId,
      templateId: templateId,
      key: key ?? 'scope_${scopes.length + 1}',
      name: name,
      description: description,
      isActive: true,
    );
    scopes = [...scopes, created];
    return created;
  }

  @override
  Future<List<CampaignRuleStrategy>> listCampaignRuleStrategies(
    String customerId,
  ) async {
    assert(customerId.isNotEmpty);
    return const [
      CampaignRuleStrategy(
        key: 'generic',
        label: 'Generic',
        description:
            'No built-in pledge catalog. Configure action definitions for the campaign.',
        units: [],
        reviewModes: ['auto', 'manual'],
        recommendedActionDefinitions: [],
      ),
      CampaignRuleStrategy(
        key: 'vegetarian',
        label: 'Vegetarian (速素数数)',
        description:
            'Seven pledge choices with days and meals units for a vegetarian observance campaign.',
        units: ['days', 'meals'],
        reviewModes: ['auto', 'manual'],
        recommendedActionDefinitions: [
          RecommendedActionDefinition(
            key: 'vegetarian_day',
            unit: 'days',
            name: 'Vegetarian day',
          ),
          RecommendedActionDefinition(
            key: 'vegetarian_meal',
            unit: 'meals',
            name: 'Vegetarian meal',
          ),
        ],
      ),
    ];
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
    CampaignContentTranslations? translations,
  }) async {
    final localeName =
        lastAcceptLanguage.startsWith('en') ? translations?.en?.name : null;
    final localeDescription = lastAcceptLanguage.startsWith('en')
        ? translations?.en?.description
        : null;
    final created = Campaign(
      id: 'camp-${campaigns.length + 1}',
      customerId: customerId,
      templateId: templateId,
      scopeId: scopeId,
      name: localeName ?? name,
      description: localeDescription ?? description,
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

  @override
  Future<Campaign> updateCampaign(
    String campaignId, {
    String? name,
    String? description,
    String? timezone,
    String? startsOn,
    String? endsOn,
    List<String>? communityIds,
    Map<String, dynamic>? configuration,
    CampaignContentTranslations? translations,
  }) async {
    final current = await getCampaign(campaignId);
    if (current.status != 'draft') {
      if (name != null ||
          timezone != null ||
          startsOn != null ||
          communityIds != null ||
          configuration != null ||
          translations?.en?.name != null ||
          translations?.en?.treeDisplayName != null) {
        throw ApiException(
          statusCode: 409,
          code: 'CAMPAIGN_FIELD_LOCKED',
          message:
              'Only description and extending endsOn may be changed after publish',
        );
      }
      if (endsOn != null &&
          current.endsOn != null &&
          endsOn.compareTo(current.endsOn!) < 0) {
        throw ApiException(
          statusCode: 409,
          code: 'CAMPAIGN_END_DATE_LOCKED',
          message: 'endsOn may only be extended after publish',
        );
      }
    }
    final updated = Campaign(
      id: current.id,
      customerId: current.customerId,
      templateId: current.templateId,
      scopeId: current.scopeId,
      name: name ?? current.name,
      description: description ?? current.description,
      status: current.status,
      timezone: timezone ?? current.timezone,
      startsOn: startsOn ?? current.startsOn,
      endsOn: endsOn ?? current.endsOn,
      communityIds: communityIds ?? current.communityIds,
      configuration: configuration ?? current.configuration,
    );
    campaigns = [
      for (final row in campaigns)
        if (row.id == campaignId) updated else row,
    ];
    return updated;
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
    if (joinFailureCode != null) {
      _throw(
        joinFailureCode!,
        status: joinFailureCode == 'CONFLICT' ? 409 : 400,
        message: joinFailureMessage ?? joinFailureCode,
      );
    }
    if (failJoinNotEligible) {
      _throw(
        'BAD_REQUEST',
        message: 'User is not in a community targeted by this campaign',
      );
    }
    final matches = campaigns.where((row) => row.id == campaignId);
    if (matches.isEmpty) {
      _throw('NOT_FOUND', status: 404, message: 'Campaign not found');
    }
    final campaign = matches.first;
    if (campaign.status != 'published' && campaign.status != 'started') {
      _throw(
        'BAD_REQUEST',
        message: 'Users can only enroll in published or started campaigns',
      );
    }
    final autoMode = campaign.configuration['enrolmentMode'] == 'auto';
    final existing = participations
        .where(
          (row) => row.campaignId == campaignId && row.userId == profile.id,
        )
        .toList();
    if (existing.isNotEmpty) {
      final current = existing.first;
      if (autoMode) {
        return current;
      }
      if (current.isEnrolled) {
        _throw(
          'CONFLICT',
          status: 409,
          message: 'User is already enrolled in this campaign',
        );
      }
      final restored = Participation(
        id: current.id,
        customerId: current.customerId,
        campaignId: current.campaignId,
        userId: current.userId,
        communityId: current.communityId,
        status: 'enrolled',
        enrolmentSource: 'self',
        engagement: 'awaiting_commitment',
      );
      participations = [
        for (final row in participations)
          if (row.id == current.id) restored else row,
      ];
      return restored;
    }
    final created = Participation(
      id: 'part-${participations.length + 1}',
      customerId: campaign.customerId,
      campaignId: campaignId,
      userId: profile.id,
      status: 'enrolled',
      enrolmentSource: autoMode ? 'auto' : 'self',
      engagement: 'awaiting_commitment',
    );
    participations = [...participations, created];
    return created;
  }

  @override
  Future<Participation> withdrawParticipation(String participationId) async {
    final current = participations.firstWhere((row) => row.id == participationId);
    final campaignMatches =
        campaigns.where((row) => row.id == current.campaignId);
    if (campaignMatches.isNotEmpty &&
        campaignMatches.first.configuration['enrolmentMode'] == 'auto') {
      _throw(
        'ENROLMENT_AUTO_MANAGED',
        status: 409,
        message:
            'This campaign manages enrolment automatically; choose not taking part instead of withdrawing',
      );
    }
    final updated = Participation(
      id: current.id,
      customerId: current.customerId,
      campaignId: current.campaignId,
      userId: current.userId,
      communityId: current.communityId,
      status: 'withdrawn',
      enrolmentSource: current.enrolmentSource,
      engagement: 'withdrawn',
    );
    participations = [
      for (final row in participations)
        if (row.id == participationId) updated else row,
    ];
    return updated;
  }

  @override
  Future<ParticipationSummary> getParticipationSummary(
    String campaignId, {
    String? communityId,
  }) async {
    Set<String>? subtree;
    if (communityId != null) {
      subtree = {communityId};
      var grew = true;
      while (grew) {
        grew = false;
        for (final community in communities) {
          if (community.parentId != null &&
              subtree.contains(community.parentId) &&
              subtree.add(community.id)) {
            grew = true;
          }
        }
      }
    }
    final rows = participations.where(
      (row) =>
          row.campaignId == campaignId &&
          (subtree == null ||
              (row.communityId != null && subtree.contains(row.communityId))),
    );
    int count(String engagement) =>
        rows.where((row) => row.engagement == engagement).length;
    return ParticipationSummary(
      campaignId: campaignId,
      communityId: communityId,
      enrolled: rows.where((row) => row.isEnrolled).length,
      awaitingCommitment: count('awaiting_commitment'),
      takingPart: count('taking_part'),
      notTakingPart: count('not_taking_part'),
      withdrawn: count('withdrawn'),
    );
  }

  @override
  Future<AutoEnrolSyncResult> syncAutoEnrolment(String campaignId) async {
    final matches = campaigns.where((row) => row.id == campaignId);
    if (matches.isEmpty) {
      _throw('NOT_FOUND', status: 404, message: 'Campaign not found');
    }
    final campaign = matches.first;
    if (campaign.configuration['enrolmentMode'] != 'auto') {
      return const AutoEnrolSyncResult(
        created: 0,
        alreadyEnrolled: 0,
        skipped: 0,
      );
    }
    final existing = participations.any(
      (row) => row.campaignId == campaignId && row.userId == profile.id,
    );
    if (existing) {
      return const AutoEnrolSyncResult(
        created: 0,
        alreadyEnrolled: 1,
        skipped: 0,
      );
    }
    participations = [
      ...participations,
      Participation(
        id: 'part-${participations.length + 1}',
        customerId: campaign.customerId,
        campaignId: campaignId,
        userId: profile.id,
        status: 'enrolled',
        enrolmentSource: 'auto',
        engagement: 'awaiting_commitment',
      ),
    ];
    return const AutoEnrolSyncResult(
      created: 1,
      alreadyEnrolled: 0,
      skipped: 0,
    );
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
    num? targetValue,
    String? unit,
    String decision = CommitmentDecision.committed,
  }) async {
    final notTakingPart = decision == CommitmentDecision.notTakingPart;
    if (!notTakingPart &&
        (targetValue == null || unit == null || unit.trim().isEmpty)) {
      _throw(
        'VALIDATION_ERROR',
        status: 400,
        message: 'targetValue and unit are required for a commitment',
      );
    }
    final existing = commitments
        .where((row) => row.participationId == participationId)
        .firstOrNull;
    final created = Commitment(
      id: existing?.id ?? 'commit-${commitments.length + 1}',
      participationId: participationId,
      typeKey: notTakingPart ? null : typeKey,
      targetValue: notTakingPart ? 0 : targetValue!,
      unit: notTakingPart ? '' : unit!,
      decision: decision,
    );
    // Create-or-replace: one commitment per participation.
    commitments = [
      for (final row in commitments)
        if (row.participationId != participationId) row,
      created,
    ];
    participations = [
      for (final row in participations)
        if (row.id == participationId && row.isEnrolled)
          Participation(
            id: row.id,
            customerId: row.customerId,
            campaignId: row.campaignId,
            userId: row.userId,
            communityId: row.communityId,
            status: row.status,
            enrolmentSource: row.enrolmentSource,
            engagement: notTakingPart ? 'not_taking_part' : 'taking_part',
          )
        else
          row,
    ];
    return created;
  }

  Milestone _localizedMilestone(Milestone row) {
    final en = row.englishTranslations;
    if (!lastAcceptLanguage.startsWith('en')) {
      return row;
    }
    return _copyMilestone(
      row,
      name: en.name ?? row.name,
      description: en.description ?? row.description,
    );
  }

  Milestone _copyMilestone(
    Milestone row, {
    String? name,
    String? description,
    bool clearDescription = false,
    String? dueOn,
    bool clearDueOn = false,
    MilestoneGoal? goal,
    bool clearGoal = false,
    bool? isActive,
    MilestoneEnglishTranslations? englishTranslations,
  }) {
    return Milestone(
      id: row.id,
      customerId: row.customerId,
      campaignId: row.campaignId,
      key: row.key,
      name: name ?? row.name,
      description: clearDescription ? null : description ?? row.description,
      dueOn: clearDueOn ? null : dueOn ?? row.dueOn,
      goal: clearGoal ? null : goal ?? row.goal,
      isActive: isActive ?? row.isActive,
      englishTranslations: englishTranslations ?? row.englishTranslations,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      updatedAt: DateTime.now().toUtc(),
    );
  }

  MilestoneEnglishTranslations _mergeMilestoneEnglish(
    MilestoneEnglishTranslations current,
    MilestoneContentTranslations? translations,
  ) {
    final en = translations?.en;
    if (en == null) {
      return current;
    }
    return MilestoneEnglishTranslations(
      name: en.name ?? current.name,
      description: en.description ?? current.description,
    );
  }

  Milestone _milestone(String milestoneId) {
    final matches = milestones.where((row) => row.id == milestoneId);
    if (matches.isEmpty) {
      _throw('NOT_FOUND', status: 404, message: 'Milestone not found');
    }
    return matches.first;
  }

  void _assertMilestoneDueOn(
    Campaign campaign,
    String dueOn, {
    String? excludeId,
  }) {
    final startsOn = campaign.startsOn;
    final endsOn = campaign.endsOn;
    if (startsOn == null ||
        endsOn == null ||
        dueOn.compareTo(startsOn) < 0 ||
        dueOn.compareTo(endsOn) > 0) {
      _throw(
        'MILESTONE_DATE_OUT_OF_WINDOW',
        message: 'dueOn must be inside the campaign window',
      );
    }
    final clash = milestones.any(
      (row) =>
          row.campaignId == campaign.id &&
          row.id != excludeId &&
          row.isActive &&
          row.dueOn == dueOn,
    );
    if (clash) {
      _throw(
        'MILESTONE_DATE_DUPLICATE',
        status: 409,
        message: 'Another active milestone already uses this date',
      );
    }
  }

  Never _milestoneLocked() => _throw(
        'MILESTONE_LOCKED',
        status: 409,
        message: 'Milestone dates are fixed once the campaign is published',
      );

  @override
  Future<List<Milestone>> listMilestones(String campaignId) async => milestones
      .where((row) => row.campaignId == campaignId)
      .map(_localizedMilestone)
      .toList();

  @override
  Future<Milestone> createMilestone({
    required String campaignId,
    required String name,
    String? key,
    String? description,
    String? dueOn,
    MilestoneGoal? goal,
    MilestoneContentTranslations? translations,
  }) async {
    final campaign = await getCampaign(campaignId);
    if (dueOn == null && goal == null) {
      _throw(
        'BAD_REQUEST',
        message: 'A milestone needs a due date, a collective goal, or both',
      );
    }
    if (dueOn != null) {
      if (campaign.status != 'draft') {
        _milestoneLocked();
      }
      _assertMilestoneDueOn(campaign, dueOn);
    }
    final now = DateTime.now().toUtc();
    final created = Milestone(
      id: 'ms-${milestones.length + 1}',
      customerId: campaign.customerId,
      campaignId: campaignId,
      key: key ?? 'milestone_${milestones.length + 1}',
      name: name,
      description: description,
      dueOn: dueOn,
      goal: goal,
      isActive: true,
      englishTranslations: _mergeMilestoneEnglish(
        const MilestoneEnglishTranslations(),
        translations,
      ),
      createdByUserId: profile.id,
      createdAt: now,
      updatedAt: now,
    );
    milestones = [...milestones, created];
    return _localizedMilestone(created);
  }

  @override
  Future<Milestone> updateMilestone(
    String milestoneId, {
    String? name,
    String? description,
    String? dueOn,
    bool clearDueOn = false,
    MilestoneGoal? goal,
    bool clearGoal = false,
    bool? isActive,
    MilestoneContentTranslations? translations,
  }) async {
    final current = _milestone(milestoneId);
    final campaign = await getCampaign(current.campaignId);
    final nextDueOn = clearDueOn ? null : dueOn ?? current.dueOn;
    final nextActive = isActive ?? current.isActive;
    final dueOnChanged = nextDueOn != current.dueOn;
    final activeChanged = nextActive != current.isActive;
    if (campaign.status != 'draft' &&
        (dueOnChanged || (activeChanged && current.dueOn != null))) {
      _milestoneLocked();
    }
    final nextHasGoal = clearGoal ? false : goal != null || current.hasGoal;
    if (nextDueOn == null && !nextHasGoal) {
      _throw(
        'BAD_REQUEST',
        message: 'A milestone needs a due date, a collective goal, or both',
      );
    }
    if (nextDueOn != null && nextActive && (dueOnChanged || activeChanged)) {
      _assertMilestoneDueOn(campaign, nextDueOn, excludeId: milestoneId);
    }
    final updated = _copyMilestone(
      current,
      name: name,
      description: description,
      dueOn: nextDueOn,
      clearDueOn: nextDueOn == null,
      goal: goal,
      clearGoal: clearGoal,
      isActive: nextActive,
      englishTranslations: _mergeMilestoneEnglish(
        current.englishTranslations,
        translations,
      ),
    );
    milestones = [
      for (final row in milestones)
        if (row.id == milestoneId) updated else row,
    ];
    return _localizedMilestone(updated);
  }

  ({num? percent, bool crossed}) _milestoneCrossing(MilestoneGoal goal) {
    final target = fakeMilestoneTargetValue;
    final achieved = fakeMilestoneAchievedValue;
    final percent = target > 0 ? achieved * 100 / target : null;
    final crossed = goal.metric == MilestoneMetric.completionPercent
        ? percent != null && percent >= goal.thresholdValue
        : achieved >= goal.thresholdValue;
    return (percent: percent, crossed: crossed);
  }

  @override
  Future<MilestoneProgress> getMilestoneProgress(String milestoneId) async {
    final row = _milestone(milestoneId);
    final goal = row.goal;
    final now = DateTime.now().toUtc();
    if (goal == null) {
      return MilestoneProgress(
        milestoneId: row.id,
        campaignId: row.campaignId,
        customerId: row.customerId,
        hasGoal: false,
        currentAchievedValue: 0,
        currentTargetValue: 0,
        crossed: false,
        status: 'none',
        computedAt: now,
      );
    }
    final crossing = _milestoneCrossing(goal);
    return MilestoneProgress(
      milestoneId: row.id,
      campaignId: row.campaignId,
      customerId: row.customerId,
      hasGoal: true,
      metric: goal.metric,
      unit: goal.unit,
      thresholdValue: goal.thresholdValue,
      currentAchievedValue: fakeMilestoneAchievedValue,
      currentTargetValue: fakeMilestoneTargetValue,
      currentCompletionPercent: crossing.percent,
      crossed: crossing.crossed,
      status: crossing.crossed
          ? 'achieved'
          : fakeMilestoneAchievedValue > 0
              ? 'in_progress'
              : 'not_started',
      computedAt: now,
    );
  }

  @override
  Future<MilestoneEvaluation> evaluateMilestone(String milestoneId) async {
    final row = _milestone(milestoneId);
    final goal = row.goal;
    if (goal == null) {
      _throw(
        'BAD_REQUEST',
        message: 'This milestone has no collective goal to evaluate',
      );
    }
    final progress = await getMilestoneProgress(milestoneId);
    final now = DateTime.now().toUtc();
    final evaluation = MilestoneEvaluation(
      id: 'mse-${milestoneEvaluations.length + 1}',
      milestoneId: row.id,
      customerId: row.customerId,
      evaluatedByUserId: profile.id,
      achievedValue: progress.currentAchievedValue,
      targetValue: progress.currentTargetValue,
      completionPercent: progress.currentCompletionPercent,
      crossed: progress.crossed,
      status: progress.status,
      evaluatedAt: now,
      createdAt: now,
    );
    milestoneEvaluations = [evaluation, ...milestoneEvaluations];
    return evaluation;
  }

  @override
  Future<List<MilestoneEvaluation>> listMilestoneEvaluations(
    String milestoneId,
  ) async {
    _milestone(milestoneId);
    return milestoneEvaluations
        .where((row) => row.milestoneId == milestoneId)
        .toList();
  }

  @override
  Future<List<CampaignPeriod>> listCampaignPeriods(String campaignId) async {
    final campaign = await getCampaign(campaignId);
    final dated = milestones
        .where(
          (row) =>
              row.campaignId == campaignId && row.isActive && row.dueOn != null,
        )
        .map(_localizedMilestone)
        .map((row) => (id: row.id, dueOn: row.dueOn!, name: row.name))
        .toList();
    return computeCampaignPeriods(
      startsOn: campaign.startsOn,
      endsOn: campaign.endsOn,
      milestones: dated,
    );
  }

  @override
  Future<List<ActionDefinition>> listActionDefinitions(String campaignId) async =>
      actionDefinitions.where((row) => row.campaignId == campaignId).toList();

  @override
  Future<ActionDefinition> createActionDefinition({
    required String campaignId,
    required String name,
    required String unit,
    String? key,
    String? description,
  }) async {
    final created = ActionDefinition(
      id: 'adef-${actionDefinitions.length + 1}',
      campaignId: campaignId,
      key: key ?? 'action_${actionDefinitions.length + 1}',
      name: name,
      unit: unit,
      isActive: true,
    );
    actionDefinitions = [...actionDefinitions, created];
    return created;
  }

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
    Map<String, dynamic>? payload,
  }) async {
    if (failRecordNetwork) {
      throw Exception('SocketException: Failed host lookup');
    }
    final day = occurredOn ?? fakeToday ?? '2026-10-14';
    final body = payload ?? const <String, dynamic>{};
    if (idempotencyKey != null && idempotencyKey.isNotEmpty) {
      final replay = actions.where(
        (row) => row.idempotencyKey == idempotencyKey && !row.isCancelled,
      );
      if (replay.isNotEmpty) {
        return replay.first;
      }
    }
    final duplicate = actions.where(
      (row) =>
          row.participationId == participationId &&
          row.actionDefinitionId == actionDefinitionId &&
          row.occurredOn == day &&
          !row.isCancelled,
    );
    if (duplicate.isNotEmpty) {
      _throw(
        'CONFLICT',
        status: 409,
        message: 'Action already recorded for this day',
      );
    }
    final participation = participations.where((row) => row.id == participationId);
    final campaignId = participation.isEmpty
        ? 'camp-1'
        : participation.first.campaignId;
    final campaignMatch = campaigns.where((row) => row.id == campaignId);
    final reviewMode = campaignMatch.isEmpty
        ? 'auto'
        : campaignMatch.first.configuration['submissionReview']?.toString() ??
            'auto';
    final submissionStatus = forceSubmissionStatus ??
        (reviewMode == 'manual' ? 'submitted' : 'approved');
    final actionId = 'act-${actions.length + 1}';
    final created = RecordedAction(
      id: actionId,
      campaignId: campaignId,
      participationId: participationId,
      userId: profile.id,
      actionDefinitionId: actionDefinitionId,
      occurredOn: day,
      quantity: quantity ?? 1,
      status: 'recorded',
      payload: body,
      idempotencyKey: idempotencyKey,
      submission: Submission(
        id: 'sub-${actions.length + 1}',
        actionId: actionId,
        status: submissionStatus,
        reviewNote: submissionStatus == 'rejected' ? forceReviewNote : null,
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
      payload: current.payload,
      idempotencyKey: current.idempotencyKey,
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

  /// Last granularity requested by dashboard methods (for widget tests).
  String lastDashboardGranularity = 'day';

  /// Optional week-bucket series returned when [lastDashboardGranularity] is week.
  List<TimeSeriesPoint>? weekTimeSeries;

  @override
  Future<AggregateDashboard> getCampaignDashboard(
    String campaignId, {
    String granularity = 'day',
  }) async {
    lastDashboardGranularity = granularity;
    if (granularity == 'week' && weekTimeSeries != null) {
      return AggregateDashboard(
        scope: campaignDashboard.scope,
        progress: campaignDashboard.progress,
        measurements: campaignDashboard.measurements,
        outcomes: campaignDashboard.outcomes,
        timeSeries: weekTimeSeries!,
        visualization: campaignDashboard.visualization,
      );
    }
    return campaignDashboard;
  }

  @override
  Future<AggregateDashboard> getCommunityDashboard({
    required String campaignId,
    required String communityId,
    String granularity = 'day',
  }) async {
    lastDashboardGranularity = granularity;
    final base = communityDashboard ??
        AggregateDashboard(
          scope: 'community',
          progress: campaignDashboard.progress,
          measurements: campaignDashboard.measurements,
          outcomes: campaignDashboard.outcomes,
          timeSeries: campaignDashboard.timeSeries,
          visualization: campaignDashboard.visualization,
        );
    if (granularity == 'week' && weekTimeSeries != null) {
      return AggregateDashboard(
        scope: base.scope,
        progress: base.progress,
        measurements: base.measurements,
        outcomes: base.outcomes,
        timeSeries: weekTimeSeries!,
        visualization: base.visualization,
      );
    }
    return base;
  }

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

  String? lastExportedReportKind;

  @override
  Future<AggregateReport> getCommunityReport({
    required String campaignId,
    required String communityId,
  }) async {
    return AggregateReport(
      scope: 'community',
      campaignId: campaignId,
      communityId: communityId,
      generatedAt: campaignReport.generatedAt,
      participantCount: campaignReport.participantCount,
      committedParticipantCount: campaignReport.committedParticipantCount,
      units: campaignReport.units,
    );
  }

  @override
  Future<String> exportCommunityReportCsv({
    required String campaignId,
    required String communityId,
  }) async {
    lastExportedReportKind = 'community';
    return 'scope,campaignId,communityId\ncommunity,$campaignId,$communityId\n';
  }
}
