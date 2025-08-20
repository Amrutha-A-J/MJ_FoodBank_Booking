import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerServiceWorker } from './registerServiceWorker';
import { AuthProvider } from './hooks/useAuth';

function Main() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
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

