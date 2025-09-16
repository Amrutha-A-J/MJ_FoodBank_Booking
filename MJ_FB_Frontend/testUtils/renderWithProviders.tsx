import { render, type RenderOptions } from '@testing-library/react';
import { AuthProvider } from '../src/hooks/useAuth';
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
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function Wrapper({ children }: ProvidersProps): ReactElement {
    return (
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
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
