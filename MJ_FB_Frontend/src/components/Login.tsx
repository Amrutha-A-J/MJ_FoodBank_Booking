import { useState } from 'react';
import { loginUser } from '../api/api';
import type { LoginResponse } from '../api/api';
import { formatInTimeZone } from 'date-fns-tz';
import { Box, Link, Typography, TextField, Button, Stack } from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';

export default function Login({ onLogin, onStaff, onVolunteer }: { onLogin: (user: LoginResponse) => void; onStaff: () => void; onVolunteer: () => void }) {
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginUser(clientId, password);
      localStorage.setItem('token', user.token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('name', user.name);
      if (user.bookingsThisMonth !== undefined) {
        localStorage.setItem('bookingsThisMonth', user.bookingsThisMonth.toString());
        const currentMonth = formatInTimeZone(new Date(), 'America/Regina', 'yyyy-MM');
        localStorage.setItem('bookingsMonth', currentMonth);
      }
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
      <Box component="form" onSubmit={handleSubmit} mt={2}>
        <Stack spacing={2}>
          <TextField value={clientId} onChange={e => setClientId(e.target.value)} label="Client ID" />
          <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" />
          <Button type="submit" variant="outlined" color="primary">Login</Button>
        </Stack>
      </Box>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </Box>
  );
}
