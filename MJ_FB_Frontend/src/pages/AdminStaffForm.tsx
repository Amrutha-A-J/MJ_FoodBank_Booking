import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createStaff, getStaff, updateStaff } from '../api/adminStaff';
import type { StaffRole } from '../types';
import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import FeedbackSnackbar from '../components/FeedbackSnackbar';

export default function AdminStaffForm({ token }: { token: string }) {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const s = await getStaff(token, Number(id));
          setFirstName(s.first_name);
          setLastName(s.last_name);
          setEmail(s.email);
          setRole(s.role);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })();
    }
  }, [id, isEdit, token]);

  async function handleSubmit() {
    if (!firstName || !lastName || !email || (!isEdit && !password)) {
      setError('All fields required');
      return;
    }
    try {
      if (isEdit) {
        await updateStaff(token, Number(id), {
          firstName,
          lastName,
          email,
          role,
          ...(password ? { password } : {}),
        });
        setSuccess('Staff updated');
      } else {
        await createStaff(token, {
          firstName,
          lastName,
          email,
          role,
          password,
        });
        setSuccess('Staff created');
        setFirstName('');
        setLastName('');
        setEmail('');
        setRole('staff');
        setPassword('');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
      <Box maxWidth={400} width="100%" mt={4}>
        <Typography variant="h5" gutterBottom>
          {isEdit ? 'Edit Staff' : 'Add Staff'}
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="First Name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <TextField
            select
            label="Role"
            value={role}
            onChange={e => setRole(e.target.value as StaffRole)}
          >
            <MenuItem value="staff">Staff</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            helperText={isEdit ? 'Leave blank to keep current password' : ''}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" size="small" onClick={handleSubmit}>
              {isEdit ? 'Update' : 'Create'}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => navigate('/admin/staff')}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
        <FeedbackSnackbar
          open={!!error}
          onClose={() => setError('')}
          message={error}
          severity="error"
        />
        <FeedbackSnackbar
          open={!!success}
          onClose={() => {
            setSuccess('');
            if (isEdit) navigate('/admin/staff');
          }}
          message={success}
        />
      </Box>
    </Box>
  );
}
