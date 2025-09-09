import { useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { registerPushToken } from '../api/notifications';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export default function usePushNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    Notification.requestPermission().then(permission => {
      if (permission !== 'granted') return;
      getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
        .then(token => {
          if (token) registerPushToken(token);
        })
        .catch(console.error);
    });
    onMessage(messaging, payload => {
      console.log('Foreground message', payload);
    });
  }, [enabled]);
}
