// theme.ts
import { createTheme, responsiveFontSizes, alpha, darken } from '@mui/material/styles';
import { getHighContrast, setHighContrast } from './themeConfig';
import type { Theme } from '@mui/material/styles';

// ---- Brand tokens (sampled from mjfoodbank.org’s vibe) ----
const BRAND_PRIMARY = '#1F6F3D';   // deep green accents
const BRAND_ACCENT  = '#F59E0B';   // warm accent (badges/hover)
const BRAND_ERROR   = '#941818';   // brand red CTA / destructive
const BG_APP        = '#f7f9f7';   // very light, slightly warm background
const BG_CARD       = '#ffffff';
const DIVIDER       = '#e6e9e6';
const isHighContrast = getHighContrast();
// -----------------------------------------------------------

let theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: BRAND_PRIMARY, contrastText: '#ffffff' },
    secondary: { main: BRAND_ACCENT, contrastText: '#111111' }, // orange prefers dark text
    error: { main: BRAND_ERROR, contrastText: '#ffffff' },
    success: { main: '#2e7d32', contrastText: '#ffffff' },
    warning: { main: BRAND_ACCENT, contrastText: '#111111' },
    info: { main: '#2563eb', contrastText: '#ffffff' },
    background: { default: isHighContrast ? '#ffffff' : BG_APP, paper: BG_CARD },
    divider: DIVIDER,
    ...(isHighContrast ? { text: { primary: '#000000', secondary: '#000000' } } : {}),
    action: {
      hover: alpha(BRAND_PRIMARY, 0.06),
      selected: alpha(BRAND_PRIMARY, 0.12),
      focus: alpha(BRAND_PRIMARY, 0.24),
    },
  },

  shape: { borderRadius: 5 },

  typography: {
    // Match mjfoodbank.org feel: clean, roomy sans with firm headings
    fontFamily: ['"Golos Text"', 'system-ui', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'].join(','),
    // Tighter hierarchy + a touch of tracking like the site’s bold headings
    h1: { fontWeight: 800, letterSpacing: '0.2px', lineHeight: 1.14 },
    h2: { fontWeight: 800, letterSpacing: '0.2px', lineHeight: 1.18 },
    h3: { fontWeight: 700, letterSpacing: '0.2px', lineHeight: 1.2 },
    h4: {
      fontWeight: 600,
      letterSpacing: '0.2px',
      lineHeight: 1.25,
      textTransform: 'uppercase',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '0.2px',
      lineHeight: 1.3,
      textTransform: 'uppercase',
    },
    h6: { fontWeight: 500, letterSpacing: '0.2px', lineHeight: 1.35 },
    subtitle1: { fontWeight: 600 },
    body1: { fontWeight: 400, lineHeight: 1.7, letterSpacing: '0.1px' },
    body2: { fontWeight: 400, lineHeight: 1.6, letterSpacing: '0.1px' },
    button: { textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }, // CTA style
  },

  transitions: {
    duration: { shortest: 120, shorter: 160, short: 200, standard: 240 },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut:   'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
      sharp:     'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  zIndex: { appBar: 1100, drawer: 1200, modal: 1300, snackbar: 1400 },

  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
    ...Array(23).fill('0 0 0 rgba(0,0,0,0.0)'),
  ] as any,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Load font via <link> in index.html; this ensures consistent rendering
        body: ({ theme }: { theme: Theme }) => ({
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.default,
          color: '#111',
        }),
        // Focus ring
        '*:focus-visible': {
          outline: `2px solid ${alpha(BRAND_PRIMARY, 0.6)}`,
          outlineOffset: 2,
        },
        // Selection + scrollbars
        '::selection': { background: 'rgba(31,111,61,0.18)' },
        '*::-webkit-scrollbar': { height: 10, width: 10 },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: 5,
          border: '2px solid transparent',
          backgroundClip: 'content-box',
        },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        // Reduced motion
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
        root: ({ theme }: { theme: Theme }) => ({
          border: `1px solid ${DIVIDER}`,
          boxShadow: theme.shadows[1],
          borderRadius: 10,
        }),
      },
    },

    MuiAccordion: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          border: `1px solid ${darken(theme.palette.divider, 0.35)}`,
          borderRadius: theme.shape.borderRadius,
          boxShadow: 'none',
          '&::before': { display: 'none' },
          '& + &': { marginTop: theme.spacing(1.5) },
        }),
      },
    },

    // Navbar solid green (like site)
    MuiAppBar: { styleOverrides: { root: { backgroundColor: BRAND_PRIMARY } } },

    MuiButton: {
      defaultProps: { size: 'medium', disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 5,
          textTransform: 'uppercase',
          fontWeight: 700,
          letterSpacing: '0.5px',
          padding: '0.7em 1.4em',
          fontSize: '0.875rem',
          border: '1px solid transparent',
          transition: 'border-color 0.25s, background-color 0.25s',
          '&:focus-visible': { boxShadow: `0 0 0 3px ${alpha(BRAND_PRIMARY, 0.25)}` },
          lineHeight: 1.2,
          minHeight: '48px',
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

    MuiChip: { styleOverrides: { root: { borderRadius: 10, fontWeight: 600 } } },
    MuiListItemText: { styleOverrides: { primary: { fontWeight: 600 } } },

    MuiLink: {
      styleOverrides: {
        root: {
          color: BRAND_PRIMARY,
          textUnderlineOffset: '2px',
          textDecorationThickness: '1.5px',
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

    // Form controls — crisp outline on focus like branded forms
    MuiTextField: {
      defaultProps: { fullWidth: true, size: 'medium', variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            borderRadius: theme.shape.borderRadius,
            '&.MuiInputBase-sizeSmall:not(.MuiInputBase-multiline)': {
              height: theme.spacing(5),
            },
            '&.MuiInputBase-sizeMedium:not(.MuiInputBase-multiline)': {
              height: theme.spacing(8),
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(BRAND_PRIMARY, 0.4),
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: BRAND_PRIMARY,
              boxShadow: `0 0 0 3px ${alpha(BRAND_PRIMARY, 0.12)}`,
            },
          },
          '& .MuiOutlinedInput-notchedOutline': { borderRadius: theme.shape.borderRadius },
          '& .MuiFormHelperText-root': { marginLeft: 0 },
          '& .MuiInputBase-input': { padding: '0.75rem 0.5rem', fontSize: '1rem' },
        }),
      },
    },

    MuiSelect: {
      defaultProps: { fullWidth: true, size: 'medium', variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          '&.MuiInputBase-root.MuiOutlinedInput-root': {
            borderRadius: theme.shape.borderRadius,
            '&.MuiInputBase-sizeSmall': { height: theme.spacing(5) },
            '&.MuiInputBase-sizeMedium': { height: theme.spacing(8) },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(BRAND_PRIMARY, 0.4) },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: BRAND_PRIMARY,
              boxShadow: `0 0 0 3px ${alpha(BRAND_PRIMARY, 0.12)}`,
            },
          },
          '& .MuiOutlinedInput-notchedOutline': { borderRadius: theme.shape.borderRadius },
          '& .MuiFormHelperText-root': { marginLeft: 0 },
        }),
        select: { padding: '0.75rem 0.5rem', fontSize: '1rem' },
      },
    },

    MuiFormControl: { defaultProps: { fullWidth: true } },

    // Tabs
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: BRAND_PRIMARY, height: 3 } } },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          '&.Mui-selected': { color: BRAND_PRIMARY, fontWeight: 700 },
          '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${alpha(BRAND_PRIMARY, 0.25)}` },
        },
      },
    },

    // Tables/lists
    MuiTable: {
      defaultProps: { stickyHeader: true },
    },
    MuiListItem: {
      styleOverrides: {
        root: { borderRadius: 5, '&:hover': { background: 'rgba(0,0,0,0.03)' } },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            background: '#fafafa',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          },
        },
      },
    },
    MuiTableCell: { styleOverrides: { root: { borderBottomColor: '#eee' } } },

    // Glassy overlays
    MuiPopover: { styleOverrides: { paper: { backdropFilter: 'blur(8px)' } } },
    MuiMenu:    { styleOverrides: { paper: { backdropFilter: 'blur(8px)' } } },
    MuiDialog:  { styleOverrides: { paper: { borderRadius: 5, backdropFilter: 'blur(10px)' } } },

    // Micro-interactions
    MuiIconButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          borderRadius: 5,
          transition: 'background-color 0.2s ease, transform 0.05s ease',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
          '&:active': { transform: 'translateY(0.5px)' },
        },
      },
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

    // Skeletons
    MuiSkeleton: { styleOverrides: { root: { borderRadius: 5 } } },
  },
});

theme = responsiveFontSizes(theme);

export { theme };

export function toggleHighContrast() {
  setHighContrast(!isHighContrast);
  window.location.reload();
}
