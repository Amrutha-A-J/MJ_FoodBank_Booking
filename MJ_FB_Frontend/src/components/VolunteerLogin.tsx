import { useState } from 'react';
import { loginVolunteer } from '../api/api';
import type { LoginResponse } from '../api/api';
import { TextField, Link } from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormContainer from './FormContainer';
import Page from './Page';

export default function VolunteerLogin({ onLogin, onBack }: { onLogin: (u: LoginResponse) => void; onBack: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginVolunteer(username, password);
      onLogin(user);
      window.location.href = '/volunteer-dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Page
      title="Volunteer Login"
      header={<Link component="button" onClick={onBack} underline="hover">User Login</Link>}
    >
      <FormContainer onSubmit={submit} submitLabel="Login">
        <TextField value={username} onChange={e => setUsername(e.target.value)} label="Username" fullWidth />
        <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" fullWidth />
      </FormContainer>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </Page>
  );
}
