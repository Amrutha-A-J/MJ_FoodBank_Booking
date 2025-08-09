import { useState } from 'react';
import { loginUser } from '../api/api';
import type { LoginResponse } from '../api/api';
import { Box, Link, Typography, TextField, Stack } from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormContainer from './FormContainer';

export default function Login({ onLogin, onStaff, onVolunteer }: { onLogin: (user: LoginResponse) => void; onStaff: () => void; onVolunteer: () => void }) {
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
    <Box>
      <Stack direction="row" spacing={2} mb={2}>
        <Link component="button" onClick={onStaff} underline="hover">Staff Login</Link>
        <Link component="button" onClick={onVolunteer} underline="hover">Volunteer Login</Link>
      </Stack>
      <Typography variant="h4" gutterBottom>User Login</Typography>
      <FormContainer onSubmit={handleSubmit} submitLabel="Login">
        <TextField value={clientId} onChange={e => setClientId(e.target.value)} label="Client ID" fullWidth />
        <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" fullWidth />
      </FormContainer>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </Box>
  );
}
