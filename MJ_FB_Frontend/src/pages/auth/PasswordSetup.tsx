import { useState, useEffect } from 'react';
import { useSearchParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { Button, Link } from '@mui/material';
import PasswordField from '../../components/PasswordField';
import Page from '../../components/Page';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import PasswordChecklist from '../../components/PasswordChecklist';
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
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const loginPathMap: Record<string, string> = {
    client: '/login',
    volunteer: '/login/volunteer',
    staff: '/login/staff',
    agency: '/login/agency',
  };

  useEffect(() => {
    if (!token) {
      setError(t('invalid_or_expired_token'));
      setTokenInvalid(true);
      return;
    }
    getPasswordSetupInfo(token)
      .then(data => setInfo(data))
      .catch(err => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setTokenInvalid(true);
      });
  }, [token, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || tokenInvalid) {
      setError(t('invalid_or_expired_token'));
      return;
    }
    if (password.length < 8) {
      setError(t('profile_page.password_min_length'));
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      setError(t('profile_page.password_number'));
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError(t('profile_page.password_symbol'));
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
          !tokenInvalid && (
            <Button type="submit" variant="contained" color="primary" fullWidth>
              {t('set_password')}
            </Button>
          )
        }
      >
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
        {tokenInvalid ? (
          <>
            <p>{t('invalid_or_expired_token')}</p>
            <Link
              component="button"
              onClick={() => setResendOpen(true)}
              underline="hover"
            >
              {t('resend_link')}
            </Link>
          </>
        ) : (
          <>
            <PasswordField
              label={t('password')}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              required
              helperText={t('profile_page.password_requirements')}
            />
            <PasswordChecklist password={password} />
            <Button
              component={RouterLink}
              to={info ? loginPathMap[info.userType] : '/login'}
              variant="outlined"
            >
              {t('back_to_login')}
            </Button>
          </>
        )}
      </FormCard>
      {!tokenInvalid && (
        <FeedbackSnackbar
          open={!!error}
          onClose={() => setError('')}
          message={error}
          severity="error"
        />
      )}
      <ResendPasswordSetupDialog open={resendOpen} onClose={() => setResendOpen(false)} />
    </Page>
  );
}
