import { useState, useEffect, useMemo } from 'react';
import { createVolunteer, getVolunteerRoles } from '../../../api/volunteers';
import { getApiErrorMessage } from '../../../api/helpers';
import type { VolunteerRoleWithShifts } from '../../../types';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  ListItemText,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
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

  const groupedRoles = useMemo(() => {
    const groups = new Map<string, { id: number; name: string }[]>();
    roles.forEach(r => {
      const arr = groups.get(r.category_name) || [];
      if (!arr.some(a => a.id === r.id)) {
        arr.push({ id: r.id, name: r.name });
      }
      groups.set(r.category_name, arr);
    });
    return Array.from(groups.entries()).map(([category, roles]) => ({
      category,
      roles,
    }));
  }, [roles]);

  const idToName = useMemo(() => {
    const map = new Map<number, string>();
    roles.forEach(r => map.set(r.id, r.name));
    return map;
  }, [roles]);

  function handleRoleChange(e: SelectChangeEvent<number[]>) {
    const value = e.target.value;
    setSelectedRoles(typeof value === 'string' ? value.split(',').map(Number) : value);
  }

  function removeRole(id: number) {
    setSelectedRoles(prev => prev.filter(r => r !== id));
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
      setMessage(getApiErrorMessage(err, 'Unable to create volunteer'));
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
        <FormControl fullWidth>
          <InputLabel id="roles-select-label">Roles</InputLabel>
          <Select
            labelId="roles-select-label"
            multiple
            value={selectedRoles}
            onChange={handleRoleChange}
            renderValue={selected =>
              (selected as number[]).length === 0
                ? 'Select roles'
                : (selected as number[])
                    .map(id => idToName.get(id))
                    .join(', ')
            }
            label="Roles"
          >
            {groupedRoles.flatMap(g => [
              <ListSubheader key={`${g.category}-header`}>
                {g.category}
              </ListSubheader>,
              ...g.roles.map(r => (
                <MenuItem key={r.id} value={r.id}>
                  <Checkbox checked={selectedRoles.includes(r.id)} />
                  <ListItemText primary={r.name} />
                </MenuItem>
              )),
            ])}
          </Select>
          {selectedRoles.length === 0 && (
            <FormHelperText>No roles selected</FormHelperText>
          )}
        </FormControl>
        {selectedRoles.length > 0 && (
          <Grid
            container
            spacing={1}
            sx={{ mt: 2, bgcolor: 'background.default', p: 1, borderRadius: 1 }}
          >
            {selectedRoles.map(id => (
              <Grid item key={id}>
                <Chip
                  label={idToName.get(id)}
                  variant="outlined"
                  size="medium"
                  onDelete={() => removeRole(id)}
                  sx={{ maxWidth: 200 }}
                  title={idToName.get(id)}
                />
              </Grid>
            ))}
          </Grid>
        )}
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
