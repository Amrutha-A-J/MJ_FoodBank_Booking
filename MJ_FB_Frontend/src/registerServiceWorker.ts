export function registerServiceWorker() {
  const mode = (import.meta as any).env?.MODE ?? process.env.NODE_ENV;
  if (mode !== 'production') {
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
