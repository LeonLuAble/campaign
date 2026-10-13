import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_notification_preferences')
export class UserNotificationPreference {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'boolean', default: true })
  in_app_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  email_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  sms_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  push_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  reminders_enabled: boolean;

  @Column({ type: 'time', default: '09:00' })
  reminder_local_time: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
