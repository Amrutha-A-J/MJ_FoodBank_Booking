import { useState } from 'react';
import { Button, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { sendRegistrationOtp, registerUser } from '../../api/users';

export default function ClientSignup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clientId, setClientId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const firstNameError = firstName === '';
  const lastNameError = lastName === '';
  const clientIdError = clientId === '';
  const emailError = email === '';
  const passwordError = password === '';
  const otpError = otp === '';

  const formInvalid =
    step === 'form'
      ? firstNameError ||
        lastNameError ||
        clientIdError ||
        emailError ||
        passwordError
      : otpError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 'form') {
      try {
        await sendRegistrationOtp(clientId, email);
        setStep('otp');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } else {
      try {
        await registerUser({
          clientId,
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          password,
          otp,
        });
        setMessage('Account created. You can login now.');
        setTimeout(() => navigate('/login/user'), 1000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return (
    <>
      <FormCard
        onSubmit={handleSubmit}
        title={step === 'form' ? 'Client Sign Up' : 'Verify Email'}
        actions={
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={formInvalid}
          >
            {step === 'form' ? 'Send Code' : 'Register'}
          </Button>
        }
      >
        {step === 'form' ? (
          <>
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
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              label="Client ID"
              fullWidth
              required
              error={clientIdError}
              helperText={clientIdError ? 'Client ID is required' : ''}
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
            <TextField
              value={phone}
              onChange={e => setPhone(e.target.value)}
              label="Phone (optional)"
              fullWidth
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
          </>
        ) : (
          <>
            <Typography>Enter the verification code sent to your email.</Typography>
            <TextField
              value={otp}
              onChange={e => setOtp(e.target.value)}
              label="OTP"
              fullWidth
              required
              error={otpError}
              helperText={otpError ? 'OTP is required' : ''}
            />
          </>
        )}
      </FormCard>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} />
    </>
  );
}
