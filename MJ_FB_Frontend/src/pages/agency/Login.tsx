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

  const emailError = email === '';
  const passwordError = password === '';
  const formInvalid = emailError || passwordError;

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
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={formInvalid}
          >
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
          required
          error={emailError}
          helperText={emailError ? 'Email is required' : ''}
        />
        <TextField
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          label="Password"
          fullWidth
          required
          error={passwordError}
          helperText={passwordError ? 'Password is required' : ''}
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
