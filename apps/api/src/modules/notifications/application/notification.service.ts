import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceNotFoundException } from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { InAppNotification } from '../domain/notification.entity.js';

export interface NotificationResponse {
  id: string;
  customerId: string;
  type: string;
  locale: string;
  title: string;
  body: string;
  payload: Record<string, string>;
  readAt: string | null;
  createdAt: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(InAppNotification)
    private readonly notificationRepository: Repository<InAppNotification>,
  ) {}

  async list(
    tenant: TenantContext,
    userId: string,
  ): Promise<NotificationResponse[]> {
    const rows = await this.notificationRepository.find({
      where: { tenant_id: tenant.tenantId, user_id: userId },
      order: { created_at: 'DESC' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async get(
    tenant: TenantContext,
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponse> {
    return this.toResponse(
      await this.requireOwn(tenant, userId, notificationId),
    );
  }

  async markRead(
    tenant: TenantContext,
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponse> {
    const notification = await this.requireOwn(tenant, userId, notificationId);
    if (!notification.read_at) {
      notification.read_at = new Date();
      await this.notificationRepository.save(notification);
    }
    return this.toResponse(notification);
  }

  private async requireOwn(
    tenant: TenantContext,
    userId: string,
    notificationId: string,
  ): Promise<InAppNotification> {
    const notification = await this.notificationRepository.findOne({
      where: {
        id: notificationId,
        tenant_id: tenant.tenantId,
        user_id: userId,
      },
    });
    if (!notification) {
      throw new ResourceNotFoundException('Notification not found');
    }
    return notification;
  }

  private toResponse(row: InAppNotification): NotificationResponse {
    return {
      id: row.id,
      customerId: row.tenant_id,
      type: row.type,
      locale: row.locale,
      title: row.title,
      body: row.body,
      payload: row.payload,
      readAt: row.read_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
    };
  }
}
