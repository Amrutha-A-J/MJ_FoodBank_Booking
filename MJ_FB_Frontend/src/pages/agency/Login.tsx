import { useState } from 'react';
import { loginAgency, type LoginResponse } from '../../api/users';
import { TextField, Button } from '@mui/material';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';

export default function AgencyLogin({
  onLogin,
}: {
  onLogin: (u: LoginResponse) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginAgency(email, password);
      await onLogin(user);
    } catch (err: any) {
      setError(err.message ?? String(err));
    }
  }

  return (
    <>
      <FormCard
        onSubmit={submit}
        title="Agency Login"
        actions={
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Login
          </Button>
        }
      >
        <TextField
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          label="Email"
          fullWidth
        />
        <TextField
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          label="Password"
          fullWidth
        />
      </FormCard>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
    </>
  );
}
