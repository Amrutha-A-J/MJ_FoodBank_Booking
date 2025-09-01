import { render, type RenderOptions } from '@testing-library/react';
import { AuthProvider } from '../src/hooks/useAuth';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '../src/theme';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from '../src/utils/date';
import type { ReactElement, ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: ProvidersProps): JSX.Element {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              dateLibInstance={dayjs}
            >
              <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
              </ThemeProvider>
            </LocalizationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </I18nextProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
