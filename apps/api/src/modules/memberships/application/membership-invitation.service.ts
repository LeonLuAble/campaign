import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import { buildActivationLink } from '../../../platform/notifications/public-web-links.js';
import { RegistrationService } from '../../auth/application/registration.service.js';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import {
  SYSTEM_ROLE_MEMBER,
  SYSTEM_ROLE_TENANT_ADMIN,
} from '../../authorization/domain/permission-keys.js';
import { CommunityService } from '../../communities/application/community.service.js';
import {
  CredentialService,
  InvalidPhoneNumberError,
} from '../../identity/application/credential.service.js';
import {
  IdentityAccountService,
  IdentityAlreadyExistsError,
} from '../../identity/application/identity-account.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import { Membership } from '../domain/membership.entity.js';
import { resolveActivationStatus } from './membership-directory.js';
import { MembershipService } from './membership.service.js';

export interface InviteMembershipInput {
  email?: string;
  mobile?: string;
  displayName?: string;
  communityId?: string | null;
  roleKeys?: string[];
}

export interface MembershipInvitationResponse {
  membershipId: string;
  userId: string;
  customerId: string;
  communityId: string | null;
  email: string | null;
  mobile: string | null;
  activationStatus: 'pending' | 'active';
  created: boolean;
  activationLink?: string;
}

export interface ResendMembershipActivationResponse {
  accepted: true;
  activationLink?: string;
}

@Injectable()
export class MembershipInvitationService {
  private readonly logger = new Logger(MembershipInvitationService.name);

  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    private readonly dataSource: DataSource,
    private readonly identities: IdentityAccountService,
    private readonly credentials: CredentialService,
    private readonly authorization: AuthorizationService,
    private readonly communities: CommunityService,
    private readonly registration: RegistrationService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => MembershipService))
    private readonly memberships: MembershipService,
  ) {}

  async invite(
    tenant: TenantContext,
    input: InviteMembershipInput,
  ): Promise<MembershipInvitationResponse> {
    const emailRaw = input.email?.trim() || null;
    const mobileRaw = input.mobile?.trim() || null;
    if (!emailRaw && !mobileRaw) {
      throw new InvalidRequestException('email or mobile is required');
    }

    const communityId = input.communityId ?? null;
    await this.assertCommunityInviteTarget(tenant, communityId);

    const roleKeys =
      input.roleKeys && input.roleKeys.length > 0
        ? input.roleKeys
        : [SYSTEM_ROLE_MEMBER];
    await this.assertAssignableRoles(tenant, roleKeys);

    let normalizedEmail: string | null = null;
    let normalizedMobile: string | null = null;
    if (emailRaw) {
      try {
        normalizedEmail = this.credentials.normalizeEmail(emailRaw);
      } catch {
        throw new InvalidRequestException('email is invalid');
      }
    }
    if (mobileRaw) {
      try {
        normalizedMobile = this.credentials.normalizeMobile(mobileRaw);
      } catch (error) {
        if (error instanceof InvalidPhoneNumberError) {
          throw new InvalidRequestException('mobile is invalid');
        }
        throw error;
      }
    }

    const existingByEmail = normalizedEmail
      ? await this.identities.findIdentity(IdentityType.EMAIL, normalizedEmail)
      : null;
    const existingByMobile = normalizedMobile
      ? await this.identities.findIdentity(
          IdentityType.MOBILE,
          normalizedMobile,
        )
      : null;

    if (
      existingByEmail &&
      existingByMobile &&
      existingByEmail.userId !== existingByMobile.userId
    ) {
      throw new ResourceConflictException(
        'email and mobile belong to different users',
      );
    }

    const existing = existingByEmail ?? existingByMobile;
    if (existing && !existing.isActive) {
      throw new ResourceNotFoundException('User not found');
    }

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        let userId = existing?.userId ?? '';
        let createdUser = false;
        let emailIdentityId: string | null = existingByEmail?.identityId ?? null;
        let mobileIdentityId: string | null =
          existingByMobile?.identityId ?? null;
        let emailIdentifier = existingByEmail?.identifier ?? emailRaw;
        let mobileIdentifier = existingByMobile?.identifier ?? mobileRaw;

        if (!existing) {
          const identities = [];
          if (normalizedEmail && emailRaw) {
            identities.push({
              type: IdentityType.EMAIL,
              identifier: emailRaw,
              normalizedIdentifier: normalizedEmail,
            });
          }
          if (normalizedMobile && mobileRaw) {
            identities.push({
              type: IdentityType.MOBILE,
              identifier: mobileRaw,
              normalizedIdentifier: normalizedMobile,
            });
          }
          const created = await this.identities.createImportedAccountInTransaction(
            manager,
            {
              firstName: null,
              lastName: null,
              displayName: input.displayName?.trim() || null,
              identities,
            },
          );
          userId = created.userId;
          createdUser = true;
          for (const identity of created.identities) {
            if (identity.type === IdentityType.EMAIL) {
              emailIdentityId = identity.id;
              emailIdentifier = identity.identifier;
            }
            if (identity.type === IdentityType.MOBILE) {
              mobileIdentityId = identity.id;
              mobileIdentifier = identity.identifier;
            }
          }
        }

        const membershipRepo = manager.getRepository(Membership);
        let membership = await this.findMembership(
          membershipRepo,
          tenant.tenantId,
          userId,
          communityId,
        );
        let createdMembership = false;
        if (!membership) {
          membership = await membershipRepo.save(
            membershipRepo.create({
              tenant_id: tenant.tenantId,
              user_id: userId,
              community_id: communityId,
              is_active: true,
            }),
          );
          createdMembership = true;
        } else if (!membership.is_active) {
          membership.is_active = true;
          membership = await membershipRepo.save(membership);
        }

        for (const roleKey of roleKeys) {
          const role = await this.authorization.findRoleByKey(
            tenant.tenantId,
            roleKey,
          );
          await this.authorization.assignRoleInTransaction(
            manager,
            membership.id,
            role.id,
          );
        }

        return {
          membership,
          userId,
          created: createdUser || createdMembership,
          emailIdentityId,
          mobileIdentityId,
          emailIdentifier,
          mobileIdentifier,
        };
      });

      const profile = await this.identities.getProfile(result.userId);
      const activationStatus = resolveActivationStatus(
        profile?.identities ?? [],
      );

      let activationLink: string | undefined;
      if (activationStatus === 'pending' && result.created) {
        activationLink = await this.deliverInvitation({
          userId: result.userId,
          emailIdentityId: result.emailIdentityId,
          mobileIdentityId: result.mobileIdentityId,
          emailIdentifier: result.emailIdentifier,
          mobileIdentifier: result.mobileIdentifier,
          tenantId: tenant.tenantId,
          event: 'membership_invited',
        });
      }

      this.logger.log({
        msg: 'membership_invited',
        tenantId: tenant.tenantId,
        membershipId: result.membership.id,
        userId: result.userId,
        created: result.created,
        activationStatus,
        hasActivationLink: Boolean(activationLink),
      });

      await this.memberships.emitMembershipActivated({
        tenantId: tenant.tenantId,
        userId: result.userId,
        membershipId: result.membership.id,
      });

      return {
        membershipId: result.membership.id,
        userId: result.userId,
        customerId: tenant.tenantId,
        communityId: result.membership.community_id,
        email: result.emailIdentifier,
        mobile: result.mobileIdentifier,
        activationStatus,
        created: result.created,
        ...(activationLink ? { activationLink } : {}),
      };
    } catch (error) {
      if (error instanceof IdentityAlreadyExistsError) {
        throw new ResourceConflictException('Identity already exists');
      }
      throw error;
    }
  }

  async resendActivation(
    tenant: TenantContext,
    membershipId: string,
  ): Promise<ResendMembershipActivationResponse> {
    const membership = await this.requireVisibleMembership(tenant, membershipId);

    const profile = await this.identities.getProfile(membership.user_id);
    if (!profile || !profile.isActive) {
      throw new ResourceNotFoundException('User not found');
    }
    const activationStatus = resolveActivationStatus(profile.identities);
    if (activationStatus === 'active') {
      throw new ResourceConflictException('User is already active');
    }

    const emailIdentity = profile.identities.find(
      (identity) => identity.type === 'email' && !identity.isVerified,
    );
    const mobileIdentity = profile.identities.find(
      (identity) => identity.type === 'mobile' && !identity.isVerified,
    );

    const activationLink = await this.deliverInvitation({
      userId: membership.user_id,
      emailIdentityId: emailIdentity?.id ?? null,
      mobileIdentityId: mobileIdentity?.id ?? null,
      emailIdentifier: emailIdentity?.identifier ?? null,
      mobileIdentifier: mobileIdentity?.identifier ?? null,
      tenantId: tenant.tenantId,
      event: 'membership_activation_resent',
    });

    this.logger.log({
      msg: 'membership_activation_resent',
      tenantId: tenant.tenantId,
      membershipId: membership.id,
      userId: membership.user_id,
      hasActivationLink: Boolean(activationLink),
    });

    return {
      accepted: true,
      ...(activationLink ? { activationLink } : {}),
    };
  }

  private async requireVisibleMembership(
    tenant: TenantContext,
    membershipId: string,
  ): Promise<Membership> {
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId, tenant_id: tenant.tenantId },
    });
    if (!membership) {
      throw new ResourceNotFoundException('Membership not found');
    }
    if (hasTenantLevelMembership(tenant.memberships)) {
      return membership;
    }
    if (!membership.community_id) {
      throw new ResourceNotFoundException('Membership not found');
    }
    await this.communities.get(tenant, membership.community_id);
    return membership;
  }

  private async assertCommunityInviteTarget(
    tenant: TenantContext,
    communityId: string | null,
  ): Promise<void> {
    if (communityId) {
      await this.communities.get(tenant, communityId);
      return;
    }
    if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can invite without a community',
      );
    }
  }

  private async assertAssignableRoles(
    tenant: TenantContext,
    roleKeys: string[],
  ): Promise<void> {
    const isTenantLevel = hasTenantLevelMembership(tenant.memberships);
    for (const roleKey of roleKeys) {
      if (!isTenantLevel && roleKey === SYSTEM_ROLE_TENANT_ADMIN) {
        throw new AccessForbiddenException(
          'Cannot assign tenant_admin from a community-scoped membership',
        );
      }
      // System member is the default invite target and is always assignable.
      if (roleKey === SYSTEM_ROLE_MEMBER) {
        await this.authorization.findRoleByKey(tenant.tenantId, roleKey);
        continue;
      }
      const role = await this.authorization.getRoleByKey(
        tenant.tenantId,
        roleKey,
      );
      if (!isTenantLevel) {
        for (const key of role.permissionKeys) {
          if (!tenant.permissions.has(key)) {
            throw new AccessForbiddenException(
              'Cannot assign a role with permissions beyond your own',
            );
          }
        }
      }
    }
  }

  private async findMembership(
    repository: Repository<Membership>,
    tenantId: string,
    userId: string,
    communityId: string | null,
  ): Promise<Membership | null> {
    const qb = repository
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.user_id = :userId', { userId });
    if (communityId) {
      qb.andWhere('m.community_id = :communityId', { communityId });
    } else {
      qb.andWhere('m.community_id IS NULL');
    }
    return qb.getOne();
  }

  private async deliverInvitation(input: {
    userId: string;
    emailIdentityId: string | null;
    mobileIdentityId: string | null;
    emailIdentifier: string | null;
    mobileIdentifier: string | null;
    tenantId: string;
    event: string;
  }): Promise<string | undefined> {
    if (input.emailIdentityId && input.emailIdentifier) {
      try {
        await this.registration.issueActivationTokenForIdentity({
          userId: input.userId,
          identityId: input.emailIdentityId,
          identifier: input.emailIdentifier,
          type: IdentityType.EMAIL,
          notify: true,
        });
        this.logger.log({
          msg: 'membership_activation_email_sent',
          tenantId: input.tenantId,
          event: input.event,
          userId: input.userId,
        });
      } catch (error) {
        this.logger.error({
          msg: 'membership_activation_email_failed',
          tenantId: input.tenantId,
          event: input.event,
          userId: input.userId,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
      return undefined;
    }

    if (input.mobileIdentityId && input.mobileIdentifier) {
      try {
        const token = await this.registration.issueActivationTokenForIdentity({
          userId: input.userId,
          identityId: input.mobileIdentityId,
          identifier: input.mobileIdentifier,
          type: IdentityType.MOBILE,
          notify: false,
        });
        const baseUrl =
          this.config.get<string>('notifications.publicWebBaseUrl') ??
          this.config.get<string>('PUBLIC_WEB_BASE_URL') ??
          'http://localhost:8080';
        const link = buildActivationLink(baseUrl, token);
        this.logger.log({
          msg: 'membership_activation_link_issued',
          tenantId: input.tenantId,
          event: input.event,
          userId: input.userId,
        });
        return link;
      } catch (error) {
        this.logger.error({
          msg: 'membership_activation_link_failed',
          tenantId: input.tenantId,
          event: input.event,
          userId: input.userId,
          error: error instanceof Error ? error.message : 'unknown',
        });
        return undefined;
      }
    }

    return undefined;
  }
}
