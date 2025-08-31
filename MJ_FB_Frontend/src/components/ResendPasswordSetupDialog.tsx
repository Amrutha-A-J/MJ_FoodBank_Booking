import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
import { resendPasswordSetup } from '../api/users';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormCard from './FormCard';
import DialogCloseButton from './DialogCloseButton';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const value = identifier.trim();
      const body = /^\d+$/.test(value)
        ? { clientId: value }
        : { email: value };
      await resendPasswordSetup(body);
      setMessage(t('if_account_exists_setup'));
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
          {t('resend_password_setup_link')}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <FormCard
            title={t('resend_password_setup_link')}
            onSubmit={handleSubmit}
            actions={<Button type="submit" variant="contained">{t('submit')}</Button>}
            boxProps={{ minHeight: 'auto', p: 0 }}
          >
            <TextField
              autoFocus
              margin="dense"
              label={t('email_or_client_id')}
              name="email"
              autoComplete="email"
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
