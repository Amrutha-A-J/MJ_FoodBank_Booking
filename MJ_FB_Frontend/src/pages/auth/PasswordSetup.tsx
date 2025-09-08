import { useState, useEffect } from 'react';
import { useSearchParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { Button, Link } from '@mui/material';
import PasswordField from '../../components/PasswordField';
import Page from '../../components/Page';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  setPassword as setPasswordApi,
  getPasswordSetupInfo,
  type PasswordSetupInfo,
} from '../../api/users';
import ResendPasswordSetupDialog from '../../components/ResendPasswordSetupDialog';
import { useTranslation } from 'react-i18next';

export default function PasswordSetup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resendOpen, setResendOpen] = useState(false);
  const [info, setInfo] = useState<PasswordSetupInfo | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const loginPathMap: Record<string, string> = {
    client: '/login',
    volunteer: '/login/volunteer',
    staff: '/login/staff',
    agency: '/login/agency',
  };
  const loginMessageMap: Record<string, string> = {
    client: 'use_client_login',
    volunteer: 'use_volunteer_login',
    staff: 'use_staff_login',
    agency: 'use_agency_login',
  };

  useEffect(() => {
    if (!token) return;
    getPasswordSetupInfo(token)
      .then(data => setInfo(data))
      .catch(() => undefined);
  }, [token]);

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
    <Page title={t('set_password')}>
      <FormCard
        onSubmit={handleSubmit}
        title={t('set_password')}
        actions={
          <Button type="submit" variant="contained" color="primary" fullWidth>
            {t('set_password')}
          </Button>
        }
      >
        <PasswordField
          label={t('password')}
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          required
        />
        {info?.clientId && (
          <p>
            {t('client_id')}: {info.clientId}
          </p>
        )}
        {info?.email && (
          <p>
            {t('email')}: {info.email}
          </p>
        )}
        {info?.userType && (
          <p>{t(loginMessageMap[info.userType])}</p>
        )}
        <Button
          component={RouterLink}
          to={info ? loginPathMap[info.userType] : '/login'}
          variant="outlined"
          size="small"
        >
          {t('back_to_login')}
        </Button>
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
