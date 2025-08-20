export function registerServiceWorker() {
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
