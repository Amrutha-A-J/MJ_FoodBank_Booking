import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Button, TextField, Typography } from '@mui/material';
import { requestPasswordReset } from '../api/users';
import type { PasswordResetBody } from '../types';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormCard from './FormCard';
import type { AlertColor } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';

export default function PasswordResetDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');

  const formTitle = 'Reset password';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const trimmedIdentifier = identifier.trim();
      const body: PasswordResetBody =
        trimmedIdentifier.includes('@') || !/^\d+$/.test(trimmedIdentifier)
          ? { email: trimmedIdentifier }
          : { clientId: trimmedIdentifier };
      await requestPasswordReset(body);
      setSnackbarSeverity('success');
      setMessage('If an account exists, a reset link has been sent.');
      setIdentifier('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} aria-labelledby="password-reset-dialog-title">
        <DialogCloseButton onClose={onClose} />
        <DialogTitle id="password-reset-dialog-title" sx={{ display: 'none' }}>
          {formTitle}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <FormCard
            title={formTitle}
            onSubmit={handleSubmit}
            actions={<Button type="submit" variant="contained">Submit</Button>}
            boxProps={{ minHeight: 'auto', p: 0 }}
          >
            <Typography variant="body2">
              Enter your email address or client ID to receive a reset link.
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Email or client ID"
              type="text"
              name="identifier"
              autoComplete="email"
              fullWidth
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          </FormCard>
        </DialogContent>
      </Dialog>
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity={snackbarSeverity} />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
