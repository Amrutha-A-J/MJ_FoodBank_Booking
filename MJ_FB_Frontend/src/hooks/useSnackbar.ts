import { useState } from 'react';
import type { AlertColor } from '@mui/material';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

export default function useSnackbar() {
  const [state, setState] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message: string, severity: AlertColor = 'success') => {
    setState({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setState(prev => ({ ...prev, open: false }));
  };

  return {
    open: state.open,
    message: state.message,
    severity: state.severity,
    showSnackbar,
    closeSnackbar,
  };
}

