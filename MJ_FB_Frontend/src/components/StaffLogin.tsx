import { useEffect, useState } from 'react';
import { loginStaff, staffExists, createStaff } from '../api/api';
import type { LoginResponse } from '../api/api';
import { Box, Typography, TextField, Button, Stack, Link } from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';
import FeedbackModal from './FeedbackModal';

export default function StaffLogin({ onLogin, onBack }: { onLogin: (u: LoginResponse) => void; onBack: () => void }) {
  const [checking, setChecking] = useState(true);
  const [hasStaff, setHasStaff] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    staffExists()
      .then(exists => {
        setHasStaff(exists);
        setChecking(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : String(err));
        setChecking(false);
      });
  }, []);

  if (checking) return <div>Loading...</div>;

  return hasStaff ? (
    <StaffLoginForm onLogin={onLogin} error={error} onBack={onBack} />
  ) : (
    <CreateStaffForm onCreated={() => setHasStaff(true)} error={error} />
  );
}

function StaffLoginForm({ onLogin, error: initError, onBack }: { onLogin: (u: LoginResponse) => void; error: string; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initError);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginStaff(email, password);
      if (user.role === 'shopper' || user.role === 'delivery') {
        setError('Not a staff account');
        return;
      }
      onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Box>
      <Link component="button" onClick={onBack} underline="hover">User Login</Link>
      <Typography variant="h4" gutterBottom>Staff Login</Typography>
      <Box component="form" onSubmit={submit} mt={2}>
        <Stack spacing={2}>
          <TextField value={email} onChange={e => setEmail(e.target.value)} label="Email" />
          <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" />
          <Button type="submit" variant="outlined" color="primary">Login</Button>
        </Stack>
      </Box>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </Box>
  );
}

function CreateStaffForm({ onCreated, error: initError }: { onCreated: () => void; error: string }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initError);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createStaff(firstName, lastName, 'staff', email, password);
      setMessage('Staff account created. You can login now.');
      setTimeout(onCreated, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Create Staff Account</Typography>
      <Box component="form" onSubmit={submit} mt={2}>
        <Stack spacing={2}>
          <TextField value={firstName} onChange={e => setFirstName(e.target.value)} label="First name" />
          <TextField value={lastName} onChange={e => setLastName(e.target.value)} label="Last name" />
          <TextField type="email" value={email} onChange={e => setEmail(e.target.value)} label="Email" />
          <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" />
          <Button type="submit" variant="outlined" color="primary">Create Staff</Button>
        </Stack>
      </Box>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <FeedbackModal open={!!message} onClose={() => setMessage('')} message={message} />
    </Box>
  );
}
