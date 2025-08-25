import { useState } from 'react';
import { loginAgency, type LoginResponse } from '../../api/users';
import { TextField } from '@mui/material';
import FormContainer from '../../components/FormContainer';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';

export default function AgencyLogin({ onLogin }: { onLogin: (u: LoginResponse) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginAgency(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message ?? String(err));
    }
  }

  return (
    <>
      <FormContainer onSubmit={submit} submitLabel="Login" title="Agency Login">
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
      </FormContainer>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
    </>
  );
}
