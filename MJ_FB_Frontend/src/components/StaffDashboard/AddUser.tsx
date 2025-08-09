import { useState } from 'react';
import { addUser, createStaff } from '../../api/api';
import type { UserRole, StaffRole } from '../../types';
import FeedbackSnackbar from '../FeedbackSnackbar';
import FeedbackModal from '../FeedbackModal';
import { Box, Button, Stack, TextField, MenuItem, Typography } from '@mui/material';

export default function AddUser({ token }: { token: string }) {
  const [mode, setMode] = useState<'user' | 'staff'>('user');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('shopper');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clientId, setClientId] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('staff');
  const [password, setPassword] = useState('');

  async function submitUser() {
    if (!firstName || !lastName || !clientId || !password) {
      setError('First name, last name, client ID and password required');
      return;
    }
    try {
      await addUser(
        token,
        firstName,
        lastName,
        clientId,
        role,
        password,
        email || undefined,
        phone || undefined
      );
      setSuccess('User added successfully');
      setFirstName('');
      setLastName('');
      setClientId('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRole('shopper');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function submitStaff() {
    if (!firstName || !lastName || !email || !password) {
      setError('All fields required');
      return;
    }
    try {
      await createStaff(firstName, lastName, staffRole, email, password, token);
      setSuccess('Staff added successfully');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setStaffRole('staff');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {mode === 'user' ? 'Create User' : 'Create Staff'}
      </Typography>
      <Stack direction="row" spacing={1} mb={2}>
        <Button variant="outlined" color="primary" onClick={() => setMode('user')}>
          Create User
        </Button>
        <Button variant="outlined" color="primary" onClick={() => setMode('staff')}>
          Create Staff
        </Button>
      </Stack>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <FeedbackModal open={!!success} onClose={() => setSuccess('')} message={success} />
      {mode === 'user' ? (
        <Stack spacing={2}>
          <TextField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <TextField label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          <TextField label="Client ID" value={clientId} onChange={e => setClientId(e.target.value)} />
          <TextField label="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <TextField label="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <TextField select label="Role" value={role} onChange={e => setRole(e.target.value as UserRole)}>
            <MenuItem value="shopper">Shopper</MenuItem>
            <MenuItem value="delivery">Delivery</MenuItem>
          </TextField>
          <Button variant="contained" color="primary" onClick={submitUser}>
            Add User
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <TextField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <TextField label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          <TextField
            select
            label="Staff Role"
            value={staffRole}
            onChange={e => setStaffRole(e.target.value as StaffRole)}
          >
            <MenuItem value="staff">Staff</MenuItem>
          </TextField>
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <Button variant="contained" color="primary" onClick={submitStaff}>
            Add Staff
          </Button>
        </Stack>
      )}
    </Box>
  );
}

