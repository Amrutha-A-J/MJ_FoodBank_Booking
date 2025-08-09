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
