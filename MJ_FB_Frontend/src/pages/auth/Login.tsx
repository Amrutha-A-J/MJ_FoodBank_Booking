import { useState } from 'react';
import { loginUser } from '../../api/users';
import type { LoginResponse } from '../../api/users';
import { Link, TextField, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import PasswordResetDialog from '../../components/PasswordResetDialog';

export default function Login({
  onLogin,
}: {
  onLogin: (user: LoginResponse) => Promise<void>;
}) {
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
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
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
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
          fullWidth
          required
          error={passwordError}
          helperText={passwordError ? 'Password is required' : ''}
        />
        <Link component="button" onClick={() => setResetOpen(true)} underline="hover">
          Forgot password?
        </Link>
        <Link component={RouterLink} to="/signup" underline="hover">
          Need an account? Sign up
        </Link>
      </FormCard>
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} type="user" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
