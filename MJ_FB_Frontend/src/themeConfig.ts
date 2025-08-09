export interface ThemeConfig {
  primary: string;
  secondary: string;
  text: string;
  accent: string;
  fontFamily: string;
}

export const defaultTheme: ThemeConfig = {
  primary: '#000000',
  secondary: '#000000',
  text: '#2E2E2E',
  accent: '#941818',
  fontFamily: '"Golos Text", sans-serif',
};

export default defaultTheme;
