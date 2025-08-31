import { useState } from 'react';
import { loginUser } from '../../api/users';
import type { LoginResponse } from '../../api/users';
import type { ApiError } from '../../api/client';
import { Link, TextField, Button } from '@mui/material';
import Page from '../../components/Page';
import { Link as RouterLink } from 'react-router-dom';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import PasswordResetDialog from '../../components/PasswordResetDialog';
import ResendPasswordSetupDialog from '../../components/ResendPasswordSetupDialog';

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
        setError('Incorrect ID or password');
      } else if (apiErr?.status === 403) {
        setError('Password setup link expired');
        setResendOpen(true);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return (
    <Page title="Client Login">
      <FormCard
        onSubmit={handleSubmit}
        title="Client Login"
        actions={
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            Login
          </Button>
        }
      >
        <TextField
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          label="Client ID"
          name="clientId"
          autoComplete="username"
          fullWidth
          required
          error={clientIdError}
          helperText={clientIdError ? 'Client ID is required' : ''}
        />
        <TextField
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          label="Password"
          name="password"
          autoComplete="current-password"
          fullWidth
          required
          error={passwordError}
          helperText={passwordError ? 'Password is required' : ''}
        />
        <Link component="button" onClick={() => setResetOpen(true)} underline="hover">
          Forgot password?
        </Link>
      </FormCard>
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} type="user" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <ResendPasswordSetupDialog open={resendOpen} onClose={() => setResendOpen(false)} />
    </Page>
  );
}
