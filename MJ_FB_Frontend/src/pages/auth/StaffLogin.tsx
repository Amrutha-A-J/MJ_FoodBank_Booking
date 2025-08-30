import { useEffect, useState } from 'react';
import { loginStaff, staffExists, createStaff } from '../../api/users';
import type { LoginResponse } from '../../api/users';
import type { ApiError } from '../../api/client';
import { Typography, TextField, Link, Button } from '@mui/material';
import Page from '../../components/Page';
import { Link as RouterLink } from 'react-router-dom';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FeedbackModal from '../../components/FeedbackModal';
import FormCard from '../../components/FormCard';
import PasswordResetDialog from '../../components/PasswordResetDialog';

export default function StaffLogin({
  onLogin,
}: {
  onLogin: (u: LoginResponse) => Promise<void>;
}) {
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

  if (checking)
    return (
      <Page title="Staff Login">
        <Typography>Loading...</Typography>
      </Page>
    );

  return (
    <Page title={hasStaff ? 'Staff Login' : 'Create Staff Account'}>
      {hasStaff ? (
        <StaffLoginForm onLogin={onLogin} error={error} />
      ) : (
        <CreateStaffForm onCreated={() => setHasStaff(true)} error={error} />
      )}
    </Page>
  );
}

function StaffLoginForm({
  onLogin,
  error: initError,
}: {
  onLogin: (u: LoginResponse) => Promise<void>;
  error: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initError);
  const [resetOpen, setResetOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailError = submitted && email === '';
  const passwordError = submitted && password === '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (email === '' || password === '') return;
    try {
      const user = await loginStaff(email, password);
      if (user.role === 'shopper' || user.role === 'delivery') {
        setError('Not a staff account');
        return;
      }
      await onLogin(user);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 401) {
        setError('Incorrect email or password');
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return (
    <>
      <FormCard
        onSubmit={submit}
        title="Staff Login"
        actions={
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
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
        <Link component="button" onClick={() => setResetOpen(true)} underline="hover">Forgot password?</Link>
      </FormCard>
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} type="staff" />
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}

function CreateStaffForm({ onCreated, error: initError }: { onCreated: () => void; error: string }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(initError);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const firstNameError = submitted && firstName === '';
  const lastNameError = submitted && lastName === '';
  const emailError = submitted && email === '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (firstName === '' || lastName === '' || email === '') return;
    try {
      await createStaff(firstName, lastName, ['admin'], email);
      setMessage('Staff account created. You can login now.');
      setTimeout(onCreated, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <FormCard
        onSubmit={submit}
        title="Create Staff Account"
        actions={
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            Create Staff
          </Button>
        }
      >
        <TextField
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          label="First name"
          fullWidth
          required
          error={firstNameError}
          helperText={firstNameError ? 'First name is required' : ''}
        />
        <TextField
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          label="Last name"
          fullWidth
          required
          error={lastNameError}
          helperText={lastNameError ? 'Last name is required' : ''}
        />
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
        <Typography variant="body2" color="text.secondary">
          An email invitation will be sent.
        </Typography>
      </FormCard>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <FeedbackModal open={!!message} onClose={() => setMessage('')} message={message} />
    </>
  );
}
