import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { registerServiceWorker } from './registerServiceWorker';
import { AuthProvider } from './hooks/useAuth';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from './utils/date';

function Main() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} dateLibInstance={dayjs}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </LocalizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>,
);

registerServiceWorker();

export default Main;

