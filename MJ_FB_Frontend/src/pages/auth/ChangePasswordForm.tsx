import { useState } from 'react';
import { Button } from '@mui/material';
import PasswordField from '../../components/PasswordField';
import Page from '../../components/Page';
import { changePassword } from '../../api/users';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import PasswordChecklist from '../../components/PasswordChecklist';

function getNewPasswordError(password: string) {
  if (!password) {
    return 'Enter a new password.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return 'Password must include uppercase and lowercase letters.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include a symbol.';
  }
  return '';
}

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [currentPasswordTouched, setCurrentPasswordTouched] = useState(false);
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentPasswordErrorMessage = currentPasswordTouched && !currentPassword ? 'Enter your current password.' : '';
  const newPasswordValidationError = getNewPasswordError(newPassword);
  const shouldShowNewPasswordError = newPasswordTouched && !!newPasswordValidationError;
  const canSubmit = !!currentPassword && !newPasswordValidationError && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCurrentPasswordTouched(true);
    setNewPasswordTouched(true);
    setSuccess('');
    setError('');
    if (!currentPassword || newPasswordValidationError) {
      return;
    }
    try {
      setSubmitting(true);
      await changePassword(currentPassword, newPassword);
      setSuccess('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setCurrentPasswordTouched(false);
      setNewPasswordTouched(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page title="Change Password">
      <FormCard
        onSubmit={handleSubmit}
        title="Change Password"
        centered={false}
        actions={
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={!canSubmit}
          >
            Reset Password
          </Button>
        }
      >
        <PasswordField
          label="Current Password"
          name="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={e => {
            setCurrentPassword(e.target.value);
          }}
          onBlur={() => setCurrentPasswordTouched(true)}
          error={!!currentPasswordErrorMessage}
          helperText={currentPasswordErrorMessage || undefined}
          fullWidth
          required
        />
        <PasswordField
          label="New Password"
          name="new-password"
          autoComplete="new-password"
          value={newPassword}
          onChange={e => {
            setNewPassword(e.target.value);
          }}
          onBlur={() => setNewPasswordTouched(true)}
          error={shouldShowNewPasswordError}
          helperText={
            shouldShowNewPasswordError
              ? newPasswordValidationError
              : 'Must be at least 8 characters and include uppercase, lowercase, and special characters.'
          }
          fullWidth
          required
        />
        <PasswordChecklist password={newPassword} />
      </FormCard>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
      <FeedbackSnackbar
        open={!!success}
        onClose={() => setSuccess('')}
        message={success}
        severity="success"
      />
    </Page>
  );
}
