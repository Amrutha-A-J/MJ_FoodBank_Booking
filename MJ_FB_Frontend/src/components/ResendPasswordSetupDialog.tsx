import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
import { resendPasswordSetup } from '../api/users';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormCard from './FormCard';
import DialogCloseButton from './DialogCloseButton';

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
      setMessage('If the account exists, a setup link has been sent.');
      setIdentifier('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} aria-labelledby="resend-setup-dialog-title">
        <DialogCloseButton onClose={onClose} />
        <DialogTitle id="resend-setup-dialog-title" sx={{ display: 'none' }}>
          Resend Password Setup Link
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <FormCard
            title="Resend Password Setup Link"
            onSubmit={handleSubmit}
            actions={<Button type="submit" variant="contained">Submit</Button>}
            boxProps={{ minHeight: 'auto', p: 0 }}
          >
            <TextField
              autoFocus
              margin="dense"
              label="Email or Client ID"
              fullWidth
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          </FormCard>
        </DialogContent>
      </Dialog>
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity="success" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
