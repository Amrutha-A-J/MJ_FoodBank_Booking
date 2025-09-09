export function logEvent(action: string, params: Record<string, any> = {}) {
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', action, params);
  } else {
    // eslint-disable-next-line no-console
    console.debug('Analytics event', action, params);
  }
}
