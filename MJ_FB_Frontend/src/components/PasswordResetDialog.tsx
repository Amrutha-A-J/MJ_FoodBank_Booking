import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { requestPasswordReset } from '../api/users';
import FeedbackSnackbar from './FeedbackSnackbar';

export default function PasswordResetDialog({
  open,
  onClose,
  type,
}: {
  open: boolean;
  onClose: () => void;
  type: 'user' | 'staff' | 'volunteer';
}) {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const label =
    type === 'staff' ? 'Email' : type === 'volunteer' ? 'Username' : 'Client ID';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body: any =
        type === 'staff'
          ? { email: identifier }
          : type === 'volunteer'
          ? { username: identifier }
          : { clientId: identifier };
      await requestPasswordReset(body);
      setMessage('If the account exists, a reset link has been sent.');
      setIdentifier('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} component="form" onSubmit={handleSubmit}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={label}
            type={type === 'staff' ? 'email' : 'text'}
            fullWidth
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Submit</Button>
        </DialogActions>
      </Dialog>
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity="success" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
