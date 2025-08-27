import { useState } from 'react';
import { loginVolunteer } from '../../api/volunteers';
import type { LoginResponse } from '../../api/users';
import { TextField, Link, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import PasswordResetDialog from '../../components/PasswordResetDialog';

export default function VolunteerLogin({
  onLogin,
}: {
  onLogin: (u: LoginResponse) => Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginVolunteer(username, password);
      await onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <FormCard
        onSubmit={submit}
        title="Volunteer Login"
        header={<Link component={RouterLink} to="/login/user" underline="hover">Client Login</Link>}
        actions={
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Login
          </Button>
        }
      >
        <TextField value={username} onChange={e => setUsername(e.target.value)} label="Username" fullWidth />
        <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" fullWidth />
        <Link component="button" onClick={() => setResetOpen(true)} underline="hover">Forgot password?</Link>
      </FormCard>
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} type="volunteer" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
