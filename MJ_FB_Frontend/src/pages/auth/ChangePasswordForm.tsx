import { useState } from 'react';
import { TextField } from '@mui/material';
import { changePassword } from '../../api/users';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormContainer from '../../components/FormContainer';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <FormContainer onSubmit={handleSubmit} submitLabel="Reset Password" centered={false}>
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
      </FormContainer>
      <FeedbackSnackbar open={!!success} onClose={() => setSuccess('')} message={success} severity="success" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
