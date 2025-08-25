import { useState } from 'react';
import { addUser } from '../../api/users';
import type { UserRole } from '../../types';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FeedbackModal from '../../components/FeedbackModal';
import { Box, Button, Stack, TextField, MenuItem, Typography, FormControlLabel, Checkbox } from '@mui/material';

export default function AddClient({ token }: { token: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('shopper');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [onlineAccess, setOnlineAccess] = useState(false);

  async function submitUser() {
    if (onlineAccess) {
      if (!firstName || !lastName || !clientId || !password) {
        setError('First name, last name, client ID and password required');
        return;
      }
    } else if (!clientId) {
      setError('Client ID required');
      return;
    }
    try {
      await addUser(
        token,
        firstName,
        lastName,
        clientId,
        role,
        onlineAccess ? password : undefined,
        onlineAccess,
        email || undefined,
        phone || undefined
      );
      setSuccess('Client added successfully');
      setFirstName('');
      setLastName('');
      setClientId('');
      setEmail('');
      setPhone('');
      setPassword('');
      setOnlineAccess(false);
      setRole('shopper');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
      <Box maxWidth={400} width="100%" mt={4}>
        <Typography variant="h5" gutterBottom>
          Create Client
        </Typography>
        <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
        <FeedbackModal open={!!success} onClose={() => setSuccess('')} message={success} />
        <Stack spacing={2}>
          <FormControlLabel
            control={<Checkbox checked={onlineAccess} onChange={e => setOnlineAccess(e.target.checked)} />}
            label="Online Access"
          />
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
          {onlineAccess && (
            <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          )}
          <TextField select label="Role" value={role} onChange={e => setRole(e.target.value as UserRole)}>
            <MenuItem value="shopper">Shopper</MenuItem>
            <MenuItem value="delivery">Delivery</MenuItem>
          </TextField>
          <Button variant="contained" color="primary" onClick={submitUser}>
            Add Client
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

