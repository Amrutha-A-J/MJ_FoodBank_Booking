
import { useState, useEffect, useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { login, staffExists } from '../../api/users';
import type { LoginResponse } from '../../api/users';
import type { ApiError } from '../../api/client';
import { Link as MuiLink, TextField, Box, Stack, CircularProgress } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PasswordField from '../../components/PasswordField';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import PasswordResetDialog from '../../components/PasswordResetDialog';
import ResendPasswordSetupDialog from '../../components/ResendPasswordSetupDialog';
import FirstStaffSetup from './FirstStaffSetup';

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
  const [loading, setLoading] = useState(false);
  const [hasStaff, setHasStaff] = useState<boolean | null>(null);
  const [checkingStaff, setCheckingStaff] = useState(true);
  const [firstStaffMessage, setFirstStaffMessage] = useState('');
  const [staffCheckError, setStaffCheckError] = useState('');
  const navigate = useNavigate();
  const identifierRef = useRef<HTMLInputElement>(null);

  const identifierError = submitted && identifier === '';
  const passwordError = submitted && password === '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (identifier === '' || password === '') {
      identifierRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const user = await login(identifier, password);
      const redirect = await onLogin(user);
      navigate(redirect);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 401) {
        setError('Incorrect ID or email or password');
      } else if (apiErr?.status === 410) {
        setError('Password setup link expired');
        setResendOpen(true);
      } else if (apiErr?.status === 404) {
        setError('Don’t have an account? Ask staff for help.');
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
      identifierRef.current?.focus();
    }
  }

  useEffect(() => {
    let active = true;
    async function checkStaff() {
      try {
        const exists = await staffExists();
        if (!active) return;
        setHasStaff(exists);
      } catch (err: unknown) {
        if (!active) return;
        setStaffCheckError(err instanceof Error ? err.message : String(err));
        setHasStaff(true);
      } finally {
        if (active) {
          setCheckingStaff(false);
        }
      }
    }
    checkStaff();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hasStaff !== true) return;
    async function attemptPasskey() {
      if (!('credentials' in navigator)) return;
      try {
        const resp = await fetch('/api/v1/webauthn/challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const { challenge } = await resp.json();
        const cred = (await navigator.credentials.get({
          publicKey: {
            challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
          },
          mediation: 'conditional',
        })) as PublicKeyCredential | null;
        if (!cred) return;
        const credId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
        const verifyRes = await fetch('/api/v1/webauthn/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentialId: credId }),
        });
        if (!verifyRes.ok) {
          const err = await verifyRes.json();
          throw new Error(err.message);
        }
        const user = await verifyRes.json();
        const redirect = await onLogin(user);
        navigate(redirect);
      } catch {
        /* ignore */
      }
    }
    attemptPasskey();
  }, [navigate, onLogin, hasStaff]);

  return (
    <Page title="Login">
      {checkingStaff ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="80vh"
          px={2}
        >
          <CircularProgress color="primary" />
        </Box>
      ) : hasStaff ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="80vh"
          px={2}
        >
          <FormCard
            onSubmit={handleSubmit}
            title="Login"
            actions={
              <Stack spacing={2}>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="medium"
                  sx={{ minHeight: 48 }}
                  loading={loading}
                  disabled={loading}
                >
                  Login
                </LoadingButton>
                <MuiLink
                  component={RouterLink}
                  to="/privacy"
                  underline="hover"
                  textAlign="center"
                >
                  Privacy Policy
                </MuiLink>
              </Stack>
            }
            centered={false}
            boxProps={{ minHeight: 0, px: 0, py: 0 }}
          >
            <TextField
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              label="Client ID or Email"
              name="identifier"
              autoComplete="username webauthn"
              fullWidth
              size="medium"
              required
              error={identifierError}
              helperText={identifierError ? 'Client ID is required' : ''}
              autoFocus
              inputRef={identifierRef}
            />
            <PasswordField
              value={password}
              onChange={e => setPassword(e.target.value)}
              label="Password"
              name="password"
              autoComplete="current-password"
              fullWidth
              size="medium"
              required
              error={passwordError}
              helperText={passwordError ? 'Password is required' : ''}
            />
            <MuiLink
              component="button"
              type="button"
              onClick={() => setResetOpen(true)}
              underline="hover"
            >
              Forgot password?
            </MuiLink>
          </FormCard>
        </Box>
      ) : (
        <FirstStaffSetup
          onSuccess={message => {
            setFirstStaffMessage(message);
            setHasStaff(true);
          }}
        />
      )}
      {hasStaff && (
        <>
          <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} />
          <ResendPasswordSetupDialog open={resendOpen} onClose={() => setResendOpen(false)} />
        </>
      )}
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <FeedbackSnackbar
        open={!!staffCheckError}
        onClose={() => setStaffCheckError('')}
        message={staffCheckError}
        severity="error"
      />
      <FeedbackSnackbar
        open={!!firstStaffMessage}
        onClose={() => setFirstStaffMessage('')}
        message={firstStaffMessage}
        severity="success"
      />
    </Page>
  );
}
