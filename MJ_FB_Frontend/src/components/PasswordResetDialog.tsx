import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
import { requestPasswordReset } from '../api/users';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormCard from './FormCard';
import type { AlertColor } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';
import { useTranslation } from 'react-i18next';

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
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const { t } = useTranslation();

  const label =
    type === 'staff' || type === 'volunteer' ? t('email') : t('client_id');
  const formTitle = t('reset_password');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body: any =
        type === 'staff' || type === 'volunteer'
          ? { email: identifier }
          : { clientId: identifier };
      await requestPasswordReset(body);
      setSnackbarSeverity('success');
      setMessage(t('reset_link_sent'));
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
            actions={<Button type="submit" variant="contained">{t('submit')}</Button>}
            boxProps={{ minHeight: 'auto', p: 0 }}
          >
            <TextField
              autoFocus
              margin="dense"
              label={label}
              type={type === 'staff' || type === 'volunteer' ? 'email' : 'text'}
              name={type === 'staff' || type === 'volunteer' ? 'email' : 'clientId'}
              autoComplete={
                type === 'staff' || type === 'volunteer' ? 'email' : 'off'
              }
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
