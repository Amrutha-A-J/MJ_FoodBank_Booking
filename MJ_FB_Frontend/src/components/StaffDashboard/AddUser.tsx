import { useState } from 'react';
import { addUser, createStaff } from '../../api/users';
import type { UserRole, StaffAccess } from '../../types';
import FeedbackSnackbar from '../FeedbackSnackbar';
import FeedbackModal from '../FeedbackModal';
import {
  Box,
  Button,
  Stack,
  TextField,
  MenuItem,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

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
  const [password, setPassword] = useState('');
  const [access, setAccess] = useState<StaffAccess[]>([]);

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
      await createStaff(firstName, lastName, access, email, password, token);
      setSuccess('Staff added successfully');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setAccess([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
      <Box maxWidth={400} width="100%" mt={4}>
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
            <TextField
              label="Phone (optional)"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
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
            <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={access.includes('staff')}
                  onChange={e =>
                    setAccess(prev =>
                      e.target.checked
                        ? [...prev, 'staff']
                        : prev.filter(a => a !== 'staff'),
                    )
                  }
                />
              }
              label="Staff"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={access.includes('volunteer_management')}
                  onChange={e =>
                    setAccess(prev =>
                      e.target.checked
                        ? [...prev, 'volunteer_management']
                        : prev.filter(a => a !== 'volunteer_management'),
                    )
                  }
                />
              }
              label="Volunteer Management"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={access.includes('warehouse')}
                  onChange={e =>
                    setAccess(prev =>
                      e.target.checked
                        ? [...prev, 'warehouse']
                        : prev.filter(a => a !== 'warehouse'),
                    )
                  }
                />
              }
              label="Warehouse"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={access.includes('admin')}
                  onChange={e =>
                    setAccess(prev =>
                      e.target.checked
                        ? [...prev, 'admin']
                        : prev.filter(a => a !== 'admin'),
                    )
                  }
                />
              }
              label="Admin"
            />
            <Button variant="contained" color="primary" onClick={submitStaff}>
              Add Staff
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

