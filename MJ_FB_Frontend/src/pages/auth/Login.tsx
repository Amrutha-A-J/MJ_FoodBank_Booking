import { useState } from 'react';
import { loginUser } from '../../api/users';
import type { LoginResponse } from '../../api/users';
import type { ApiError } from '../../api/client';
import { Link, TextField, Button, Alert } from '@mui/material';
import PasswordField from '../../components/PasswordField';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import PasswordResetDialog from '../../components/PasswordResetDialog';
import ResendPasswordSetupDialog from '../../components/ResendPasswordSetupDialog';
import { useTranslation } from 'react-i18next';

export default function Login({
  onLogin,
}: {
  onLogin: (user: LoginResponse) => Promise<void>;
}) {
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation();

  const clientIdError = submitted && clientId === '';
  const passwordError = submitted && password === '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (clientId === '' || password === '') return;
    try {
      const user = await loginUser(clientId, password);
      await onLogin(user);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 401) {
        setError(t('incorrect_id_password'));
      } else if (apiErr?.status === 403) {
        setError(t('password_setup_expired'));
        setResendOpen(true);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return (
    <Page title={t('client_login')}>
      <FormCard
        onSubmit={handleSubmit}
        title={t('client_login')}
        actions={
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            {t('login')}
          </Button>
        }
      >
        <Alert severity="info">
          {t('client_login_notice_id')}
        </Alert>
        <Alert severity="warning">
          {t('client_login_notice_password')}
        </Alert>
        <Alert severity="info">
          {t('client_login_notice_volunteer')}
        </Alert>
        <TextField
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          label={t('client_id')}
          name="clientId"
          autoComplete="username"
          fullWidth
          required
          error={clientIdError}
          helperText={clientIdError ? t('client_id_required') : ''}
        />
        <PasswordField
          value={password}
          onChange={e => setPassword(e.target.value)}
          label={t('password')}
          name="password"
          autoComplete="current-password"
          fullWidth
          required
          error={passwordError}
          helperText={passwordError ? t('password_required') : ''}
        />
        <Link component="button" onClick={() => setResetOpen(true)} underline="hover">
          {t('forgot_password')}
        </Link>
      </FormCard>
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} type="user" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <ResendPasswordSetupDialog open={resendOpen} onClose={() => setResendOpen(false)} />
    </Page>
  );
}
