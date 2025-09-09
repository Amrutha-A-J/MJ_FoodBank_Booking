import admin from 'firebase-admin';
import logger from './logger';
import { getTokensForUser } from '../models/pushToken';

let initialized = false;

export function initNotificationService() {
  if (initialized) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    logger.warn('Firebase not configured; push notifications disabled');
    return;
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  initialized = true;
}

export async function sendPushToUser(
  userId: number,
  role: string,
  notification: { title: string; body: string },
) {
  if (!initialized) return;
  try {
    const tokens = await getTokensForUser(userId, role);
    if (tokens.length === 0) return;
    await admin.messaging().sendEachForMulticast({ tokens, notification });
  } catch (err) {
    logger.error('Failed to send push notification', err);
  }
}
