import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginVolunteer } from '../../api/volunteers';
import type { LoginResponse } from '../../api/users';
import type { ApiError } from '../../api/client';
import { TextField, Link, Button } from '@mui/material';
import PasswordField from '../../components/PasswordField';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import PasswordResetDialog from '../../components/PasswordResetDialog';
import Page from '../../components/Page';
import ResendPasswordSetupDialog from '../../components/ResendPasswordSetupDialog';

export default function VolunteerLogin({
  onLogin,
}: {
  onLogin: (u: LoginResponse) => Promise<string>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const emailError = submitted && email === '';
  const passwordError = submitted && password === '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (email === '' || password === '') return;
    try {
      const user = await loginVolunteer(email, password);
      const path = await onLogin(user);
      navigate(path);
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
    <Page title="Volunteer Login">
      <FormCard
        onSubmit={submit}
        title="Volunteer Login"
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
        <Link component="button" onClick={() => setResetOpen(true)} underline="hover">Forgot password?</Link>
      </FormCard>
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} type="volunteer" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <ResendPasswordSetupDialog open={resendOpen} onClose={() => setResendOpen(false)} />
    </Page>
  );
}
