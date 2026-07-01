export interface NotificationPayload {
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<boolean>;
  validate(payload: NotificationPayload): Promise<boolean>;
  health(): Promise<boolean>;
}
