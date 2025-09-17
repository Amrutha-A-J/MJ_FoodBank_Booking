import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ThemeProvider, CssBaseline, CircularProgress } from '@mui/material';
import { theme } from './theme';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { AuthProvider } from './hooks/useAuth';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from './utils/date';
import { registerSW } from 'virtual:pwa-register';

const App = React.lazy(() => import('./App'));

function Main() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} dateLibInstance={dayjs}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Suspense fallback={<CircularProgress />}>
              <App />
            </Suspense>
          </ThemeProvider>
        </LocalizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const container = document.getElementById('root')!;
const root = ReactDOM.createRoot(container);

const updateServiceWorker = registerSW({ immediate: true });

void updateServiceWorker(true);

root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>,
);

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => root.unmount());
}

export default Main;

