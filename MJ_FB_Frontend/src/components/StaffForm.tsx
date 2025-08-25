import { useState } from 'react';
import { Box, Stack, TextField, Checkbox, FormControlLabel, Button, Typography } from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';
import type { StaffAccess } from '../types';

interface StaffFormProps {
  initial?: {
    firstName: string;
    lastName: string;
    email: string;
    access: StaffAccess[];
  };
  submitLabel: string;
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    access: StaffAccess[];
  }) => Promise<void>;
}

export default function StaffForm({ initial, submitLabel, onSubmit }: StaffFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName || '');
  const [lastName, setLastName] = useState(initial?.lastName || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [password, setPassword] = useState('');
  const [access, setAccess] = useState<StaffAccess[]>(initial?.access || []);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit() {
    if (!firstName || !lastName || !email || (!initial && !password)) {
      setError('All fields required');
      return;
    }
    try {
      await onSubmit({ firstName, lastName, email, password: password || undefined, access });
      setSuccess('Saved');
      if (!initial) {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setAccess([]);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  function toggleAccess(a: StaffAccess) {
    setAccess(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a],
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
      <Box maxWidth={400} width="100%" mt={4}>
        <Typography variant="h5" gutterBottom>
          {submitLabel}
        </Typography>
        <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
        <FeedbackSnackbar open={!!success} onClose={() => setSuccess('')} message={success} />
        <Stack spacing={2}>
          <TextField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <TextField label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <FormControlLabel
            control={<Checkbox checked={access.includes('pantry')} onChange={() => toggleAccess('pantry')} />}
            label="Pantry"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={access.includes('volunteer_management')}
                onChange={() => toggleAccess('volunteer_management')}
              />
            }
            label="Volunteer Management"
          />
          <FormControlLabel
            control={<Checkbox checked={access.includes('warehouse')} onChange={() => toggleAccess('warehouse')} />}
            label="Warehouse"
          />
          <FormControlLabel
            control={<Checkbox checked={access.includes('admin')} onChange={() => toggleAccess('admin')} />}
            label="Admin"
          />
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
