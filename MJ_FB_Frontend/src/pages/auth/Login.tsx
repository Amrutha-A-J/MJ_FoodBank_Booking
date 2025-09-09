
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../api/users';
import type { LoginResponse } from '../../api/users';
import type { ApiError } from '../../api/client';
import { Link, TextField, Button, Box, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PasswordField from '../../components/PasswordField';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import PasswordResetDialog from '../../components/PasswordResetDialog';
import ResendPasswordSetupDialog from '../../components/ResendPasswordSetupDialog';
import { useTranslation } from 'react-i18next';
import { logEvent } from '../../analytics';

export default function Login({
  onLogin,
}: {
  onLogin: (user: LoginResponse) => Promise<string>;
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const count = Number(localStorage.getItem('clientLoginNoticeCount') ?? '0');
    setNoticeOpen(count < 3);
  }, []);

  function handleNoticeClose() {
    const count = Number(localStorage.getItem('clientLoginNoticeCount') ?? '0') + 1;
    localStorage.setItem('clientLoginNoticeCount', String(count));
    setNoticeOpen(false);
  }

  const identifierError = submitted && identifier === '';
  const passwordError = submitted && password === '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (identifier === '' || password === '') return;
    try {
      logEvent('login_attempt');
      const user = await login(identifier, password);
      const redirect = await onLogin(user);
      logEvent('login_success');
      navigate(redirect);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      logEvent('login_error', { status: apiErr?.status });
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
    <Page title={t('login')}>
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="80vh" px={2}>
        <FormCard
          onSubmit={handleSubmit}
          title={t('login')}
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
          centered={false}
          boxProps={{ minHeight: 0, px: 0, py: 0 }}
        >
          <TextField
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            label={t('client_id_or_email')}
            name="identifier"
            autoComplete="username"
            fullWidth
            required
            error={identifierError}
            helperText={identifierError ? t('client_id_required') : ''}
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
          <Link component="button" type="button" onClick={() => setResetOpen(true)} underline="hover">
            {t('forgot_password')}
          </Link>
        </FormCard>
      </Box>
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <Dialog open={noticeOpen} onClose={handleNoticeClose}>
        <DialogContent sx={{ position: 'relative', pt: 4 }}>
          <IconButton
            aria-label="close"
            onClick={handleNoticeClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="body2" paragraph>
            {t('client_login_notice_id')}
          </Typography>
          <Typography variant="body2" paragraph>
            {t('client_login_notice_internal')}
          </Typography>
          <Typography variant="body2" paragraph>
            {t('client_login_notice_password')}
          </Typography>
          <Typography variant="body2" paragraph>
            {t('client_login_notice_volunteer')}
          </Typography>
          <Typography variant="body2" paragraph>
            {t('client_login_notice_close')}
          </Typography>
        </DialogContent>
      </Dialog>
      <ResendPasswordSetupDialog open={resendOpen} onClose={() => setResendOpen(false)} />
    </Page>
  );
}
