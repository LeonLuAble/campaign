num _num(dynamic value, [num fallback = 0]) {
  if (value is num) {
    return value;
  }
  return fallback;
}

String? _string(dynamic value) => value as String?;

bool _bool(dynamic value, [bool fallback = false]) {
  if (value is bool) {
    return value;
  }
  return fallback;
}

Map<String, dynamic> _map(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return <String, dynamic>{};
}

List<dynamic> _list(dynamic value) {
  if (value is List) {
    return value;
  }
  return const [];
}

class SetupStatus {
  const SetupStatus({required this.setupRequired});

  final bool setupRequired;

  factory SetupStatus.fromJson(Map<String, dynamic> json) {
    return SetupStatus(setupRequired: json['setupRequired'] == true);
  }
}

class TokenPair {
  const TokenPair({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;

  factory TokenPair.fromJson(Map<String, dynamic> json) {
    return TokenPair(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }
}

class UserIdentity {
  const UserIdentity({
    required this.id,
    required this.type,
    required this.identifier,
    required this.isVerified,
  });

  final String id;
  final String type;
  final String identifier;
  final bool isVerified;

  factory UserIdentity.fromJson(Map<String, dynamic> json) {
    return UserIdentity(
      id: json['id'] as String,
      type: json['type'] as String,
      identifier: json['identifier'] as String,
      isVerified: _bool(json['isVerified']),
    );
  }
}

class UserProfile {
  const UserProfile({
    required this.id,
    required this.isActive,
    required this.isPlatformAdmin,
    required this.identities,
    this.firstName,
    this.lastName,
    this.displayName,
    this.locale,
    this.timezone,
  });

  final String id;
  final String? firstName;
  final String? lastName;
  final String? displayName;
  final String? locale;
  final String? timezone;
  final bool isActive;
  final bool isPlatformAdmin;
  final List<UserIdentity> identities;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      firstName: _string(json['firstName']),
      lastName: _string(json['lastName']),
      displayName: _string(json['displayName']),
      locale: _string(json['locale']),
      timezone: _string(json['timezone']),
      isActive: _bool(json['isActive'], true),
      isPlatformAdmin: _bool(json['isPlatformAdmin']),
      identities: _list(json['identities'])
          .map((row) => UserIdentity.fromJson(_map(row)))
          .toList(),
    );
  }
}

class NotificationPreferences {
  const NotificationPreferences({
    required this.userId,
    required this.inAppEnabled,
    required this.emailEnabled,
    required this.smsEnabled,
    required this.pushEnabled,
    required this.remindersEnabled,
    required this.reminderLocalTime,
  });

  final String userId;
  final bool inAppEnabled;
  final bool emailEnabled;
  final bool smsEnabled;
  final bool pushEnabled;
  final bool remindersEnabled;
  final String reminderLocalTime;

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    return NotificationPreferences(
      userId: json['userId'] as String,
      inAppEnabled: _bool(json['inAppEnabled'], true),
      emailEnabled: _bool(json['emailEnabled'], true),
      smsEnabled: _bool(json['smsEnabled']),
      pushEnabled: _bool(json['pushEnabled']),
      remindersEnabled: _bool(json['remindersEnabled'], true),
      reminderLocalTime: json['reminderLocalTime'] as String? ?? '09:00',
    );
  }
}

class Customer {
  const Customer({
    required this.id,
    required this.name,
    required this.slug,
    required this.isActive,
    this.activationToken,
  });

  final String id;
  final String name;
  final String slug;
  final bool isActive;
  final String? activationToken;

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String? ?? '',
      isActive: _bool(json['isActive'], true),
      activationToken: json['activationToken'] as String?,
    );
  }
}

class CreateCustomerInitialAdmin {
  const CreateCustomerInitialAdmin({
    required this.email,
    this.displayName,
    this.locale,
  });

  final String email;
  final String? displayName;
  final String? locale;

  Map<String, dynamic> toJson() => {
        'email': email,
        if (displayName != null && displayName!.trim().isNotEmpty)
          'displayName': displayName!.trim(),
        if (locale != null && locale!.trim().isNotEmpty) 'locale': locale!.trim(),
      };
}

class PlatformCustomerSummary {
  const PlatformCustomerSummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.isActive,
    required this.createdAt,
    required this.adminCount,
    required this.pendingAdminInvites,
  });

  final String id;
  final String name;
  final String slug;
  final bool isActive;
  final String createdAt;
  final int adminCount;
  final int pendingAdminInvites;

  factory PlatformCustomerSummary.fromJson(Map<String, dynamic> json) {
    return PlatformCustomerSummary(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      isActive: _bool(json['isActive'], true),
      createdAt: json['createdAt'] as String? ?? '',
      adminCount: (json['adminCount'] as num?)?.toInt() ?? 0,
      pendingAdminInvites: (json['pendingAdminInvites'] as num?)?.toInt() ?? 0,
    );
  }
}

class InvitePlatformAdminRequest {
  const InvitePlatformAdminRequest({
    required this.email,
    this.displayName,
    this.locale,
  });

  final String email;
  final String? displayName;
  final String? locale;

  Map<String, dynamic> toJson() => {
        'email': email,
        if (displayName != null && displayName!.trim().isNotEmpty)
          'displayName': displayName!.trim(),
        if (locale != null && locale!.trim().isNotEmpty) 'locale': locale!.trim(),
      };
}

class PlatformAdminInviteResult {
  const PlatformAdminInviteResult({
    required this.customerId,
    required this.userId,
    required this.email,
    required this.activationStatus,
    this.activationToken,
  });

  final String customerId;
  final String userId;
  final String email;
  final String activationStatus;
  final String? activationToken;

  factory PlatformAdminInviteResult.fromJson(Map<String, dynamic> json) {
    return PlatformAdminInviteResult(
      customerId: json['customerId'] as String,
      userId: json['userId'] as String,
      email: json['email'] as String,
      activationStatus: json['activationStatus'] as String? ?? 'pending',
      activationToken: _string(json['activationToken']),
    );
  }
}

class Community {
  const Community({
    required this.id,
    required this.customerId,
    required this.name,
    required this.slug,
    required this.isActive,
    this.parentId,
  });

  final String id;
  final String customerId;
  final String? parentId;
  final String name;
  final String slug;
  final bool isActive;

  factory Community.fromJson(Map<String, dynamic> json) {
    return Community(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      parentId: _string(json['parentId']),
      name: json['name'] as String,
      slug: json['slug'] as String? ?? '',
      isActive: _bool(json['isActive'], true),
    );
  }
}

class RoleSummary {
  const RoleSummary({
    required this.id,
    required this.key,
    required this.name,
  });

  final String id;
  final String key;
  final String name;

  factory RoleSummary.fromJson(Map<String, dynamic> json) {
    return RoleSummary(
      id: json['id'] as String,
      key: json['key'] as String,
      name: json['name'] as String,
    );
  }
}

class Role {
  const Role({
    required this.id,
    required this.customerId,
    required this.key,
    required this.name,
    required this.isSystem,
    required this.permissionKeys,
    this.description,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String customerId;
  final String key;
  final String name;
  final String? description;
  final bool isSystem;
  final List<String> permissionKeys;
  final String? createdAt;
  final String? updatedAt;

  factory Role.fromJson(Map<String, dynamic> json) {
    return Role(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      key: json['key'] as String,
      name: json['name'] as String,
      description: _string(json['description']),
      isSystem: _bool(json['isSystem'], false),
      permissionKeys: _list(json['permissionKeys'])
          .map((row) => row.toString())
          .toList(),
      createdAt: _string(json['createdAt']),
      updatedAt: _string(json['updatedAt']),
    );
  }

  RoleSummary get summary => RoleSummary(id: id, key: key, name: name);
}

class MembershipUserSummary {
  const MembershipUserSummary({
    required this.id,
    required this.activationStatus,
    this.displayName,
    this.email,
    this.mobile,
  });

  final String id;
  final String? displayName;
  final String? email;
  final String? mobile;
  final String activationStatus;

  factory MembershipUserSummary.fromJson(Map<String, dynamic> json) {
    return MembershipUserSummary(
      id: json['id'] as String,
      displayName: _string(json['displayName']),
      email: _string(json['email']),
      mobile: _string(json['mobile']),
      activationStatus: json['activationStatus'] as String? ?? 'pending',
    );
  }
}

class MembershipCommunitySummary {
  const MembershipCommunitySummary({required this.id, required this.name});

  final String id;
  final String name;

  factory MembershipCommunitySummary.fromJson(Map<String, dynamic> json) {
    return MembershipCommunitySummary(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
}

class Membership {
  const Membership({
    required this.id,
    required this.customerId,
    required this.userId,
    required this.isActive,
    required this.roles,
    this.communityId,
    this.user,
    this.community,
  });

  final String id;
  final String customerId;
  final String userId;
  final String? communityId;
  final bool isActive;
  final List<RoleSummary> roles;
  final MembershipUserSummary? user;
  final MembershipCommunitySummary? community;

  factory Membership.fromJson(Map<String, dynamic> json) {
    return Membership(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      userId: json['userId'] as String,
      communityId: _string(json['communityId']),
      isActive: _bool(json['isActive'], true),
      roles: _list(json['roles'])
          .map((row) => RoleSummary.fromJson(_map(row)))
          .toList(),
      user: json['user'] is Map
          ? MembershipUserSummary.fromJson(_map(json['user']))
          : null,
      community: json['community'] is Map
          ? MembershipCommunitySummary.fromJson(_map(json['community']))
          : null,
    );
  }
}

class MembershipListPage {
  const MembershipListPage({required this.items, this.nextCursor});

  final List<Membership> items;
  final String? nextCursor;

  factory MembershipListPage.fromJson(Map<String, dynamic> json) {
    return MembershipListPage(
      items: _list(json['items']).map((row) => Membership.fromJson(_map(row))).toList(),
      nextCursor: _string(json['nextCursor']),
    );
  }
}

class MembershipInvitationResult {
  const MembershipInvitationResult({
    required this.membershipId,
    required this.userId,
    required this.customerId,
    required this.activationStatus,
    required this.created,
    this.communityId,
    this.email,
    this.mobile,
    this.activationLink,
  });

  final String membershipId;
  final String userId;
  final String customerId;
  final String? communityId;
  final String? email;
  final String? mobile;
  final String activationStatus;
  final bool created;
  final String? activationLink;

  factory MembershipInvitationResult.fromJson(Map<String, dynamic> json) {
    return MembershipInvitationResult(
      membershipId: json['membershipId'] as String,
      userId: json['userId'] as String,
      customerId: json['customerId'] as String,
      communityId: _string(json['communityId']),
      email: _string(json['email']),
      mobile: _string(json['mobile']),
      activationStatus: json['activationStatus'] as String? ?? 'pending',
      created: _bool(json['created'], false),
      activationLink: _string(json['activationLink']),
    );
  }
}

class ResendMembershipActivationResult {
  const ResendMembershipActivationResult({
    required this.accepted,
    this.activationLink,
  });

  final bool accepted;
  final String? activationLink;

  factory ResendMembershipActivationResult.fromJson(Map<String, dynamic> json) {
    return ResendMembershipActivationResult(
      accepted: _bool(json['accepted'], true),
      activationLink: _string(json['activationLink']),
    );
  }
}

class CustomerAccess {
  const CustomerAccess({
    required this.roles,
    required this.permissionKeys,
    required this.isTenantLevel,
    required this.communityIds,
  });

  final List<RoleSummary> roles;
  final List<String> permissionKeys;
  final bool isTenantLevel;
  final List<String> communityIds;

  factory CustomerAccess.fromJson(Map<String, dynamic> json) {
    return CustomerAccess(
      roles: _list(json['roles'])
          .map((row) => RoleSummary.fromJson(_map(row)))
          .toList(),
      permissionKeys: _list(json['permissionKeys'])
          .map((row) => row.toString())
          .toList(),
      isTenantLevel: _bool(json['isTenantLevel'], false),
      communityIds: _list(json['communityIds'])
          .map((row) => row.toString())
          .toList(),
    );
  }
}

class UserImportCounts {
  const UserImportCounts({
    required this.total,
    required this.pending,
    required this.valid,
    required this.invalid,
    required this.review,
    required this.created,
    required this.matched,
  });

  final int total;
  final int pending;
  final int valid;
  final int invalid;
  final int review;
  final int created;
  final int matched;

  factory UserImportCounts.fromJson(Map<String, dynamic> json) {
    return UserImportCounts(
      total: _num(json['total']).toInt(),
      pending: _num(json['pending']).toInt(),
      valid: _num(json['valid']).toInt(),
      invalid: _num(json['invalid']).toInt(),
      review: _num(json['review']).toInt(),
      created: _num(json['created']).toInt(),
      matched: _num(json['matched']).toInt(),
    );
  }
}

class UserImport {
  const UserImport({
    required this.id,
    required this.customerId,
    required this.originalFilename,
    required this.status,
    required this.headers,
    required this.counts,
    this.communityId,
    this.mapping,
    this.createdAt,
    this.updatedAt,
    this.confirmedAt,
  });

  final String id;
  final String customerId;
  final String? communityId;
  final String originalFilename;
  final String status;
  final List<String> headers;
  final Map<String, String>? mapping;
  final UserImportCounts counts;
  final String? createdAt;
  final String? updatedAt;
  final String? confirmedAt;

  factory UserImport.fromJson(Map<String, dynamic> json) {
    final rawMapping = json['mapping'];
    return UserImport(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      communityId: _string(json['communityId']),
      originalFilename: json['originalFilename'] as String? ?? '',
      status: json['status'] as String,
      headers: _list(json['headers']).map((row) => row.toString()).toList(),
      mapping: rawMapping is Map
          ? rawMapping.map(
              (key, value) => MapEntry(key.toString(), value?.toString() ?? ''),
            )
          : null,
      counts: UserImportCounts.fromJson(_map(json['counts'])),
      createdAt: _string(json['createdAt']),
      updatedAt: _string(json['updatedAt']),
      confirmedAt: _string(json['confirmedAt']),
    );
  }
}

class UserImportRow {
  const UserImportRow({
    required this.id,
    required this.rowNumber,
    required this.rawData,
    required this.status,
    this.externalId,
    this.email,
    this.mobile,
    this.errorCode,
    this.errorMessage,
  });

  final String id;
  final int rowNumber;
  final Map<String, String> rawData;
  final String status;
  final String? externalId;
  final String? email;
  final String? mobile;
  final String? errorCode;
  final String? errorMessage;

  factory UserImportRow.fromJson(Map<String, dynamic> json) {
    return UserImportRow(
      id: json['id'] as String,
      rowNumber: _num(json['rowNumber']).toInt(),
      rawData: _map(json['rawData']).map(
        (key, value) => MapEntry(key, value?.toString() ?? ''),
      ),
      status: json['status'] as String,
      externalId: _string(json['externalId']),
      email: _string(json['email']),
      mobile: _string(json['mobile']),
      errorCode: _string(json['errorCode']),
      errorMessage: _string(json['errorMessage']),
    );
  }
}

class UserImportPreview {
  const UserImportPreview({required this.importRecord, required this.rows});

  final UserImport importRecord;
  final List<UserImportRow> rows;

  factory UserImportPreview.fromJson(Map<String, dynamic> json) {
    return UserImportPreview(
      importRecord: UserImport.fromJson(_map(json['import'])),
      rows: _list(json['rows'])
          .map((row) => UserImportRow.fromJson(_map(row)))
          .toList(),
    );
  }
}

class CampaignTemplate {
  const CampaignTemplate({
    required this.id,
    required this.customerId,
    required this.key,
    required this.name,
    required this.isActive,
    this.description,
  });

  final String id;
  final String customerId;
  final String key;
  final String name;
  final String? description;
  final bool isActive;

  factory CampaignTemplate.fromJson(Map<String, dynamic> json) {
    return CampaignTemplate(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      key: json['key'] as String,
      name: json['name'] as String,
      description: _string(json['description']),
      isActive: _bool(json['isActive'], true),
    );
  }
}

class CampaignScope {
  const CampaignScope({
    required this.id,
    required this.customerId,
    required this.templateId,
    required this.key,
    required this.name,
    required this.isActive,
    this.description,
  });

  final String id;
  final String customerId;
  final String templateId;
  final String key;
  final String name;
  final String? description;
  final bool isActive;

  factory CampaignScope.fromJson(Map<String, dynamic> json) {
    return CampaignScope(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      templateId: json['templateId'] as String,
      key: json['key'] as String,
      name: json['name'] as String,
      description: _string(json['description']),
      isActive: _bool(json['isActive'], true),
    );
  }
}

class Campaign {
  const Campaign({
    required this.id,
    required this.customerId,
    required this.templateId,
    required this.scopeId,
    required this.name,
    required this.status,
    required this.timezone,
    required this.communityIds,
    required this.configuration,
    this.description,
    this.startsOn,
    this.endsOn,
  });

  final String id;
  final String customerId;
  final String templateId;
  final String scopeId;
  final String name;
  final String? description;
  final String status;
  final String timezone;
  final String? startsOn;
  final String? endsOn;
  final List<String> communityIds;
  final Map<String, dynamic> configuration;

  bool get isDraft => status == 'draft';
  bool get canJoin => status == 'published' || status == 'started';
  bool get canRecord => status == 'started';

  factory Campaign.fromJson(Map<String, dynamic> json) {
    return Campaign(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      templateId: json['templateId'] as String,
      scopeId: json['scopeId'] as String,
      name: json['name'] as String,
      description: _string(json['description']),
      status: json['status'] as String,
      timezone: json['timezone'] as String,
      startsOn: _string(json['startsOn']),
      endsOn: _string(json['endsOn']),
      communityIds: _list(json['communityIds']).map((row) => row.toString()).toList(),
      configuration: _map(json['configuration']),
    );
  }
}

class Participation {
  const Participation({
    required this.id,
    required this.customerId,
    required this.campaignId,
    required this.userId,
    required this.status,
    this.communityId,
    this.enrolmentSource = 'self',
    this.engagement = 'awaiting_commitment',
  });

  final String id;
  final String customerId;
  final String campaignId;
  final String userId;
  final String? communityId;
  final String status;
  final String enrolmentSource;
  final String engagement;

  bool get isEnrolled => status == 'enrolled';

  factory Participation.fromJson(Map<String, dynamic> json) {
    return Participation(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      campaignId: json['campaignId'] as String,
      userId: json['userId'] as String,
      communityId: _string(json['communityId']),
      status: json['status'] as String,
      enrolmentSource: (json['enrolmentSource'] as String?) ?? 'self',
      engagement: (json['engagement'] as String?) ??
          (json['status'] == 'withdrawn'
              ? 'withdrawn'
              : 'awaiting_commitment'),
    );
  }
}

class AutoEnrolSyncResult {
  const AutoEnrolSyncResult({
    required this.created,
    required this.alreadyEnrolled,
    required this.skipped,
  });

  final int created;
  final int alreadyEnrolled;
  final int skipped;

  factory AutoEnrolSyncResult.fromJson(Map<String, dynamic> json) {
    return AutoEnrolSyncResult(
      created: _num(json['created']).toInt(),
      alreadyEnrolled: _num(json['alreadyEnrolled']).toInt(),
      skipped: _num(json['skipped']).toInt(),
    );
  }
}

class CommitmentChoice {
  const CommitmentChoice({
    required this.key,
    required this.name,
    required this.canonicalUnit,
    required this.usesCampaignDuration,
    this.label,
    this.description,
    this.suggestedTarget,
  });

  final String key;
  final String name;
  final String? label;
  final String? description;
  final String canonicalUnit;
  final num? suggestedTarget;
  final bool usesCampaignDuration;

  factory CommitmentChoice.fromJson(Map<String, dynamic> json) {
    final name = json['name'] as String;
    return CommitmentChoice(
      key: json['key'] as String,
      name: name,
      label: _string(json['label']) ?? name,
      description: _string(json['description']) ?? '',
      canonicalUnit: json['canonicalUnit'] as String,
      suggestedTarget: json['suggestedTarget'] as num?,
      usesCampaignDuration: _bool(json['usesCampaignDuration']),
    );
  }
}

class RecommendedActionDefinition {
  const RecommendedActionDefinition({
    required this.key,
    required this.unit,
    required this.name,
  });

  final String key;
  final String unit;
  final String name;

  factory RecommendedActionDefinition.fromJson(Map<String, dynamic> json) {
    return RecommendedActionDefinition(
      key: json['key'] as String,
      unit: json['unit'] as String,
      name: json['name'] as String,
    );
  }
}

class CampaignRuleStrategy {
  const CampaignRuleStrategy({
    required this.key,
    required this.label,
    required this.description,
    required this.units,
    required this.reviewModes,
    required this.recommendedActionDefinitions,
  });

  final String key;
  final String label;
  final String description;
  final List<String> units;
  final List<String> reviewModes;
  final List<RecommendedActionDefinition> recommendedActionDefinitions;

  factory CampaignRuleStrategy.fromJson(Map<String, dynamic> json) {
    return CampaignRuleStrategy(
      key: json['key'] as String,
      label: json['label'] as String,
      description: json['description'] as String? ?? '',
      units: _list(json['units']).map((row) => row.toString()).toList(),
      reviewModes:
          _list(json['reviewModes']).map((row) => row.toString()).toList(),
      recommendedActionDefinitions: _list(json['recommendedActionDefinitions'])
          .map((row) => RecommendedActionDefinition.fromJson(_map(row)))
          .toList(),
    );
  }
}

class CampaignContentTranslations {
  const CampaignContentTranslations({this.en});

  final CampaignEnglishTranslations? en;

  Map<String, dynamic> toJson() => {
        if (en != null) 'en': en!.toJson(),
      };
}

class CampaignEnglishTranslations {
  const CampaignEnglishTranslations({
    this.name,
    this.description,
    this.treeDisplayName,
  });

  final String? name;
  final String? description;
  final String? treeDisplayName;

  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (description != null) 'description': description,
        if (treeDisplayName != null) 'treeDisplayName': treeDisplayName,
      };
}

class CommitmentOptions {
  const CommitmentOptions({
    required this.campaignId,
    required this.customerId,
    required this.strategy,
    required this.units,
    required this.choices,
  });

  final String campaignId;
  final String customerId;
  final String strategy;
  final List<String> units;
  final List<CommitmentChoice> choices;

  factory CommitmentOptions.fromJson(Map<String, dynamic> json) {
    return CommitmentOptions(
      campaignId: json['campaignId'] as String,
      customerId: json['customerId'] as String,
      strategy: json['strategy'] as String,
      units: _list(json['units']).map((row) => row.toString()).toList(),
      choices: _list(json['choices'])
          .map((row) => CommitmentChoice.fromJson(_map(row)))
          .toList(),
    );
  }
}

class CommitmentDecision {
  const CommitmentDecision._();

  static const committed = 'committed';
  static const notTakingPart = 'not_taking_part';
}

class Commitment {
  const Commitment({
    required this.id,
    required this.participationId,
    required this.targetValue,
    required this.unit,
    this.typeKey,
    this.decision = CommitmentDecision.committed,
  });

  final String id;
  final String participationId;
  final String? typeKey;

  /// 0 when [isNotTakingPart].
  final num targetValue;

  /// Empty when [isNotTakingPart].
  final String unit;
  final String decision;

  bool get isNotTakingPart => decision == CommitmentDecision.notTakingPart;

  factory Commitment.fromJson(Map<String, dynamic> json) {
    return Commitment(
      id: json['id'] as String,
      participationId: json['participationId'] as String,
      typeKey: _string(json['typeKey']),
      targetValue: _num(json['targetValue']),
      unit: _string(json['unit']) ?? '',
      decision: _string(json['decision']) ?? CommitmentDecision.committed,
    );
  }
}

class ParticipationSummary {
  const ParticipationSummary({
    required this.campaignId,
    required this.enrolled,
    required this.awaitingCommitment,
    required this.takingPart,
    required this.notTakingPart,
    required this.withdrawn,
    this.communityId,
  });

  final String campaignId;
  final String? communityId;
  final int enrolled;
  final int awaitingCommitment;
  final int takingPart;
  final int notTakingPart;
  final int withdrawn;

  factory ParticipationSummary.fromJson(Map<String, dynamic> json) {
    return ParticipationSummary(
      campaignId: json['campaignId'] as String,
      communityId: _string(json['communityId']),
      enrolled: _num(json['enrolled']).toInt(),
      awaitingCommitment: _num(json['awaitingCommitment']).toInt(),
      takingPart: _num(json['takingPart']).toInt(),
      notTakingPart: _num(json['notTakingPart']).toInt(),
      withdrawn: _num(json['withdrawn']).toInt(),
    );
  }
}

class ActionDefinition {
  const ActionDefinition({
    required this.id,
    required this.campaignId,
    required this.key,
    required this.name,
    required this.unit,
    required this.isActive,
  });

  final String id;
  final String campaignId;
  final String key;
  final String name;
  final String unit;
  final bool isActive;

  factory ActionDefinition.fromJson(Map<String, dynamic> json) {
    return ActionDefinition(
      id: json['id'] as String,
      campaignId: json['campaignId'] as String,
      key: json['key'] as String,
      name: json['name'] as String,
      unit: json['unit'] as String,
      isActive: _bool(json['isActive'], true),
    );
  }
}

class Submission {
  const Submission({
    required this.id,
    required this.actionId,
    required this.status,
    this.reviewNote,
  });

  final String id;
  final String actionId;
  final String status;
  final String? reviewNote;

  factory Submission.fromJson(Map<String, dynamic> json) {
    return Submission(
      id: json['id'] as String,
      actionId: json['actionId'] as String,
      status: json['status'] as String,
      reviewNote: _string(json['reviewNote']),
    );
  }
}

class RecordedAction {
  const RecordedAction({
    required this.id,
    required this.campaignId,
    required this.participationId,
    required this.userId,
    required this.actionDefinitionId,
    required this.occurredOn,
    required this.quantity,
    required this.status,
    this.submission,
    this.payload = const {},
    this.idempotencyKey,
  });

  final String id;
  final String campaignId;
  final String participationId;
  final String userId;
  final String actionDefinitionId;
  final String occurredOn;
  final num quantity;
  final String status;
  final Submission? submission;
  final Map<String, dynamic> payload;
  final String? idempotencyKey;

  bool get isCancelled => status == 'cancelled';

  String? get note => payload['note']?.toString();

  factory RecordedAction.fromJson(Map<String, dynamic> json) {
    final submissionJson = json['submission'];
    return RecordedAction(
      id: json['id'] as String,
      campaignId: json['campaignId'] as String,
      participationId: json['participationId'] as String,
      userId: json['userId'] as String,
      actionDefinitionId: json['actionDefinitionId'] as String,
      occurredOn: json['occurredOn'] as String,
      quantity: _num(json['quantity'], 1),
      status: json['status'] as String,
      submission: submissionJson == null
          ? null
          : Submission.fromJson(_map(submissionJson)),
      payload: _map(json['payload']),
      idempotencyKey: _string(json['idempotencyKey']),
    );
  }
}

class MeasurementTotal {
  const MeasurementTotal({
    required this.sourceUnit,
    required this.quantity,
    this.definitionKey,
  });

  final String sourceUnit;
  final num quantity;
  final String? definitionKey;

  factory MeasurementTotal.fromJson(Map<String, dynamic> json) {
    return MeasurementTotal(
      sourceUnit: json['sourceUnit'] as String,
      quantity: _num(json['quantity']),
      definitionKey: _string(json['definitionKey']),
    );
  }
}

class OutcomeContribution {
  const OutcomeContribution({
    required this.version,
    required this.factorValue,
    required this.source,
  });

  final int version;
  final num factorValue;
  final String source;

  factory OutcomeContribution.fromJson(Map<String, dynamic> json) {
    return OutcomeContribution(
      version: _num(json['version']).toInt(),
      factorValue: _num(json['factorValue']),
      source: json['source'] as String? ?? '',
    );
  }
}

class OutcomeTotal {
  const OutcomeTotal({
    required this.sourceUnit,
    required this.outcomeMetric,
    required this.outcomeUnit,
    required this.value,
    required this.contributions,
  });

  final String sourceUnit;
  final String outcomeMetric;
  final String outcomeUnit;
  final num value;
  final List<OutcomeContribution> contributions;

  factory OutcomeTotal.fromJson(Map<String, dynamic> json) {
    return OutcomeTotal(
      sourceUnit: json['sourceUnit'] as String,
      outcomeMetric: json['outcomeMetric'] as String,
      outcomeUnit: json['outcomeUnit'] as String,
      value: _num(json['value']),
      contributions: _list(json['contributions'])
          .map((row) => OutcomeContribution.fromJson(_map(row)))
          .toList(),
    );
  }
}

class TimeSeriesPoint {
  const TimeSeriesPoint({
    required this.periodStart,
    required this.periodEnd,
    required this.measurements,
    required this.outcomes,
  });

  final String periodStart;
  final String periodEnd;
  final List<MeasurementTotal> measurements;
  final List<OutcomeTotal> outcomes;

  factory TimeSeriesPoint.fromJson(Map<String, dynamic> json) {
    return TimeSeriesPoint(
      periodStart: json['periodStart'] as String,
      periodEnd: json['periodEnd'] as String,
      measurements: _list(json['measurements'])
          .map((row) => MeasurementTotal.fromJson(_map(row)))
          .toList(),
      outcomes: _list(json['outcomes'])
          .map((row) => OutcomeTotal.fromJson(_map(row)))
          .toList(),
    );
  }
}

class VisualizationData {
  const VisualizationData({
    required this.type,
    required this.displayName,
    required this.isActive,
    this.completionPercent,
    this.unit,
    this.achievedValue,
    this.targetValue,
  });

  final String type;
  final String displayName;
  final bool isActive;
  final num? completionPercent;
  final String? unit;
  final num? achievedValue;
  final num? targetValue;

  factory VisualizationData.fromJson(Map<String, dynamic> json) {
    return VisualizationData(
      type: json['type'] as String? ?? 'tree',
      displayName: json['displayName'] as String? ?? 'tree',
      isActive: _bool(json['isActive']),
      completionPercent: json['completionPercent'] as num?,
      unit: _string(json['unit']),
      achievedValue: json['achievedValue'] as num?,
      targetValue: json['targetValue'] as num?,
    );
  }
}

class DashboardProgress {
  const DashboardProgress({
    required this.achievedValue,
    required this.targetValue,
    this.completionPercent,
    this.unit,
    this.completionStatus,
    this.participantCount,
    this.committedParticipantCount,
    this.notTakingPartCount,
    this.awaitingCommitmentCount,
  });

  final num achievedValue;
  final num targetValue;
  final num? completionPercent;
  final String? unit;
  final String? completionStatus;
  final int? participantCount;
  final int? committedParticipantCount;
  final int? notTakingPartCount;
  final int? awaitingCommitmentCount;

  factory DashboardProgress.fromJson(Map<String, dynamic> json) {
    final units = json['units'];
    final primary = units is List && units.isNotEmpty
        ? _map(units.first)
        : json;
    return DashboardProgress(
      achievedValue: _num(primary['achievedValue']),
      targetValue: _num(primary['targetValue']),
      completionPercent: primary['completionPercent'] as num?,
      unit: _string(primary['unit']),
      completionStatus: _string(primary['completionStatus']),
      participantCount: json['participantCount'] is num
          ? (json['participantCount'] as num).toInt()
          : null,
      committedParticipantCount: json['committedParticipantCount'] is num
          ? (json['committedParticipantCount'] as num).toInt()
          : null,
      notTakingPartCount: json['notTakingPartCount'] is num
          ? (json['notTakingPartCount'] as num).toInt()
          : null,
      awaitingCommitmentCount: json['awaitingCommitmentCount'] is num
          ? (json['awaitingCommitmentCount'] as num).toInt()
          : null,
    );
  }
}

class ParticipantProgress {
  const ParticipantProgress({
    required this.participationId,
    required this.achievedValue,
    required this.targetValue,
    this.unit,
    this.completionPercent,
    this.completionStatus,
    this.engagement,
  });

  final String participationId;
  final num achievedValue;
  final num targetValue;
  final String? unit;
  final num? completionPercent;
  final String? completionStatus;
  final String? engagement;

  factory ParticipantProgress.fromJson(Map<String, dynamic> json) {
    return ParticipantProgress(
      participationId: json['participationId'] as String,
      achievedValue: _num(json['achievedValue']),
      targetValue: _num(json['targetValue']),
      unit: _string(json['unit']),
      completionPercent: json['completionPercent'] as num?,
      completionStatus: _string(json['completionStatus']),
      engagement: _string(json['engagement']),
    );
  }
}

class ParticipantDashboard {
  const ParticipantDashboard({
    required this.progress,
    required this.measurements,
    required this.outcomes,
    required this.timeSeries,
    required this.visualization,
  });

  final DashboardProgress progress;
  final List<MeasurementTotal> measurements;
  final List<OutcomeTotal> outcomes;
  final List<TimeSeriesPoint> timeSeries;
  final VisualizationData visualization;

  factory ParticipantDashboard.fromJson(Map<String, dynamic> json) {
    final timeSeriesJson = _map(json['timeSeries']);
    return ParticipantDashboard(
      progress: DashboardProgress.fromJson(_map(json['progress'])),
      measurements: _list(json['measurements'])
          .map((row) => MeasurementTotal.fromJson(_map(row)))
          .toList(),
      outcomes: _list(json['outcomes'])
          .map((row) => OutcomeTotal.fromJson(_map(row)))
          .toList(),
      timeSeries: _list(timeSeriesJson['points'])
          .map((row) => TimeSeriesPoint.fromJson(_map(row)))
          .toList(),
      visualization: VisualizationData.fromJson(_map(json['visualization'])),
    );
  }
}

class AggregateDashboard {
  const AggregateDashboard({
    required this.scope,
    required this.progress,
    required this.measurements,
    required this.outcomes,
    required this.timeSeries,
    required this.visualization,
  });

  final String scope;
  final DashboardProgress progress;
  final List<MeasurementTotal> measurements;
  final List<OutcomeTotal> outcomes;
  final List<TimeSeriesPoint> timeSeries;
  final VisualizationData visualization;

  factory AggregateDashboard.fromJson(Map<String, dynamic> json) {
    final timeSeriesJson = _map(json['timeSeries']);
    return AggregateDashboard(
      scope: json['scope'] as String? ?? 'campaign',
      progress: DashboardProgress.fromJson(_map(json['progress'])),
      measurements: _list(json['measurements'])
          .map((row) => MeasurementTotal.fromJson(_map(row)))
          .toList(),
      outcomes: _list(json['outcomes'])
          .map((row) => OutcomeTotal.fromJson(_map(row)))
          .toList(),
      timeSeries: _list(timeSeriesJson['points'])
          .map((row) => TimeSeriesPoint.fromJson(_map(row)))
          .toList(),
      visualization: VisualizationData.fromJson(_map(json['visualization'])),
    );
  }
}

class InboxNotification {
  const InboxNotification({
    required this.id,
    required this.customerId,
    required this.type,
    required this.title,
    required this.body,
    this.readAt,
  });

  final String id;
  final String customerId;
  final String type;
  final String title;
  final String body;
  final String? readAt;

  bool get isRead => readAt != null;

  factory InboxNotification.fromJson(Map<String, dynamic> json) {
    return InboxNotification(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      type: json['type'] as String? ?? '',
      title: json['title'] as String,
      body: json['body'] as String,
      readAt: _string(json['readAt']),
    );
  }

  InboxNotification copyWith({String? readAt}) {
    return InboxNotification(
      id: id,
      customerId: customerId,
      type: type,
      title: title,
      body: body,
      readAt: readAt ?? this.readAt,
    );
  }
}

class ImpactFactor {
  const ImpactFactor({
    required this.id,
    required this.customerId,
    required this.sourceUnit,
    required this.outcomeMetric,
    required this.outcomeUnit,
    required this.factorValue,
    required this.version,
    required this.source,
    required this.effectiveFrom,
    required this.isActive,
    this.campaignId,
    this.effectiveTo,
  });

  final String id;
  final String customerId;
  final String? campaignId;
  final String sourceUnit;
  final String outcomeMetric;
  final String outcomeUnit;
  final num factorValue;
  final int version;
  final String source;
  final String effectiveFrom;
  final String? effectiveTo;
  final bool isActive;

  factory ImpactFactor.fromJson(Map<String, dynamic> json) {
    return ImpactFactor(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      campaignId: _string(json['campaignId']),
      sourceUnit: json['sourceUnit'] as String,
      outcomeMetric: json['outcomeMetric'] as String,
      outcomeUnit: json['outcomeUnit'] as String,
      factorValue: _num(json['factorValue']),
      version: _num(json['version'], 1).toInt(),
      source: json['source'] as String,
      effectiveFrom: json['effectiveFrom'] as String,
      effectiveTo: _string(json['effectiveTo']),
      isActive: _bool(json['isActive'], true),
    );
  }
}

class ReportUnit {
  const ReportUnit({
    required this.unit,
    required this.achievedValue,
    required this.targetValue,
    this.completionPercent,
    this.completionStatus,
  });

  final String unit;
  final num achievedValue;
  final num targetValue;
  final num? completionPercent;
  final String? completionStatus;

  factory ReportUnit.fromJson(Map<String, dynamic> json) {
    return ReportUnit(
      unit: json['unit'] as String? ?? '',
      achievedValue: _num(json['achievedValue']),
      targetValue: _num(json['targetValue']),
      completionPercent: json['completionPercent'] as num?,
      completionStatus: _string(json['completionStatus']),
    );
  }
}

class AggregateReport {
  const AggregateReport({
    required this.scope,
    required this.campaignId,
    required this.generatedAt,
    required this.units,
    this.communityId,
    this.participantCount,
    this.committedParticipantCount,
    this.notTakingPartCount,
    this.awaitingCommitmentCount,
  });

  final String scope;
  final String campaignId;
  final String? communityId;
  final String generatedAt;
  final int? participantCount;
  final int? committedParticipantCount;
  final int? notTakingPartCount;
  final int? awaitingCommitmentCount;
  final List<ReportUnit> units;

  factory AggregateReport.fromJson(Map<String, dynamic> json) {
    final progress = _map(json['progress']);
    return AggregateReport(
      scope: json['scope'] as String? ?? 'campaign',
      campaignId: json['campaignId'] as String,
      communityId: _string(json['communityId']),
      generatedAt: json['generatedAt'] as String? ?? '',
      participantCount: progress['participantCount'] is num
          ? (progress['participantCount'] as num).toInt()
          : null,
      committedParticipantCount: progress['committedParticipantCount'] is num
          ? (progress['committedParticipantCount'] as num).toInt()
          : null,
      notTakingPartCount: progress['notTakingPartCount'] is num
          ? (progress['notTakingPartCount'] as num).toInt()
          : null,
      awaitingCommitmentCount: progress['awaitingCommitmentCount'] is num
          ? (progress['awaitingCommitmentCount'] as num).toInt()
          : null,
      units: _list(progress['units'])
          .map((row) => ReportUnit.fromJson(_map(row)))
          .toList(),
    );
  }
}

abstract final class MilestoneMetric {
  static const completionPercent = 'completion_percent';
  static const achievedValue = 'achieved_value';
}

/// A collective target. All three fields are set together or not at all.
class MilestoneGoal {
  const MilestoneGoal({
    required this.metric,
    required this.thresholdValue,
    required this.unit,
  });

  final String metric;
  final num thresholdValue;
  final String unit;

  Map<String, dynamic> toJson() => {
        'metric': metric,
        'thresholdValue': thresholdValue,
        'unit': unit,
      };
}

class MilestoneContentTranslations {
  const MilestoneContentTranslations({this.en});

  final MilestoneEnglishTranslations? en;

  Map<String, dynamic> toJson() => {
        if (en != null) 'en': en!.toJson(),
      };
}

class MilestoneEnglishTranslations {
  const MilestoneEnglishTranslations({this.name, this.description});

  final String? name;
  final String? description;

  factory MilestoneEnglishTranslations.fromJson(Map<String, dynamic> json) {
    return MilestoneEnglishTranslations(
      name: _string(json['name']),
      description: _string(json['description']),
    );
  }

  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (description != null) 'description': description,
      };
}

class Milestone {
  const Milestone({
    required this.id,
    required this.customerId,
    required this.campaignId,
    required this.key,
    required this.name,
    required this.isActive,
    required this.createdByUserId,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.dueOn,
    this.goal,
    this.englishTranslations = const MilestoneEnglishTranslations(),
  });

  final String id;
  final String customerId;
  final String campaignId;
  final String key;

  /// Localized by the request locale; zh-Hans is the primary value.
  final String name;
  final String? description;

  /// ISO date. Fixed once the campaign is published.
  final String? dueOn;
  final MilestoneGoal? goal;
  final bool isActive;

  /// Raw stored English values, for editing.
  final MilestoneEnglishTranslations englishTranslations;
  final String createdByUserId;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get hasGoal => goal != null;
  bool get isDated => dueOn != null;

  factory Milestone.fromJson(Map<String, dynamic> json) {
    final metric = _string(json['metric']);
    final unit = _string(json['unit']);
    final threshold = json['thresholdValue'];
    return Milestone(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      campaignId: json['campaignId'] as String,
      key: json['key'] as String,
      name: json['name'] as String,
      description: _string(json['description']),
      dueOn: _string(json['dueOn']),
      goal: metric != null && unit != null && threshold is num
          ? MilestoneGoal(metric: metric, thresholdValue: threshold, unit: unit)
          : null,
      isActive: _bool(json['isActive'], true),
      englishTranslations: MilestoneEnglishTranslations.fromJson(
        _map(_map(json['translations'])['en']),
      ),
      createdByUserId: json['createdByUserId'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}

class MilestoneProgress {
  const MilestoneProgress({
    required this.milestoneId,
    required this.campaignId,
    required this.customerId,
    required this.hasGoal,
    required this.currentAchievedValue,
    required this.currentTargetValue,
    required this.crossed,
    required this.status,
    required this.computedAt,
    this.metric,
    this.unit,
    this.thresholdValue,
    this.currentCompletionPercent,
  });

  final String milestoneId;
  final String campaignId;
  final String customerId;
  final bool hasGoal;
  final String? metric;
  final String? unit;
  final num? thresholdValue;
  final num currentAchievedValue;
  final num currentTargetValue;
  final num? currentCompletionPercent;
  final bool crossed;
  final String status;
  final DateTime computedAt;

  factory MilestoneProgress.fromJson(Map<String, dynamic> json) {
    return MilestoneProgress(
      milestoneId: json['milestoneId'] as String,
      campaignId: json['campaignId'] as String,
      customerId: json['customerId'] as String,
      hasGoal: _bool(json['hasGoal'], json['metric'] != null),
      metric: _string(json['metric']),
      unit: _string(json['unit']),
      thresholdValue: json['thresholdValue'] as num?,
      currentAchievedValue: _num(json['currentAchievedValue']),
      currentTargetValue: _num(json['currentTargetValue']),
      currentCompletionPercent: json['currentCompletionPercent'] as num?,
      crossed: _bool(json['crossed']),
      status: json['status'] as String? ?? 'none',
      computedAt: DateTime.parse(json['computedAt'] as String),
    );
  }
}

class MilestoneEvaluation {
  const MilestoneEvaluation({
    required this.id,
    required this.milestoneId,
    required this.customerId,
    required this.evaluatedByUserId,
    required this.achievedValue,
    required this.targetValue,
    required this.crossed,
    required this.status,
    required this.evaluatedAt,
    required this.createdAt,
    this.completionPercent,
  });

  final String id;
  final String milestoneId;
  final String customerId;
  final String evaluatedByUserId;
  final num achievedValue;
  final num targetValue;
  final num? completionPercent;
  final bool crossed;
  final String status;
  final DateTime evaluatedAt;
  final DateTime createdAt;

  factory MilestoneEvaluation.fromJson(Map<String, dynamic> json) {
    return MilestoneEvaluation(
      id: json['id'] as String,
      milestoneId: json['milestoneId'] as String,
      customerId: json['customerId'] as String,
      evaluatedByUserId: json['evaluatedByUserId'] as String,
      achievedValue: _num(json['achievedValue']),
      targetValue: _num(json['targetValue']),
      completionPercent: json['completionPercent'] as num?,
      crossed: _bool(json['crossed']),
      status: json['status'] as String? ?? 'none',
      evaluatedAt: DateTime.parse(json['evaluatedAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// A slice of the campaign window ending on a dated milestone, or the
/// implicit final period ending on the campaign end date. [key] is the end
/// date and identifies the period.
class CampaignPeriod {
  const CampaignPeriod({
    required this.key,
    required this.index,
    required this.startsOn,
    required this.endsOn,
    required this.isFinal,
    required this.dayCount,
    this.milestoneId,
    this.name,
  });

  final String key;
  final int index;
  final String startsOn;
  final String endsOn;
  final String? milestoneId;
  final String? name;
  final bool isFinal;
  final int dayCount;

  factory CampaignPeriod.fromJson(Map<String, dynamic> json) {
    return CampaignPeriod(
      key: json['key'] as String,
      index: _num(json['index']).toInt(),
      startsOn: json['startsOn'] as String,
      endsOn: json['endsOn'] as String,
      milestoneId: _string(json['milestoneId']),
      name: _string(json['name']),
      isFinal: _bool(json['isFinal']),
      dayCount: _num(json['dayCount']).toInt(),
    );
  }
}
