import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#941818' },
    secondary: { main: '#111827' },
    background: {
      default: '#f7f8fa',
      paper: '#ffffff',
    },
    divider: '#e5e7eb',
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: 'Golos, system-ui, Segoe UI, Roboto, Arial, sans-serif',
    h5: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontWeight: 600,
        },
      },
    },
  },
});

/*
How to install Golos:

```bash
npm install @fontsource/golos-text
```

How to import Golos in src/fonts.ts:

```ts
import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/golos-text/700.css';
```

How to wrap the app:

```tsx
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import './fonts';

<ThemeProvider theme={theme}>
  <CssBaseline />
  <AppRoutes />
</ThemeProvider>
```
*/

