import { useState } from 'react';
import { TextField, Button, Stack } from '@mui/material';
import { changePassword } from '../api/api';
import FeedbackSnackbar from './FeedbackSnackbar';

export default function ChangePasswordForm({ token }: { token: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await changePassword(token, currentPassword, newPassword);
      setSuccess('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ maxWidth: 400 }}>
        <TextField
          type="password"
          label="Current Password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          fullWidth
        />
        <TextField
          type="password"
          label="New Password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          fullWidth
        />
        <Button type="submit" variant="contained">Reset Password</Button>
      </Stack>
      <FeedbackSnackbar open={!!success} onClose={() => setSuccess('')} message={success} severity="success" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
