import { useState, useEffect } from 'react';
import { createVolunteer, getVolunteerRoles } from '../../../api/volunteers';
import type { VolunteerRoleWithShifts } from '../../../types';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import PasswordField from '../../../components/PasswordField';

export default function AddVolunteer() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [onlineAccess, setOnlineAccess] = useState(false);
  const [sendPasswordLink, setSendPasswordLink] = useState(true);
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    getVolunteerRoles()
      .then(r => setRoles(r))
      .catch(() => setRoles([]));
  }, []);

  function toggleRole(id: number, checked: boolean) {
    setSelectedRoles(prev =>
      checked ? [...prev, id] : prev.filter(r => r !== id),
    );
  }

  async function handleSubmit() {
    if (!firstName || !lastName) {
      setMessage('First and last name required');
      setSeverity('error');
      return;
    }
    try {
      await createVolunteer(
        firstName,
        lastName,
        selectedRoles,
        onlineAccess,
        email || undefined,
        phone || undefined,
        sendPasswordLink ? undefined : password || undefined,
        sendPasswordLink,
      );
      setMessage('Volunteer created');
      setSeverity('success');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setOnlineAccess(false);
      setSendPasswordLink(true);
      setPassword('');
      setSelectedRoles([]);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Create failed');
      setSeverity('error');
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add Volunteer
      </Typography>
      <Stack spacing={2} maxWidth={400}>
        <TextField
          label="First Name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />
        <TextField
          label="Last Name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={onlineAccess}
              onChange={e => {
                setOnlineAccess(e.target.checked);
                if (!e.target.checked) {
                  setSendPasswordLink(true);
                  setPassword('');
                }
              }}
            />
          }
          label="Online Access"
        />
        {onlineAccess && (
          <>
            <ToggleButtonGroup
              value={sendPasswordLink ? 'link' : 'password'}
              exclusive
              onChange={(_, v) => v && setSendPasswordLink(v === 'link')}
            >
              <ToggleButton value="link">Send link</ToggleButton>
              <ToggleButton value="password">Set password</ToggleButton>
            </ToggleButtonGroup>
            {sendPasswordLink ? (
              <Typography variant="body2" color="text.secondary">
                An email invitation will be sent.
              </Typography>
            ) : (
              <PasswordField
                label="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            )}
          </>
        )}
        <TextField
          label={onlineAccess ? 'Email' : 'Email (optional)'}
          type="email"
          required={onlineAccess}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <TextField
          label="Phone (optional)"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <Typography variant="subtitle1">Trained Areas</Typography>
        {roles.map(r => (
          <FormControlLabel
            key={r.id}
            control={
              <Checkbox
                checked={selectedRoles.includes(r.id)}
                onChange={e => toggleRole(r.id, e.target.checked)}
              />
            }
            label={r.name}
          />
        ))}
        <Button variant="contained" onClick={handleSubmit}>
          Add Volunteer
        </Button>
      </Stack>
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Box>
  );
}
