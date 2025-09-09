export function logEvent(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', event, params);
  }
}
