import { useState, useEffect, type FormEvent } from 'react';
import { TextField, Checkbox, FormControlLabel, Button, Typography } from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormCard from './FormCard';
import type { StaffAccess } from '../types';

interface StaffFormProps {
  initial?: {
    firstName: string;
    lastName: string;
    email: string;
    access: StaffAccess[];
  };
  submitLabel: string;
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    email: string;
    access: StaffAccess[];
  }) => Promise<void>;
}

export default function StaffForm({ initial, submitLabel, onSubmit }: StaffFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName || '');
  const [lastName, setLastName] = useState(initial?.lastName || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [access, setAccess] = useState<StaffAccess[]>(initial?.access || []);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  function validateField(field: 'firstName' | 'lastName' | 'email', value: string) {
    const trimmed = value.trim();
    const message = `${field === 'email' ? 'Email' : field === 'lastName' ? 'Last name' : 'First name'} is required`;
    return trimmed ? '' : message;
  }

  function updateFieldError(field: 'firstName' | 'lastName' | 'email', value: string) {
    setFieldErrors(prev => ({
      ...prev,
      [field]: validateField(field, value),
    }));
  }

  function clearFieldError(field: 'firstName' | 'lastName' | 'email') {
    setFieldErrors(prev => ({
      ...prev,
      [field]: '',
    }));
  }

  useEffect(() => {
    if (initial) {
      setFirstName(initial.firstName);
      setLastName(initial.lastName);
      setEmail(initial.email);
      setAccess(initial.access);
      setFieldErrors({ firstName: '', lastName: '', email: '' });
    }
  }, [initial]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newErrors = {
      firstName: validateField('firstName', firstName),
      lastName: validateField('lastName', lastName),
      email: validateField('email', email),
    };
    setFieldErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      return;
    }
    try {
      await onSubmit({ firstName, lastName, email, access });
      setSuccess('Saved');
      if (!initial) {
        setFirstName('');
        setLastName('');
        setEmail('');
        setAccess([]);
      }
      setFieldErrors({ firstName: '', lastName: '', email: '' });
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  function toggleAccess(a: StaffAccess) {
    setAccess(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a],
    );
  }

  return (
    <>
      <FormCard
        title={submitLabel}
        onSubmit={handleSubmit}
        noValidate
        actions={
          <Button type="submit" variant="contained" color="primary" fullWidth>
            {submitLabel}
          </Button>
        }
      >
        <TextField
          label="First Name"
          name="firstName"
          autoComplete="given-name"
          value={firstName}
          onChange={e => {
            const value = e.target.value;
            setFirstName(value);
            if (fieldErrors.firstName) {
              const validation = validateField('firstName', value);
              if (!validation) {
                clearFieldError('firstName');
              }
            }
          }}
          onBlur={e => updateFieldError('firstName', e.target.value)}
          required
          error={!!fieldErrors.firstName}
          helperText={fieldErrors.firstName || undefined}
        />
        <TextField
          label="Last Name"
          name="lastName"
          autoComplete="family-name"
          value={lastName}
          onChange={e => {
            const value = e.target.value;
            setLastName(value);
            if (fieldErrors.lastName) {
              const validation = validateField('lastName', value);
              if (!validation) {
                clearFieldError('lastName');
              }
            }
          }}
          onBlur={e => updateFieldError('lastName', e.target.value)}
          required
          error={!!fieldErrors.lastName}
          helperText={fieldErrors.lastName || undefined}
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={e => {
            const value = e.target.value;
            setEmail(value);
            if (fieldErrors.email) {
              const validation = validateField('email', value);
              if (!validation) {
                clearFieldError('email');
              }
            }
          }}
          onBlur={e => updateFieldError('email', e.target.value)}
          required
          error={!!fieldErrors.email}
          helperText={fieldErrors.email || undefined}
        />
        <Typography variant="body2" color="text.secondary">
          An email invitation will be sent.
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={access.includes('pantry')} onChange={() => toggleAccess('pantry')} />}
          label="Pantry"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={access.includes('volunteer_management')}
              onChange={() => toggleAccess('volunteer_management')}
            />
          }
          label="Volunteer Management"
        />
        <FormControlLabel
          control={<Checkbox checked={access.includes('warehouse')} onChange={() => toggleAccess('warehouse')} />}
          label="Warehouse"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={access.includes('admin')}
              onChange={() => toggleAccess('admin')}
            />
          }
          label="Admin"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={access.includes('donor_management')}
              onChange={() => toggleAccess('donor_management')}
            />
          }
          label="Donor Management"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={access.includes('payroll_management')}
              onChange={() => toggleAccess('payroll_management')}
            />
          }
          label="Payroll Management"
        />
      </FormCard>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <FeedbackSnackbar open={!!success} onClose={() => setSuccess('')} message={success} />
    </>
  );
}
