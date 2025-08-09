import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';
import themeConfig, { type ThemeConfig } from './themeConfig';

export const getTheme = (config: ThemeConfig = themeConfig) => {
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: { main: config.primary },
      secondary: { main: config.secondary },
      text: { primary: config.text },
      error: { main: config.accent },
      background: {
        default: config.background,
        paper: '#FFFFFF',
      },
    },
    typography: {
      fontFamily: config.fontFamily,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
    },
  } as ThemeOptions);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--e-global-color-primary', config.primary);
    root.style.setProperty('--e-global-color-secondary', config.secondary);
    root.style.setProperty('--e-global-color-text', config.text);
    root.style.setProperty('--e-global-color-accent', config.accent);
    root.style.setProperty('--e-global-color-background', config.background);
    root.style.setProperty('--e-global-typography-text-font-family', config.fontFamily);
  }

  return theme;
};

export default getTheme;

