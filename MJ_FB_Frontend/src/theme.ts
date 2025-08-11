// src/theme.ts
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// ---- Brand tokens (tweak these to match mjfoodbank.org exactly) ----
// Approx palette: green primary, warm "harvest" accent, deep red for errors (your 941818)
const BRAND_PRIMARY = '#1F6F3D';   // mjfoodbank-style green (adjust after sampling)
const BRAND_ACCENT  = '#F59E0B';   // warm accent (buttons/badges/emphasis)
const BRAND_ERROR   = '#941818';   // keep your deep red for error/destructive
const BG_APP        = '#f7f9f7';   // very light, slightly warm/greenish background
const BG_CARD       = '#ffffff';
const DIVIDER       = '#e6e9e6';
// -------------------------------------------------------------------

let theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: BRAND_PRIMARY },
    secondary: { main: BRAND_ACCENT },
    error: { main: BRAND_ERROR },
    background: { default: BG_APP, paper: BG_CARD },
    divider: DIVIDER,
    success: { main: '#2e7d32' },   // MUI green 800 (reads well on white)
    warning: { main: '#f59e0b' },   // matches BRAND_ACCENT
    info: { main: '#2563eb' },      // optional informational blue
  },
  shape: { borderRadius: 16 },
  typography: {
    // Keep Golos unless you’d like to mirror the website font exactly.
    // Swap this to match the site later if needed.
    fontFamily: ['Golos', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'].join(','),
    h5: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundImage: 'none' },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${DIVIDER}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: BRAND_PRIMARY,
        },
      },
    },
    MuiButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { borderRadius: 12, textTransform: 'none', fontWeight: 600 },
        containedPrimary: { color: '#fff' },
        outlinedPrimary: { borderColor: `${BRAND_PRIMARY}33` }, // subtle outline
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiListItemText: { styleOverrides: { primary: { fontWeight: 600 } } },
    MuiLink: {
      styleOverrides: {
        root: { color: BRAND_PRIMARY, '&:hover': { textDecorationColor: BRAND_PRIMARY } },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
        standardSuccess: { border: `1px solid ${DIVIDER}` },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: DIVIDER },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: BRAND_PRIMARY },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          '&.Mui-selected': { color: BRAND_PRIMARY },
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export { theme };
