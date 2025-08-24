import { useState } from 'react';
import { loginUser } from '../api/users';
import type { LoginResponse } from '../api/users';
import { Link, TextField, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormContainer from './FormContainer';
import PasswordResetDialog from './PasswordResetDialog';

export default function Login({ onLogin }: { onLogin: (user: LoginResponse) => void }) {
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginUser(clientId, password);
      onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <FormContainer
        onSubmit={handleSubmit}
        submitLabel="Login"
        title="Client Login"
        header={
          <Stack direction="row" spacing={2} justifyContent="center">
            <Link component={RouterLink} to="/login/staff" underline="hover">
              Staff Login
            </Link>
            <Link component={RouterLink} to="/login/volunteer" underline="hover">
              Volunteer Login
            </Link>
          </Stack>
        }
      >
        <TextField value={clientId} onChange={e => setClientId(e.target.value)} label="Client ID" fullWidth />
        <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" fullWidth />
        <Link component="button" onClick={() => setResetOpen(true)} underline="hover">
          Forgot password?
        </Link>
      </FormContainer>
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} type="user" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
