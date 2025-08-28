// theme.ts
import { createTheme, responsiveFontSizes, alpha, darken } from '@mui/material/styles';

// ---- Brand tokens (tweak after sampling mjfoodbank.org) ----
const BRAND_PRIMARY = '#1F6F3D';   // mjfoodbank-style green
const BRAND_ACCENT  = '#F59E0B';   // warm accent (buttons/badges/emphasis)
const BRAND_ERROR   = '#941818';   // deep red for error/destructive
const BG_APP        = '#f7f9f7';   // very light, slightly warm/greenish background
const BG_CARD       = '#ffffff';
const DIVIDER       = '#e6e9e6';
// ------------------------------------------------------------

let theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: BRAND_PRIMARY, contrastText: '#ffffff' },
    secondary: { main: BRAND_ACCENT, contrastText: '#111111' }, // orange needs dark text
    error: { main: BRAND_ERROR, contrastText: '#ffffff' },
    success: { main: '#2e7d32', contrastText: '#ffffff' },
    warning: { main: BRAND_ACCENT, contrastText: '#111111' },
    info: { main: '#2563eb', contrastText: '#ffffff' },
    background: { default: BG_APP, paper: BG_CARD },
    divider: DIVIDER,
    action: {
      hover: alpha(BRAND_PRIMARY, 0.06),
      selected: alpha(BRAND_PRIMARY, 0.12),
      focus: alpha(BRAND_PRIMARY, 0.24),
    },
  },

  shape: { borderRadius: 10 },

  typography: {
    fontFamily: ['Golos', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'].join(','),
    h5: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },

  // Subtle motion + sensible layers
  transitions: {
    duration: { shortest: 120, shorter: 160, short: 200, standard: 240 },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut:   'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
      sharp:     'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  zIndex: { appBar: 1100, drawer: 1200, modal: 1300, snackbar: 1400, tooltip: 1500 },

  // Soft custom elevation on low levels
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.06)',
    ...Array(23).fill('0 0 0 rgba(0,0,0,0.0)'),
  ] as any,

  components: {
    // Global CSS touches
    MuiCssBaseline: {
      styleOverrides: {
        body: ({ theme }) => ({
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.default,
        }),
        // Crisp, accessible focus ring everywhere
        '*:focus-visible': {
          outline: `2px solid ${alpha(BRAND_PRIMARY, 0.6)}`,
          outlineOffset: 2,
        },
        // Selection + scrollbars
        '::selection': { background: 'rgba(31,111,61,0.18)' },
        '*::-webkit-scrollbar': { height: 10, width: 10 },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: 8,
          border: '2px solid transparent',
          backgroundClip: 'content-box',
        },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        // Respect reduced motion
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            animationDuration: '0.001ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.001ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },

    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },

    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${DIVIDER}`,
          boxShadow: (t) => t.shadows[1],
          borderRadius: 10,
        },
      },
    },

    // Prefer <AppBar color="primary" />; keep override as safety
    MuiAppBar: { styleOverrides: { root: { backgroundColor: BRAND_PRIMARY } } },

    MuiButton: {
      defaultProps: { size: 'small', disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          padding: '0.6em 1.2em',
          fontSize: '1rem',
          border: '1px solid transparent',
          transition: 'border-color 0.25s, background-color 0.25s',
          '&:focus-visible': { boxShadow: `0 0 0 3px ${alpha(BRAND_PRIMARY, 0.25)}` },
        },
        containedPrimary: {
          '&:hover': { backgroundColor: darken(BRAND_PRIMARY, 0.08) },
          '&:active': { backgroundColor: darken(BRAND_PRIMARY, 0.16) },
        },
        outlinedPrimary: {
          borderColor: alpha(BRAND_PRIMARY, 0.25),
          '&:hover': {
            borderColor: BRAND_PRIMARY,
            backgroundColor: alpha(BRAND_PRIMARY, 0.08),
            color: BRAND_PRIMARY,
          },
        },
        containedSecondary: {
          color: '#111',
          '&:hover': { backgroundColor: darken(BRAND_ACCENT, 0.08) },
        },
        outlinedSecondary: {
          borderColor: alpha(BRAND_ACCENT, 0.3),
          color: '#111',
          '&:hover': {
            borderColor: BRAND_ACCENT,
            backgroundColor: alpha(BRAND_ACCENT, 0.12),
          },
        },
      },
    },

    MuiChip: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiListItemText: { styleOverrides: { primary: { fontWeight: 600 } } },

    MuiLink: {
      styleOverrides: {
        root: {
          color: BRAND_PRIMARY,
          textUnderlineOffset: '2px',
          '&:hover': { textDecorationColor: BRAND_PRIMARY },
          '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${alpha(BRAND_PRIMARY, 0.25)}` },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
        standardSuccess: { border: `1px solid ${DIVIDER}` },
        standardInfo: { background: '#fafafa' },
      },
    },

    MuiDivider: { styleOverrides: { root: { borderColor: DIVIDER } } },

    // Keep fields box-model neutral (use Stack/Grid for spacing)
    MuiTextField: {
      defaultProps: { fullWidth: true, size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            borderRadius: theme.shape.borderRadius,
            '&.MuiInputBase-sizeSmall': { height: theme.spacing(5) },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(BRAND_PRIMARY, 0.4) },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: BRAND_PRIMARY,
              boxShadow: `0 0 0 3px ${alpha(BRAND_PRIMARY, 0.12)}`,
            },
          },
          '& .MuiOutlinedInput-notchedOutline': { borderRadius: theme.shape.borderRadius },
          '& .MuiFormHelperText-root': { marginLeft: 0 },
          '& .MuiInputBase-input': { padding: '0.5rem', fontSize: '1rem' },
        }),
      },
    },

    MuiSelect: {
      defaultProps: { fullWidth: true, size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          '&.MuiInputBase-root.MuiOutlinedInput-root': {
            borderRadius: theme.shape.borderRadius,
            '&.MuiInputBase-sizeSmall': { height: theme.spacing(5) },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(BRAND_PRIMARY, 0.4) },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: BRAND_PRIMARY,
              boxShadow: `0 0 0 3px ${alpha(BRAND_PRIMARY, 0.12)}`,
            },
          },
          '& .MuiOutlinedInput-notchedOutline': { borderRadius: theme.shape.borderRadius },
          '& .MuiFormHelperText-root': { marginLeft: 0 },
        }),
        select: { padding: '0.5rem', fontSize: '1rem' },
      },
    },

    MuiFormControl: { defaultProps: { fullWidth: true } },

    // Tabs
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: BRAND_PRIMARY, height: 3 } } },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          '&.Mui-selected': { color: BRAND_PRIMARY },
          '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${alpha(BRAND_PRIMARY, 0.25)}` },
        },
      },
    },

    // Minimal tables/lists
    MuiListItem: {
      styleOverrides: { root: { borderRadius: 8, '&:hover': { background: 'rgba(0,0,0,0.03)' } } },
    },
    MuiTableHead: {
      styleOverrides: { root: { '& .MuiTableCell-head': { fontWeight: 700, background: '#fafafa' } } },
    },
    MuiTableCell: { styleOverrides: { root: { borderBottomColor: '#eee' } } },

    // Glassy overlays
    MuiPopover: { styleOverrides: { paper: { backdropFilter: 'blur(8px)' } } },
    MuiMenu:    { styleOverrides: { paper: { backdropFilter: 'blur(8px)' } } },
    MuiDialog:  { styleOverrides: { paper: { borderRadius: 12, backdropFilter: 'blur(10px)' } } },

    // Micro-interactions
    MuiIconButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'background-color 0.2s ease, transform 0.05s ease',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
          '&:active': { transform: 'translateY(0.5px)' },
        },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 300 },
      styleOverrides: { tooltip: { borderRadius: 8, fontSize: '0.85rem', padding: '8px 10px' } },
    },

    // Layout rhythm
    MuiContainer: {
      defaultProps: { maxWidth: 'lg' },
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          '@media (min-width:900px)': { paddingLeft: 24, paddingRight: 24 },
        },
      },
    },

    // Compact AppBar toolbar height
    MuiToolbar: { styleOverrides: { root: { minHeight: 56 } } },

    // Nicer skeletons
    MuiSkeleton: { styleOverrides: { root: { borderRadius: 8 } } },
  },
});

theme = responsiveFontSizes(theme);

export { theme };

