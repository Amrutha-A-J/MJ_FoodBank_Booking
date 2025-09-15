import { useState, type FormEvent } from 'react';
import { TextField, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { createStaff } from '../../api/users';

interface FirstStaffSetupProps {
  onSuccess: (message: string) => void;
}

export default function FirstStaffSetup({ onSuccess }: FirstStaffSetupProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const firstNameError = submitted && firstName.trim() === '';
  const lastNameError = submitted && lastName.trim() === '';
  const emailError = submitted && email.trim() === '';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (firstNameError || lastNameError || emailError) {
      return;
    }
    setLoading(true);
    try {
      await createStaff(firstName.trim(), lastName.trim(), ['admin'], email.trim());
      onSuccess('Check your email to finish setting up your staff account.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <FormCard
        title="Set up the first staff account"
        onSubmit={handleSubmit}
        actions={
          <LoadingButton
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="medium"
            sx={{ minHeight: 48 }}
            loading={loading}
            disabled={loading}
          >
            Send Invitation
          </LoadingButton>
        }
      >
        <Typography variant="body1" color="text.secondary">
          Enter your details to receive an email invitation. You&rsquo;ll be set up as an admin automatically.
        </Typography>
        <TextField
          label="First Name"
          name="firstName"
          value={firstName}
          onChange={event => setFirstName(event.target.value)}
          autoComplete="given-name"
          fullWidth
          size="medium"
          required
          error={firstNameError}
          helperText={firstNameError ? 'First name is required' : ''}
        />
        <TextField
          label="Last Name"
          name="lastName"
          value={lastName}
          onChange={event => setLastName(event.target.value)}
          autoComplete="family-name"
          fullWidth
          size="medium"
          required
          error={lastNameError}
          helperText={lastNameError ? 'Last name is required' : ''}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="email"
          fullWidth
          size="medium"
          required
          error={emailError}
          helperText={emailError ? 'Email is required' : ''}
        />
      </FormCard>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
    </>
  );
}
