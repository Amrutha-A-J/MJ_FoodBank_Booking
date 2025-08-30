import { useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import { TextField, Button, Link } from '@mui/material';
import Page from '../../components/Page';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { setPassword as setPasswordApi } from '../../api/users';

export default function PasswordSetup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('Invalid or expired token');
      return;
    }
    try {
      await setPasswordApi(token, password);
      setSuccess('Password set. You may now log in.');
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Page title="Set Password">
      <FormCard
        onSubmit={handleSubmit}
        title="Set Password"
        actions={
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Set Password
          </Button>
        }
      >
        <TextField
          type="password"
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          required
        />
        <Link component={RouterLink} to="/login" underline="hover">
          Back to login
        </Link>
      </FormCard>
      <FeedbackSnackbar
        open={!!success}
        onClose={() => setSuccess('')}
        message={success}
        severity="success"
      />
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
    </Page>
  );
}
