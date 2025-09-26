
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

  const identifierError = submitted && identifier.trim() === '';
  const passwordError = submitted && password === '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const normalizedIdentifier = identifier.trim();
    if (identifier !== normalizedIdentifier) {
      setIdentifier(normalizedIdentifier);
    }
    if (normalizedIdentifier === '' || password === '') {
      identifierRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const user = await login(normalizedIdentifier, password);
      const redirect = await onLogin(user);
      navigate(redirect);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 401) {
        setError('Password is incorrect.');
      } else if (apiErr?.status === 410) {
        setError('Password setup link expired');
        setResendOpen(true);
      } else if (apiErr?.status === 404) {
        setError(
          "Hmm... you don't seem to have an account with us. Please contact hearvestpantry@mjfoodbank.org to have one created.",
        );
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
    const base64UrlToUint8Array = (value: string) => {
      const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const str = atob(padded);
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i += 1) {
        bytes[i] = str.charCodeAt(i);
      }
      return bytes;
    };

    const bufferToBase64Url = (buffer: ArrayBuffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
      });
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
    };

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
            challenge: base64UrlToUint8Array(challenge),
          },
          mediation: 'conditional',
        })) as PublicKeyCredential | null;
        if (!cred) return;
        const rawId = bufferToBase64Url(cred.rawId);
        const clientDataJSON = bufferToBase64Url(cred.response.clientDataJSON);
        const authenticatorData = bufferToBase64Url((cred.response as AuthenticatorAssertionResponse).authenticatorData);
        const signature = bufferToBase64Url((cred.response as AuthenticatorAssertionResponse).signature);
        const userHandle = (cred.response as AuthenticatorAssertionResponse).userHandle;
        const userHandleEncoded = userHandle ? bufferToBase64Url(userHandle) : null;
        const verifyRes = await fetch('/api/v1/webauthn/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: cred.id,
            rawId,
            type: cred.type,
            clientExtensionResults: cred.getClientExtensionResults(),
            response: {
              clientDataJSON,
              authenticatorData,
              signature,
              userHandle: userHandleEncoded,
            },
          }),
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
          justifyContent={{ xs: 'flex-start', sm: 'center' }}
          minHeight={{ xs: 'auto', sm: '80vh' }}
          px={2}
          pt={{ xs: 6, sm: 0 }}
          pb={{ xs: 6, sm: 0 }}
        >
          <CircularProgress color="primary" />
        </Box>
      ) : hasStaff ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent={{ xs: 'flex-start', sm: 'center' }}
          minHeight={{ xs: 'auto', sm: '80vh' }}
          px={2}
          pt={{ xs: 6, sm: 0 }}
          pb={{ xs: 6, sm: 0 }}
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
