import { createTheme, ThemeOptions } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { createContext } from 'react';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

export const getTheme = (
  mode: PaletteMode = 'light',
  primary: string = '#1976d2',
  secondary: string = '#9c27b0'
) =>
  createTheme({
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: secondary },
    },
    typography: {
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
    },
  } as ThemeOptions);

export default getTheme;
