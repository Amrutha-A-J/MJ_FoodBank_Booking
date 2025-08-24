import { useEffect, useState } from 'react';
import { loginStaff, staffExists, createStaff } from '../api/users';
import type { LoginResponse } from '../api/users';
import type { StaffAccess } from '../types';
import { Typography, TextField, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FeedbackSnackbar from './FeedbackSnackbar';
import FeedbackModal from './FeedbackModal';
import FormContainer from './FormContainer';
import PasswordResetDialog from './PasswordResetDialog';

export default function StaffLogin({ onLogin }: { onLogin: (u: LoginResponse) => void }) {
  const [checking, setChecking] = useState(true);
  const [hasStaff, setHasStaff] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    staffExists()
      .then(exists => {
        setHasStaff(exists);
        setChecking(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : String(err));
        setChecking(false);
      });
  }, []);

  if (checking) return <Typography>Loading...</Typography>;

  return hasStaff ? (
    <StaffLoginForm onLogin={onLogin} error={error} />
  ) : (
    <CreateStaffForm onCreated={() => setHasStaff(true)} error={error} />
  );
}

function StaffLoginForm({ onLogin, error: initError }: { onLogin: (u: LoginResponse) => void; error: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initError);
  const [resetOpen, setResetOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginStaff(email, password);
      if (user.role === 'shopper' || user.role === 'delivery') {
        setError('Not a staff account');
        return;
      }
      onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <FormContainer
        onSubmit={submit}
        submitLabel="Login"
        title="Staff Login"
        header={<Link component={RouterLink} to="/login/user" underline="hover">User Login</Link>}
      >
        <TextField
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          label="Email"
          fullWidth
        />
        <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" fullWidth />
        <Link component="button" onClick={() => setResetOpen(true)} underline="hover">Forgot password?</Link>
      </FormContainer>
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} type="staff" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}

function CreateStaffForm({ onCreated, error: initError }: { onCreated: () => void; error: string }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initError);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createStaff(firstName, lastName, 'staff', email, password, ['admin'] as StaffAccess[]);
      setMessage('Staff account created. You can login now.');
      setTimeout(onCreated, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <FormContainer onSubmit={submit} submitLabel="Create Staff" title="Create Staff Account">
        <TextField value={firstName} onChange={e => setFirstName(e.target.value)} label="First name" fullWidth />
        <TextField value={lastName} onChange={e => setLastName(e.target.value)} label="Last name" fullWidth />
        <TextField type="email" value={email} onChange={e => setEmail(e.target.value)} label="Email" fullWidth />
        <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} label="Password" fullWidth />
      </FormContainer>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <FeedbackModal open={!!message} onClose={() => setMessage('')} message={message} />
    </>
  );
}
