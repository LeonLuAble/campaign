import 'package:dio/dio.dart';

import 'errors.dart';
import 'locale.dart';
import 'models.dart';
import 'token_store.dart';

typedef LocaleProvider = String Function();

abstract class CampaignApiClient {
  Future<SetupStatus> getSetupStatus();
  Future<TokenPair> completeSetup({
    required String setupKey,
    required String email,
    required String password,
    String? displayName,
  });
  Future<TokenPair> login({required String identifier, required String password});
  Future<TokenPair> socialLogin({
    required String provider,
    required String idToken,
  });
  Future<void> logout({bool revokeFamily = true});
  Future<void> activate({required String token, String? password});
  Future<void> resendActivation(String identifier);
  Future<void> requestPasswordReset(String identifier);
  Future<void> confirmPasswordReset({
    required String token,
    required String password,
  });
  Future<UserProfile> getMe();
  Future<UserProfile> updateMe({String? locale, String? timezone});
  Future<NotificationPreferences> getNotificationPreferences();
  Future<NotificationPreferences> updateNotificationPreferences({
    bool? inAppEnabled,
    bool? emailEnabled,
    bool? smsEnabled,
    bool? pushEnabled,
    bool? remindersEnabled,
    String? reminderLocalTime,
  });

  Future<List<Customer>> listCustomers();
  Future<Customer> getCustomer(String customerId);
  Future<Customer> createCustomer({
    required String name,
    String? initialAdminUserId,
    CreateCustomerInitialAdmin? initialAdmin,
  });
  Future<Customer> updateCustomer(
    String customerId, {
    String? name,
    bool? isActive,
  });
  Future<List<PlatformCustomerSummary>> listPlatformCustomers();
  Future<PlatformAdminInviteResult> invitePlatformAdmin(
    String customerId, {
    required String email,
    String? displayName,
    String? locale,
  });
  Future<void> resendPlatformAdminActivation(
    String customerId,
    String userId,
  );

  Future<List<Community>> listCommunities(String customerId);
  Future<Community> createCommunity({
    required String customerId,
    required String name,
    String? parentId,
  });
  /// When [updateParent] is true, send [parentId] (null = move to root).
  Future<Community> updateCommunity(
    String communityId, {
    String? name,
    bool? isActive,
    bool updateParent = false,
    String? parentId,
  });

  Future<MembershipListPage> listMemberships(
    String customerId, {
    String? q,
    String? communityId,
    bool? includeDescendants,
    String? roleKey,
    String? status,
    int? limit,
    String? cursor,
  });
  Future<CustomerAccess> getCustomerAccess(String customerId);
  Future<MembershipInvitationResult> inviteMembership({
    required String customerId,
    String? email,
    String? mobile,
    String? displayName,
    String? communityId,
    List<String>? roleKeys,
  });
  Future<ResendMembershipActivationResult> resendMembershipActivation(
    String membershipId,
  );
  Future<Membership> getMembership(String membershipId);
  Future<Membership> updateMembership(
    String membershipId, {
    required bool isActive,
  });
  Future<List<RoleSummary>> assignMembershipRole(
    String membershipId,
    String roleId,
  );
  Future<List<RoleSummary>> unassignMembershipRole(
    String membershipId,
    String roleId,
  );
  Future<List<Role>> listRoles(String customerId);
  Future<Role> getRole(String roleId);

  Future<List<UserImport>> listUserImports(String customerId);
  Future<UserImport> getUserImport(String userImportId);
  Future<UserImport> uploadUserImport({
    required String customerId,
    required String filename,
    required List<int> bytes,
    String? communityId,
  });
  Future<UserImport> mapUserImport(
    String userImportId, {
    required Map<String, String> mapping,
  });
  Future<UserImport> validateUserImport(String userImportId);
  Future<UserImportPreview> previewUserImport(String userImportId);
  Future<UserImport> confirmUserImport(String userImportId);
  Future<List<UserImportRow>> listUserImportRows(String userImportId);

  Future<List<CampaignTemplate>> listTemplates(String customerId);
  Future<List<CampaignScope>> listScopes(
    String customerId, {
    String? templateId,
  });
  Future<List<Campaign>> listCampaigns(String customerId);
  Future<Campaign> getCampaign(String campaignId);
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
  });
  Future<Campaign> publishCampaign(String campaignId);
  Future<Campaign> startCampaign(String campaignId);
  Future<Campaign> completeCampaign(String campaignId);

  Future<List<Participation>> listParticipations(String campaignId);
  Future<Participation> joinCampaign(String campaignId);
  Future<Participation> withdrawParticipation(String participationId);

  Future<CommitmentOptions> getCommitmentOptions(String campaignId);
  Future<List<Commitment>> listCommitments(String participationId);
  Future<Commitment> createCommitment({
    required String participationId,
    String? typeKey,
    required num targetValue,
    required String unit,
  });

  Future<List<ActionDefinition>> listActionDefinitions(String campaignId);
  Future<List<RecordedAction>> listCampaignActions(String campaignId);
  Future<List<RecordedAction>> listParticipationActions(String participationId);
  Future<RecordedAction> recordAction({
    required String participationId,
    required String actionDefinitionId,
    String? occurredOn,
    num? quantity,
    String? idempotencyKey,
  });
  Future<RecordedAction> cancelAction(String actionId);
  Future<Submission> rejectSubmission(String submissionId, {String? note});

  Future<ParticipantProgress> getProgress(String participationId);
  Future<ParticipantDashboard> getParticipantDashboard(String participationId);
  Future<AggregateDashboard> getCampaignDashboard(String campaignId);
  Future<AggregateDashboard> getCommunityDashboard({
    required String campaignId,
    required String communityId,
  });
  Future<VisualizationData> getVisualizationData(String campaignId);

  Future<List<InboxNotification>> listNotifications(String customerId);
  Future<InboxNotification> markNotificationRead({
    required String customerId,
    required String notificationId,
  });

  Future<List<ImpactFactor>> listImpactFactors({
    required String customerId,
    String? campaignId,
  });
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
  });

  Future<AggregateReport> getCampaignReport(String campaignId);
  Future<String> exportCampaignReportCsv(String campaignId);
}

class HttpCampaignApiClient implements CampaignApiClient {
  HttpCampaignApiClient({
    required this.baseUrl,
    required TokenStore tokenStore,
    LocaleProvider? localeProvider,
    void Function()? onSessionExpired,
    Dio? dio,
    Dio? refreshDio,
  }) : _tokens = tokenStore,
       _localeProvider = localeProvider ?? (() => kApiLocaleEn),
       _onSessionExpired = onSessionExpired,
       _http = dio ?? Dio(BaseOptions(baseUrl: _normalizeBase(baseUrl))),
       _refreshHttp =
           refreshDio ?? Dio(BaseOptions(baseUrl: _normalizeBase(baseUrl))) {
    _http.interceptors.add(
      _AuthInterceptor(
        dio: _http,
        tokenStore: _tokens,
        localeProvider: _localeProvider,
        refresh: _refreshTokens,
        onSessionExpired: _handleSessionExpired,
      ),
    );
  }

  final String baseUrl;
  final TokenStore _tokens;
  final LocaleProvider _localeProvider;
  final void Function()? _onSessionExpired;
  final Dio _http;
  final Dio _refreshHttp;
  Future<TokenPair>? _refreshInFlight;

  static String _normalizeBase(String url) {
    if (url.endsWith('/')) {
      return url.substring(0, url.length - 1);
    }
    return url;
  }

  Future<void> _handleSessionExpired() async {
    await _tokens.clear();
    _onSessionExpired?.call();
  }

  Future<TokenPair> _refreshTokens() {
    return _refreshInFlight ??= _doRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
  }

  Future<TokenPair> _doRefresh() async {
    final refreshToken = await _tokens.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw ApiException(
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Not signed in',
      );
    }
    try {
      final response = await _refreshHttp.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final pair = TokenPair.fromJson(response.data ?? const {});
      await _tokens.writeTokens(
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
      );
      return pair;
    } catch (error) {
      final apiError = error is DioException ? _toApiException(error) : error;
      if (apiError is ApiException &&
          (apiError.isTokenReused ||
              apiError.code == 'TOKEN_INVALID' ||
              apiError.code == 'TOKEN_EXPIRED' ||
              apiError.statusCode == 401)) {
        await _handleSessionExpired();
      }
      throw apiError;
    }
  }

  @override
  Future<SetupStatus> getSetupStatus() async {
    final data = await _request('GET', '/setup/status', skipAuth: true);
    return SetupStatus.fromJson(_asMap(data));
  }

  @override
  Future<TokenPair> completeSetup({
    required String setupKey,
    required String email,
    required String password,
    String? displayName,
  }) async {
    final pair = await _post(
      '/setup/admin',
      data: {
        'setupKey': setupKey,
        'email': email,
        'password': password,
        if (displayName != null && displayName.trim().isNotEmpty)
          'displayName': displayName.trim(),
      },
      parser: TokenPair.fromJson,
      skipAuth: true,
    );
    await _tokens.writeTokens(
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
    );
    return pair;
  }

  @override
  Future<TokenPair> login({
    required String identifier,
    required String password,
  }) async {
    final pair = await _post(
      '/auth/login',
      data: {'identifier': identifier, 'password': password},
      parser: TokenPair.fromJson,
      skipAuth: true,
    );
    await _tokens.writeTokens(
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
    );
    return pair;
  }

  @override
  Future<TokenPair> socialLogin({
    required String provider,
    required String idToken,
  }) async {
    final pair = await _post(
      '/auth/social',
      data: {'provider': provider, 'idToken': idToken},
      parser: TokenPair.fromJson,
      skipAuth: true,
    );
    await _tokens.writeTokens(
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
    );
    return pair;
  }

  @override
  Future<void> logout({bool revokeFamily = true}) async {
    final refreshToken = await _tokens.readRefreshToken();
    if (refreshToken != null) {
      try {
        await _request(
          'POST',
          '/auth/logout',
          data: {'refreshToken': refreshToken, 'revokeFamily': revokeFamily},
        );
      } on ApiException {
        // Always clear local tokens.
      }
    }
    await _tokens.clear();
  }

  @override
  Future<void> activate({required String token, String? password}) {
    return _request(
      'POST',
      '/auth/activate',
      data: {
        'token': token,
        if (password != null && password.isNotEmpty) 'password': password,
      },
      skipAuth: true,
    );
  }

  @override
  Future<void> resendActivation(String identifier) {
    return _request(
      'POST',
      '/auth/activate/resend',
      data: {'identifier': identifier},
      skipAuth: true,
    );
  }

  @override
  Future<void> requestPasswordReset(String identifier) {
    return _request(
      'POST',
      '/auth/password-reset/request',
      data: {'identifier': identifier},
      skipAuth: true,
    );
  }

  @override
  Future<void> confirmPasswordReset({
    required String token,
    required String password,
  }) {
    return _request(
      'POST',
      '/auth/password-reset/confirm',
      data: {'token': token, 'password': password},
      skipAuth: true,
    );
  }

  @override
  Future<UserProfile> getMe() => _get('/me', parser: UserProfile.fromJson);

  @override
  Future<UserProfile> updateMe({String? locale, String? timezone}) {
    return _patch(
      '/me',
      data: {
        if (locale != null) 'locale': locale,
        if (timezone != null) 'timezone': timezone,
      },
      parser: UserProfile.fromJson,
    );
  }

  @override
  Future<NotificationPreferences> getNotificationPreferences() {
    return _get(
      '/me/notification-preferences',
      parser: NotificationPreferences.fromJson,
    );
  }

  @override
  Future<NotificationPreferences> updateNotificationPreferences({
    bool? inAppEnabled,
    bool? emailEnabled,
    bool? smsEnabled,
    bool? pushEnabled,
    bool? remindersEnabled,
    String? reminderLocalTime,
  }) {
    return _put(
      '/me/notification-preferences',
      data: {
        if (inAppEnabled != null) 'inAppEnabled': inAppEnabled,
        if (emailEnabled != null) 'emailEnabled': emailEnabled,
        if (smsEnabled != null) 'smsEnabled': smsEnabled,
        if (pushEnabled != null) 'pushEnabled': pushEnabled,
        if (remindersEnabled != null) 'remindersEnabled': remindersEnabled,
        if (reminderLocalTime != null) 'reminderLocalTime': reminderLocalTime,
      },
      parser: NotificationPreferences.fromJson,
    );
  }

  @override
  Future<List<Customer>> listCustomers() =>
      _getList('/customers', parser: Customer.fromJson);

  @override
  Future<Customer> getCustomer(String customerId) =>
      _get('/customers/$customerId', parser: Customer.fromJson);

  @override
  Future<Customer> createCustomer({
    required String name,
    String? initialAdminUserId,
    CreateCustomerInitialAdmin? initialAdmin,
  }) {
    return _post(
      '/customers',
      data: {
        'name': name,
        if (initialAdminUserId != null) 'initialAdminUserId': initialAdminUserId,
        if (initialAdmin != null) 'initialAdmin': initialAdmin.toJson(),
      },
      parser: Customer.fromJson,
    );
  }

  @override
  Future<Customer> updateCustomer(
    String customerId, {
    String? name,
    bool? isActive,
  }) {
    return _patch(
      '/customers/$customerId',
      data: {
        if (name != null) 'name': name,
        if (isActive != null) 'isActive': isActive,
      },
      parser: Customer.fromJson,
    );
  }

  @override
  Future<List<PlatformCustomerSummary>> listPlatformCustomers() {
    return _getList(
      '/platform/customers',
      parser: PlatformCustomerSummary.fromJson,
    );
  }

  @override
  Future<PlatformAdminInviteResult> invitePlatformAdmin(
    String customerId, {
    required String email,
    String? displayName,
    String? locale,
  }) {
    return _post(
      '/platform/customers/$customerId/admins',
      data: InvitePlatformAdminRequest(
        email: email,
        displayName: displayName,
        locale: locale,
      ).toJson(),
      parser: PlatformAdminInviteResult.fromJson,
    );
  }

  @override
  Future<void> resendPlatformAdminActivation(
    String customerId,
    String userId,
  ) {
    return _request(
      'POST',
      '/platform/customers/$customerId/admins/$userId/resend',
    );
  }

  @override
  Future<List<Community>> listCommunities(String customerId) {
    return _getList(
      '/communities',
      query: {'customerId': customerId},
      parser: Community.fromJson,
    );
  }

  @override
  Future<Community> createCommunity({
    required String customerId,
    required String name,
    String? parentId,
  }) {
    return _post(
      '/communities',
      data: {
        'customerId': customerId,
        'name': name,
        if (parentId != null) 'parentId': parentId,
      },
      parser: Community.fromJson,
    );
  }

  @override
  Future<Community> updateCommunity(
    String communityId, {
    String? name,
    bool? isActive,
    bool updateParent = false,
    String? parentId,
  }) {
    return _patch(
      '/communities/$communityId',
      data: {
        if (name != null) 'name': name,
        if (isActive != null) 'isActive': isActive,
        if (updateParent) 'parentId': parentId,
      },
      parser: Community.fromJson,
    );
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
  }) {
    return _get(
      '/memberships',
      query: {
        'customerId': customerId,
        if (q != null) 'q': q,
        if (communityId != null) 'communityId': communityId,
        if (includeDescendants != null)
          'includeDescendants': includeDescendants,
        if (roleKey != null) 'roleKey': roleKey,
        if (status != null) 'status': status,
        if (limit != null) 'limit': limit,
        if (cursor != null) 'cursor': cursor,
      },
      parser: MembershipListPage.fromJson,
    );
  }

  @override
  Future<CustomerAccess> getCustomerAccess(String customerId) {
    return _get(
      '/customers/$customerId/access',
      parser: CustomerAccess.fromJson,
    );
  }

  @override
  Future<MembershipInvitationResult> inviteMembership({
    required String customerId,
    String? email,
    String? mobile,
    String? displayName,
    String? communityId,
    List<String>? roleKeys,
  }) {
    return _post(
      '/memberships/invitations',
      data: {
        'customerId': customerId,
        if (email != null) 'email': email,
        if (mobile != null) 'mobile': mobile,
        if (displayName != null) 'displayName': displayName,
        if (communityId != null) 'communityId': communityId,
        if (roleKeys != null) 'roleKeys': roleKeys,
      },
      parser: MembershipInvitationResult.fromJson,
    );
  }

  @override
  Future<ResendMembershipActivationResult> resendMembershipActivation(
    String membershipId,
  ) {
    return _post(
      '/memberships/$membershipId/resend-activation',
      parser: ResendMembershipActivationResult.fromJson,
    );
  }

  @override
  Future<Membership> getMembership(String membershipId) {
    return _get('/memberships/$membershipId', parser: Membership.fromJson);
  }

  @override
  Future<Membership> updateMembership(
    String membershipId, {
    required bool isActive,
  }) {
    return _patch(
      '/memberships/$membershipId',
      data: {'isActive': isActive},
      parser: Membership.fromJson,
    );
  }

  @override
  Future<List<RoleSummary>> assignMembershipRole(
    String membershipId,
    String roleId,
  ) {
    return _postList(
      '/memberships/$membershipId/roles',
      data: {'roleId': roleId},
      parser: RoleSummary.fromJson,
    );
  }

  @override
  Future<List<RoleSummary>> unassignMembershipRole(
    String membershipId,
    String roleId,
  ) async {
    await _request('DELETE', '/memberships/$membershipId/roles/$roleId');
    return getMembership(membershipId).then((row) => row.roles);
  }

  @override
  Future<List<Role>> listRoles(String customerId) {
    return _getList(
      '/roles',
      query: {'customerId': customerId},
      parser: Role.fromJson,
    );
  }

  @override
  Future<Role> getRole(String roleId) {
    return _get('/roles/$roleId', parser: Role.fromJson);
  }

  @override
  Future<List<UserImport>> listUserImports(String customerId) {
    return _getList(
      '/user-imports',
      query: {'customerId': customerId},
      parser: UserImport.fromJson,
    );
  }

  @override
  Future<UserImport> getUserImport(String userImportId) {
    return _get('/user-imports/$userImportId', parser: UserImport.fromJson);
  }

  @override
  Future<UserImport> uploadUserImport({
    required String customerId,
    required String filename,
    required List<int> bytes,
    String? communityId,
  }) async {
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: filename),
    });
    return _post(
      '/user-imports',
      query: {
        'customerId': customerId,
        if (communityId != null) 'communityId': communityId,
      },
      data: form,
      parser: UserImport.fromJson,
    );
  }

  @override
  Future<UserImport> mapUserImport(
    String userImportId, {
    required Map<String, String> mapping,
  }) {
    return _patch(
      '/user-imports/$userImportId/mapping',
      data: {'mapping': mapping},
      parser: UserImport.fromJson,
    );
  }

  @override
  Future<UserImport> validateUserImport(String userImportId) {
    return _post(
      '/user-imports/$userImportId/validate',
      parser: UserImport.fromJson,
    );
  }

  @override
  Future<UserImportPreview> previewUserImport(String userImportId) {
    return _get(
      '/user-imports/$userImportId/preview',
      parser: UserImportPreview.fromJson,
    );
  }

  @override
  Future<UserImport> confirmUserImport(String userImportId) {
    return _post(
      '/user-imports/$userImportId/confirm',
      parser: UserImport.fromJson,
    );
  }

  @override
  Future<List<UserImportRow>> listUserImportRows(String userImportId) {
    return _getList(
      '/user-imports/$userImportId/rows',
      parser: UserImportRow.fromJson,
    );
  }

  @override
  Future<List<CampaignTemplate>> listTemplates(String customerId) {
    return _getList(
      '/campaign-templates',
      query: {'customerId': customerId},
      parser: CampaignTemplate.fromJson,
    );
  }

  @override
  Future<List<CampaignScope>> listScopes(
    String customerId, {
    String? templateId,
  }) {
    return _getList(
      '/campaign-scopes',
      query: {
        'customerId': customerId,
        if (templateId != null) 'templateId': templateId,
      },
      parser: CampaignScope.fromJson,
    );
  }

  @override
  Future<List<Campaign>> listCampaigns(String customerId) {
    return _getList(
      '/campaigns',
      query: {'customerId': customerId},
      parser: Campaign.fromJson,
    );
  }

  @override
  Future<Campaign> getCampaign(String campaignId) {
    return _get('/campaigns/$campaignId', parser: Campaign.fromJson);
  }

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
  }) {
    return _post(
      '/campaigns',
      data: {
        'customerId': customerId,
        'templateId': templateId,
        'scopeId': scopeId,
        'name': name,
        'timezone': timezone,
        if (description != null) 'description': description,
        if (startsOn != null) 'startsOn': startsOn,
        if (endsOn != null) 'endsOn': endsOn,
        if (communityIds != null) 'communityIds': communityIds,
        if (configuration != null) 'configuration': configuration,
      },
      parser: Campaign.fromJson,
    );
  }

  @override
  Future<Campaign> publishCampaign(String campaignId) {
    return _post('/campaigns/$campaignId/publish', parser: Campaign.fromJson);
  }

  @override
  Future<Campaign> startCampaign(String campaignId) {
    return _post('/campaigns/$campaignId/start', parser: Campaign.fromJson);
  }

  @override
  Future<Campaign> completeCampaign(String campaignId) {
    return _post('/campaigns/$campaignId/complete', parser: Campaign.fromJson);
  }

  @override
  Future<List<Participation>> listParticipations(String campaignId) {
    return _getList(
      '/campaigns/$campaignId/participations',
      parser: Participation.fromJson,
    );
  }

  @override
  Future<Participation> joinCampaign(String campaignId) {
    return _post(
      '/campaigns/$campaignId/participations',
      data: const <String, dynamic>{},
      parser: Participation.fromJson,
    );
  }

  @override
  Future<Participation> withdrawParticipation(String participationId) {
    return _post(
      '/participations/$participationId/withdraw',
      parser: Participation.fromJson,
    );
  }

  @override
  Future<CommitmentOptions> getCommitmentOptions(String campaignId) {
    return _get(
      '/campaigns/$campaignId/commitment-options',
      parser: CommitmentOptions.fromJson,
    );
  }

  @override
  Future<List<Commitment>> listCommitments(String participationId) {
    return _getList(
      '/participations/$participationId/commitments',
      parser: Commitment.fromJson,
    );
  }

  @override
  Future<Commitment> createCommitment({
    required String participationId,
    String? typeKey,
    required num targetValue,
    required String unit,
  }) {
    return _post(
      '/participations/$participationId/commitments',
      data: {
        if (typeKey != null) 'typeKey': typeKey,
        'targetValue': targetValue,
        'unit': unit,
      },
      parser: Commitment.fromJson,
    );
  }

  @override
  Future<List<ActionDefinition>> listActionDefinitions(String campaignId) {
    return _getList(
      '/campaigns/$campaignId/action-definitions',
      parser: ActionDefinition.fromJson,
    );
  }

  @override
  Future<List<RecordedAction>> listCampaignActions(String campaignId) {
    return _getList(
      '/campaigns/$campaignId/actions',
      parser: RecordedAction.fromJson,
    );
  }

  @override
  Future<List<RecordedAction>> listParticipationActions(String participationId) {
    return _getList(
      '/participations/$participationId/actions',
      parser: RecordedAction.fromJson,
    );
  }

  @override
  Future<RecordedAction> recordAction({
    required String participationId,
    required String actionDefinitionId,
    String? occurredOn,
    num? quantity,
    String? idempotencyKey,
  }) {
    return _post(
      '/actions',
      data: {
        'participationId': participationId,
        'actionDefinitionId': actionDefinitionId,
        if (occurredOn != null) 'occurredOn': occurredOn,
        if (quantity != null) 'quantity': quantity,
        if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
      },
      parser: RecordedAction.fromJson,
    );
  }

  @override
  Future<RecordedAction> cancelAction(String actionId) {
    return _post('/actions/$actionId/cancel', parser: RecordedAction.fromJson);
  }

  @override
  Future<Submission> rejectSubmission(String submissionId, {String? note}) {
    return _post(
      '/submissions/$submissionId/reject',
      data: {if (note != null) 'note': note},
      parser: Submission.fromJson,
    );
  }

  @override
  Future<ParticipantProgress> getProgress(String participationId) {
    return _get(
      '/participations/$participationId/progress',
      parser: ParticipantProgress.fromJson,
    );
  }

  @override
  Future<ParticipantDashboard> getParticipantDashboard(String participationId) {
    return _get(
      '/participations/$participationId/dashboard',
      parser: ParticipantDashboard.fromJson,
    );
  }

  @override
  Future<AggregateDashboard> getCampaignDashboard(String campaignId) {
    return _get(
      '/campaigns/$campaignId/dashboard',
      parser: AggregateDashboard.fromJson,
    );
  }

  @override
  Future<AggregateDashboard> getCommunityDashboard({
    required String campaignId,
    required String communityId,
  }) {
    return _get(
      '/campaigns/$campaignId/communities/$communityId/dashboard',
      parser: AggregateDashboard.fromJson,
    );
  }

  @override
  Future<VisualizationData> getVisualizationData(String campaignId) {
    return _get(
      '/campaigns/$campaignId/visualization/data',
      parser: VisualizationData.fromJson,
    );
  }

  @override
  Future<List<InboxNotification>> listNotifications(String customerId) {
    return _getList(
      '/notifications',
      query: {'customerId': customerId},
      parser: InboxNotification.fromJson,
    );
  }

  @override
  Future<InboxNotification> markNotificationRead({
    required String customerId,
    required String notificationId,
  }) {
    return _post(
      '/notifications/$notificationId/read',
      query: {'customerId': customerId},
      parser: InboxNotification.fromJson,
    );
  }

  @override
  Future<List<ImpactFactor>> listImpactFactors({
    required String customerId,
    String? campaignId,
  }) {
    return _getList(
      '/impact-factors',
      query: {
        'customerId': customerId,
        if (campaignId != null) 'campaignId': campaignId,
      },
      parser: ImpactFactor.fromJson,
    );
  }

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
  }) {
    return _post(
      '/impact-factors',
      data: {
        'customerId': customerId,
        if (campaignId != null) 'campaignId': campaignId,
        'sourceUnit': sourceUnit,
        'outcomeMetric': outcomeMetric,
        'outcomeUnit': outcomeUnit,
        'factorValue': factorValue,
        'source': source,
        'effectiveFrom': effectiveFrom,
        if (effectiveTo != null) 'effectiveTo': effectiveTo,
      },
      parser: ImpactFactor.fromJson,
    );
  }

  @override
  Future<AggregateReport> getCampaignReport(String campaignId) {
    return _get(
      '/campaigns/$campaignId/report',
      parser: AggregateReport.fromJson,
    );
  }

  @override
  Future<String> exportCampaignReportCsv(String campaignId) async {
    try {
      final response = await _http.get<dynamic>(
        '/campaigns/$campaignId/report/export',
        options: Options(responseType: ResponseType.plain),
      );
      return response.data?.toString() ?? '';
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Future<T> _get<T>(
    String path, {
    Map<String, dynamic>? query,
    required T Function(Map<String, dynamic> json) parser,
  }) async {
    final data = await _request('GET', path, query: query);
    return parser(_asMap(data));
  }

  Future<List<T>> _getList<T>(
    String path, {
    Map<String, dynamic>? query,
    required T Function(Map<String, dynamic> json) parser,
  }) async {
    final data = await _request('GET', path, query: query);
    if (data is List) {
      return data.map((row) => parser(_asMap(row))).toList();
    }
    return const [];
  }

  Future<T> _post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    required T Function(Map<String, dynamic> json) parser,
    bool skipAuth = false,
  }) async {
    final body = await _request(
      'POST',
      path,
      data: data,
      query: query,
      skipAuth: skipAuth,
    );
    return parser(_asMap(body));
  }

  Future<List<T>> _postList<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    required T Function(Map<String, dynamic> json) parser,
  }) async {
    final body = await _request('POST', path, data: data, query: query);
    if (body is List) {
      return body.map((row) => parser(_asMap(row))).toList();
    }
    return const [];
  }

  Future<T> _patch<T>(
    String path, {
    Object? data,
    required T Function(Map<String, dynamic> json) parser,
  }) async {
    final body = await _request('PATCH', path, data: data);
    return parser(_asMap(body));
  }

  Future<T> _put<T>(
    String path, {
    Object? data,
    required T Function(Map<String, dynamic> json) parser,
  }) async {
    final body = await _request('PUT', path, data: data);
    return parser(_asMap(body));
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    bool skipAuth = false,
  }) async {
    try {
      final response = await _http.request<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: Options(
          method: method,
          extra: {if (skipAuth) 'skipAuth': true},
        ),
      );
      return response.data;
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map((key, item) => MapEntry(key.toString(), item));
    }
    return <String, dynamic>{};
  }
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor({
    required this.dio,
    required this.tokenStore,
    required this.localeProvider,
    required this.refresh,
    required this.onSessionExpired,
  });

  final Dio dio;
  final TokenStore tokenStore;
  final LocaleProvider localeProvider;
  final Future<TokenPair> Function() refresh;
  final Future<void> Function() onSessionExpired;

  static const _retryFlag = 'authRetried';

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    options.headers['Accept-Language'] = toApiLocale(localeProvider());
    options.headers.putIfAbsent('x-request-id', () => _requestId());
    final skip = options.extra['skipAuth'] == true;
    if (!skip) {
      final access = await tokenStore.readAccessToken();
      if (access != null && access.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $access';
      }
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final status = err.response?.statusCode;
    final skipped = err.requestOptions.extra['skipAuth'] == true;
    final retried = err.requestOptions.extra[_retryFlag] == true;
    if (status != 401 || skipped || retried) {
      handler.next(err);
      return;
    }
    final envelope = err.response?.data;
    if (envelope is Map && envelope['code'] == 'TOKEN_REUSED') {
      await onSessionExpired();
      handler.next(err);
      return;
    }
    try {
      final pair = await refresh();
      final request = err.requestOptions;
      request.headers['Authorization'] = 'Bearer ${pair.accessToken}';
      request.extra[_retryFlag] = true;
      final response = await dio.fetch<dynamic>(request);
      handler.resolve(response);
    } catch (_) {
      handler.next(err);
    }
  }

  String _requestId() {
    return '${DateTime.now().microsecondsSinceEpoch}';
  }
}

ApiException _toApiException(DioException error) {
  final data = error.response?.data;
  if (data is Map) {
    return ApiException.fromJson(
      data.map((key, value) => MapEntry(key.toString(), value)),
      statusCode: error.response?.statusCode,
    );
  }
  if (error.error is ApiException) {
    return error.error! as ApiException;
  }
  return ApiException(
    statusCode: error.response?.statusCode ?? 0,
    code: error.response?.statusCode == 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR',
    message: error.message ?? 'Request failed',
  );
}
