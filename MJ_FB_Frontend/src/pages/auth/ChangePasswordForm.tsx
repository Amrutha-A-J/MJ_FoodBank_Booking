import { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import Page from '../../components/Page';
import { changePassword } from '../../api/users';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import LanguageSelector from '../../components/LanguageSelector';
import { useTranslation } from 'react-i18next';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { t } = useTranslation();

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
    <Page title={t('change_password')} header={<Box textAlign="right"><LanguageSelector /></Box>}>
      <FormCard
        onSubmit={handleSubmit}
        title={t('change_password')}
        centered={false}
        actions={
          <Button type="submit" variant="contained" color="primary" fullWidth>
            {t('reset_password')}
          </Button>
        }
      >
        <TextField
          type="password"
          label={t('current_password')}
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          fullWidth
        />
        <TextField
          type="password"
          label={t('new_password')}
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
