import { useState } from 'react';
import { loginAgency, type LoginResponse } from '../../api/users';
import { TextField, Button } from '@mui/material';
import PasswordField from '../../components/PasswordField';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import Page from '../../components/Page';
import ResendPasswordSetupDialog from '../../components/ResendPasswordSetupDialog';
import type { ApiError } from '../../api/client';

export default function AgencyLogin({
  onLogin,
}: {
  onLogin: (u: LoginResponse) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resendOpen, setResendOpen] = useState(false);

  const emailError = email === '';
  const passwordError = password === '';
  const formInvalid = emailError || passwordError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginAgency(email, password);
      await onLogin(user);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 401) {
        setError('Incorrect email or password');
      } else if (apiErr?.status === 403) {
        setError('Password setup link expired');
        setResendOpen(true);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return (
    <Page title="Agency Login">
      <FormCard
        onSubmit={submit}
        title="Agency Login"
        actions={
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={formInvalid}
          >
            Login
          </Button>
        }
      >
        <TextField
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          label="Email"
          fullWidth
          required
          error={emailError}
          helperText={emailError ? 'Email is required' : ''}
        />
        <PasswordField
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          label="Password"
          fullWidth
          required
          error={passwordError}
          helperText={passwordError ? 'Password is required' : ''}
        />
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
