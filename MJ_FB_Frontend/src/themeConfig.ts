export interface ThemeConfig {
  primary: string;
  secondary: string;
  text: string;
  accent: string;
  background: string;
  fontFamily: string;
}

export const defaultTheme: ThemeConfig = {
  primary: '#941818',
  secondary: '#000000',
  text: '#000000',
  accent: '#941818',
  background: '#FFFFFF',
  fontFamily: '"Golos Text", sans-serif',
};

export default defaultTheme;

export const HIGH_CONTRAST_KEY = 'highContrast';

export function getHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(HIGH_CONTRAST_KEY) === 'true';
}

export function setHighContrast(value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HIGH_CONTRAST_KEY, String(value));
}
