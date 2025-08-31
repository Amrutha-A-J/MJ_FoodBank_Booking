import { useState } from 'react';
import { useSearchParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { TextField, Button, Link, Box } from '@mui/material';
import Page from '../../components/Page';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { setPassword as setPasswordApi } from '../../api/users';
import ResendPasswordSetupDialog from '../../components/ResendPasswordSetupDialog';
import LanguageSelector from '../../components/LanguageSelector';
import { useTranslation } from 'react-i18next';

export default function PasswordSetup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resendOpen, setResendOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(t('invalid_or_expired_token'));
      return;
    }
    try {
      const loginPath = await setPasswordApi(token, password);
      navigate(loginPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (msg.toLowerCase().includes('expired token')) {
        setResendOpen(true);
      }
    }
  }

  return (
    <Page title={t('set_password')} header={<Box textAlign="right"><LanguageSelector /></Box>}>
      <FormCard
        onSubmit={handleSubmit}
        title={t('set_password')}
        actions={
          <Button type="submit" variant="contained" color="primary" fullWidth>
            {t('set_password')}
          </Button>
        }
      >
        <TextField
          type="password"
          label={t('password')}
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          required
        />
        <Link component={RouterLink} to="/login" underline="hover">
          {t('back_to_login')}
        </Link>
        {error.toLowerCase().includes('expired token') && (
          <Link component="button" onClick={() => setResendOpen(true)} underline="hover">
            {t('resend_link')}
          </Link>
        )}
      </FormCard>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
      <ResendPasswordSetupDialog open={resendOpen} onClose={() => setResendOpen(false)} />
    </Page>
  );
}
