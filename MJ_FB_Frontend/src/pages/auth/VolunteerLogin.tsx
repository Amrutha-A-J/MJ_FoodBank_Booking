import { useState } from 'react';
import { loginVolunteer } from '../../api/volunteers';
import type { LoginResponse } from '../../api/users';
import { TextField, Link, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import PasswordResetDialog from '../../components/PasswordResetDialog';
import Page from '../../components/Page';

export default function VolunteerLogin({
  onLogin,
}: {
  onLogin: (u: LoginResponse) => Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const usernameError = submitted && username === '';
  const passwordError = submitted && password === '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (username === '' || password === '') return;
    try {
      const user = await loginVolunteer(username, password);
      await onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
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
          value={username}
          onChange={e => setUsername(e.target.value)}
          label="Username"
          fullWidth
          required
          error={usernameError}
          helperText={usernameError ? 'Username is required' : ''}
        />
        <TextField
          type="password"
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
    </Page>
  );
}
