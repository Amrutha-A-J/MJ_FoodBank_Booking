import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function initNotifications() {
  if (!('Notification' in window)) return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
  const registration = await navigator.serviceWorker.ready;
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (token) {
      await fetch(`${import.meta.env.VITE_API_BASE}/notifications/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
    }
  } catch (err) {
    console.error('Failed to get FCM token', err);
  }
  onMessage(messaging, (payload) => {
    if (payload.notification?.title) {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
      });
    }
  });
}
