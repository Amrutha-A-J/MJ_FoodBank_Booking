import { getPushTokens } from '../models/pushToken';
import { sendPushNotification } from './notificationService';

export async function notifyUser(
  userId: number,
  role: 'client' | 'volunteer',
  title: string,
  body: string,
): Promise<void> {
  const tokens = await getPushTokens(userId, role);
  await sendPushNotification(tokens, { title, body });
}
