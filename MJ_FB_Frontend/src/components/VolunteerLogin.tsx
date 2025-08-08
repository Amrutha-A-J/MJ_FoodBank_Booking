import { useState } from 'react';
import { loginVolunteer } from '../api/api';
import type { LoginResponse } from '../api/api';
import { Box, Typography, TextField, Button, Stack, Link } from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';

export default function VolunteerLogin({ onLogin, onBack }: { onLogin: (u: LoginResponse) => void; onBack: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginVolunteer(username, password);
      localStorage.setItem('token', user.token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('name', user.name);
      onLogin(user);
      window.location.href = '/volunteer-dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Box>
      <Link component="button" onClick={onBack} underline="hover">User Login</Link>
      <Typography variant="h4" gutterBottom>Volunteer Login</Typography>
      <Stack component="form" onSubmit={submit} spacing={2} mt={2}>
        <TextField value={username} onChange={e => setUsername(e.target.value)} label="Username" />
        <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" />
        <Button type="submit" variant="contained">Login</Button>
      </Stack>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </Box>
  );
}
