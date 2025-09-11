export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') {
    return error || fallback;
  }
  if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message as string;
    }
    if ('error' in error && typeof (error as any).error === 'string') {
      return (error as any).error as string;
    }
  }
  return fallback;
}
