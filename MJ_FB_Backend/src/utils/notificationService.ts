import admin from 'firebase-admin';
import config from '../config';
import logger from './logger';

let messaging: admin.messaging.Messaging | null = null;

export function initNotificationService(): void {
  try {
    if (!config.fcmServiceAccount) {
      logger.warn('FCM service account not configured');
      return;
    }
    admin.initializeApp({
      credential: admin.credential.cert(config.fcmServiceAccount as admin.ServiceAccount),
    });
    messaging = admin.messaging();
  } catch (err) {
    logger.error('Failed to init FCM', err);
  }
}

export async function sendPushNotification(tokens: string[], notification: { title: string; body: string }): Promise<void> {
  if (!messaging || tokens.length === 0) return;
  await messaging.sendEachForMulticast({ tokens, notification });
}
