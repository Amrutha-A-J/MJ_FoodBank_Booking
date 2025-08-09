import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { createContext } from 'react';
import themeConfig, { type ThemeConfig } from './themeConfig';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

export const getTheme = (
  mode: PaletteMode = 'light',
  config: ThemeConfig = themeConfig
) => {
  const isDark = mode === 'dark';
  const theme = createTheme({
    palette: {
      mode,
      primary: { main: config.primary },
      secondary: { main: isDark ? '#FFFFFF' : config.secondary },
      text: { primary: isDark ? '#FFFFFF' : config.text },
      error: { main: config.accent },
      background: {
        default: isDark ? '#121212' : config.background,
        paper: isDark ? '#1e1e1e' : '#FFFFFF',
      },
    },
    typography: {
      fontFamily: config.fontFamily,
    },
    components: {
      MuiButton: {
        defaultProps: {
          variant: 'outlined',
          color: 'primary',
        },
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
    },
  } as ThemeOptions);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--e-global-color-primary', config.primary);
    root.style.setProperty(
      '--e-global-color-secondary',
      isDark ? '#FFFFFF' : config.secondary
    );
    root.style.setProperty('--e-global-color-text', isDark ? '#FFFFFF' : config.text);
    root.style.setProperty('--e-global-color-accent', config.accent);
    root.style.setProperty(
      '--e-global-color-background',
      isDark ? '#121212' : config.background
    );
    root.style.setProperty('--e-global-typography-text-font-family', config.fontFamily);
  }

  return theme;
};

export default getTheme;
