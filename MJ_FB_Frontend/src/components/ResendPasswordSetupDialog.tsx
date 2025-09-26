import { useState } from 'react';
import { DialogContent, DialogTitle, Button, TextField, Typography } from '@mui/material';
import { resendPasswordSetup } from '../api/users';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormCard from './FormCard';
import DialogCloseButton from './DialogCloseButton';
import FormDialog from './FormDialog';

export default function ResendPasswordSetupDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const value = identifier.trim();
      const body = /^\d+$/.test(value)
        ? { clientId: value }
        : { email: value };
      await resendPasswordSetup(body);
      setMessage('Password setup link sent');
      setIdentifier('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <FormDialog open={open} onClose={onClose} aria-labelledby="resend-setup-dialog-title">
        <DialogCloseButton onClose={onClose} />
        <DialogTitle id="resend-setup-dialog-title" sx={{ display: 'none' }}>
          Resend password setup link
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <FormCard
            title="Resend password setup link"
            onSubmit={handleSubmit}
            actions={
              <Button type="submit" variant="contained" fullWidth sx={{ minHeight: 48 }}>
                Submit
              </Button>
            }
            boxProps={{ minHeight: 'auto', p: 0 }}
          >
            <Typography variant="body2">
              Enter your email or client ID and we'll send you a new setup link.
            </Typography>
            <TextField
              autoFocus
              label="Email or client ID"
              name="email"
              autoComplete="email"
              fullWidth
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          </FormCard>
        </DialogContent>
      </FormDialog>
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity="success" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
