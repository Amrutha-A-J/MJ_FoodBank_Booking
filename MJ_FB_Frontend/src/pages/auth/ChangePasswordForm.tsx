import { useState } from 'react';
import { Button } from '@mui/material';
import PasswordField from '../../components/PasswordField';
import Page from '../../components/Page';
import { changePassword } from '../../api/users';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';

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
    <Page title={"Change Password"}>
      <FormCard
        onSubmit={handleSubmit}
        title={"Change Password"}
        centered={false}
        actions={
          <Button type="submit" variant="contained" color="primary" fullWidth>
            {"Reset Password"}
          </Button>
        }
      >
        <PasswordField
          label={"Current Password"}
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          fullWidth
        />
        <PasswordField
          label={"New Password"}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          fullWidth
        />
      </FormCard>
      <FeedbackSnackbar open={!!success} onClose={() => setSuccess('')} message={success} severity="success" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </Page>
  );
}
