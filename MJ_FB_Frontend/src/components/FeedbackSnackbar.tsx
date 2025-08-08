import type { AlertColor } from '@mui/material';
import { Snackbar, Alert } from '@mui/material';
import type { SyntheticEvent } from 'react';

interface FeedbackSnackbarProps {
  open: boolean;
  onClose: () => void;
  message: string;
  severity?: AlertColor;
  duration?: number;
}

export default function FeedbackSnackbar({
  open,
  onClose,
  message,
  severity = 'success',
  duration = 6000,
}: FeedbackSnackbarProps) {
  function handleClose(_?: SyntheticEvent | Event, reason?: string) {
    if (reason === 'clickaway') return;
    onClose();
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}

