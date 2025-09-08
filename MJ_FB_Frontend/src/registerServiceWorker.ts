export function registerServiceWorker() {
  const env = (import.meta as any).env ?? process.env;
  const mode = env?.MODE ?? env?.NODE_ENV;
  const enable = env?.VITE_ENABLE_SERVICE_WORKER === 'true';

  if (mode !== 'production' && !enable) {
    return;
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
          console.error('Service worker registration failed', err);
        });
    });
  }
}
