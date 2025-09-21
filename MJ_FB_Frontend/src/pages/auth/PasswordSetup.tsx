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

export default function PasswordSetup() {
  const LOGIN_PATH = '/login';
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resendOpen, setResendOpen] = useState(false);
  const [info, setInfo] = useState<PasswordSetupInfo | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Invalid or expired token.');
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
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || tokenInvalid) {
      setError('Invalid or expired token.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      setError('Password must include uppercase and lowercase letters.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('Password must include a symbol.');
      return;
    }
    try {
      await setPasswordApi(token, password);
      navigate(LOGIN_PATH);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (msg.toLowerCase().includes('expired token')) {
        setResendOpen(true);
      }
    }
  }

  return (
    <Page title="Set Password">
      <FormCard
        onSubmit={handleSubmit}
        title="Set Password"
        actions={
          !tokenInvalid && (
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Set Password
            </Button>
          )
        }
      >
        {info?.clientId && (
          <p>
            Client ID: {info.clientId}
          </p>
        )}
        {info?.email && (
          <p>
            Email: {info.email}
          </p>
        )}
        {tokenInvalid ? (
          <>
            <p>Invalid or expired token.</p>
            <Link
              component="button"
              onClick={() => setResendOpen(true)}
              underline="hover"
            >
              Resend link
            </Link>
          </>
        ) : (
          <>
            <PasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              required
              helperText="Must be at least 8 characters and include uppercase, lowercase, and special characters."
            />
            <PasswordChecklist password={password} />
            <Button component={RouterLink} to={LOGIN_PATH} variant="outlined">
              Back to login
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
