import { useEffect, useState, useMemo } from 'react';
import EntitySearch from '../../../components/EntitySearch';
import {
  getVolunteerRoles,
  updateVolunteerTrainedAreas,
  getVolunteerById,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  type VolunteerSearchResult,
} from '../../../api/volunteers';
import { getApiErrorMessage } from '../../../api/helpers';
import type { VolunteerRoleWithShifts } from '../../../types';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  ListItemText,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import ConfirmDialog from '../../../components/ConfirmDialog';
import DialogCloseButton from '../../../components/DialogCloseButton';

export default function EditVolunteer() {
  const [volunteer, setVolunteer] =
    useState<VolunteerSearchResult | null>(null);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [hasShopper, setHasShopper] = useState(false);
  const [shopperOpen, setShopperOpen] = useState(false);
  const [shopperClientId, setShopperClientId] = useState('');
  const [shopperEmail, setShopperEmail] = useState('');
  const [shopperPhone, setShopperPhone] = useState('');
  const [removeShopperOpen, setRemoveShopperOpen] = useState(false);

  useEffect(() => {
    getVolunteerRoles()
      .then(r => setRoles(r))
      .catch(() => setRoles([]));
  }, []);

  const groupedRoles = useMemo(() => {
    const groups = new Map<string, { id: number; name: string }[]>();
    roles.forEach(r => {
      const arr = groups.get(r.category_name) || [];
      if (!arr.some(a => a.name === r.name)) {
        arr.push({ id: r.id, name: r.name });
      }
      groups.set(r.category_name, arr);
    });
    return Array.from(groups.entries()).map(([category, roles]) => ({
      category,
      roles,
    }));
  }, [roles]);

  const nameToRoleIds = useMemo(() => {
    const map = new Map<string, number[]>();
    roles.forEach(r => {
      const arr = map.get(r.name) || [];
      arr.push(r.id);
      map.set(r.name, arr);
    });
    return map;
  }, [roles]);

  const idToName = useMemo(() => {
    const map = new Map<number, string>();
    roles.forEach(r => {
      map.set(r.id, r.name);
    });
    return map;
  }, [roles]);

  function handleSelect(v: VolunteerSearchResult) {
    setVolunteer(v);
    setHasShopper(v.hasShopper);
    const names = v.trainedAreas
      .map(id => idToName.get(id))
      .filter((n): n is string => !!n);
    setSelected(names);
  }

  function handleRoleChange(e: SelectChangeEvent<string[]>) {
    const value = e.target.value;
    setSelected(typeof value === 'string' ? value.split(',') : value);
  }

  function removeRole(name: string) {
    setSelected(prev => prev.filter(n => n !== name));
  }

  async function handleSave() {
    if (!volunteer) return;
    try {
      const roleIds = selected.flatMap(name => nameToRoleIds.get(name) || []);
      await updateVolunteerTrainedAreas(volunteer.id, roleIds);
      setMessage('Volunteer updated');
      setSeverity('success');
    } catch (err: unknown) {
      setMessage(getApiErrorMessage(err, 'Unable to update volunteer'));
      setSeverity('error');
    }
  }

  async function refreshVolunteer(id: number) {
    try {
      const v = await getVolunteerById(id);
      setVolunteer(v);
      const names = v.trainedAreas
        .map(rid => idToName.get(rid))
        .filter((n): n is string => !!n);
      setSelected(names);
      setHasShopper(v.hasShopper);
    } catch {}
  }

  function handleShopperToggle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!volunteer) return;
    if (e.target.checked) {
      setShopperOpen(true);
    } else {
      setRemoveShopperOpen(true);
    }
  }

  async function createShopper() {
    if (!volunteer) return;
    try {
      await createVolunteerShopperProfile(
        volunteer.id,
        shopperClientId,
        shopperEmail || undefined,
        shopperPhone || undefined,
      );
      setMessage('Shopper profile created');
      setSeverity('success');
      setShopperOpen(false);
      setShopperClientId('');
      setShopperEmail('');
      setShopperPhone('');
      await refreshVolunteer(volunteer.id);
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to create shopper profile'));
      setSeverity('error');
    }
  }

  async function removeShopper() {
    if (!volunteer) return;
    try {
      await removeVolunteerShopperProfile(volunteer.id);
      setMessage('Shopper profile removed');
      setSeverity('success');
      setRemoveShopperOpen(false);
      await refreshVolunteer(volunteer.id);
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to remove shopper profile'));
      setSeverity('error');
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Edit Volunteer
      </Typography>
      <EntitySearch
        type="volunteer"
        placeholder="Search volunteer"
        onSelect={v => handleSelect(v as VolunteerSearchResult)}
      />
      {volunteer && (
        <Stack spacing={2} mt={2} maxWidth={400}>
          <Typography>{volunteer.name}</Typography>
          <FormControl component="fieldset">
            <FormControlLabel
              control={
                <Switch
                  checked={hasShopper}
                  onChange={handleShopperToggle}
                  color="primary"
                  data-testid="shopper-toggle"
                />
              }
              label="Shopper Profile"
            />
            <FormHelperText>
              Enable if this volunteer also shops at the pantry.
            </FormHelperText>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="role-select-label">Roles</InputLabel>
            <Select
              labelId="role-select-label"
              multiple
              value={selected}
              onChange={handleRoleChange}
              renderValue={() => 'Select roles'}
            >
              {groupedRoles.flatMap(g => [
                <ListSubheader key={`${g.category}-header`}>
                  {g.category}
                </ListSubheader>,
                ...g.roles.map(r => (
                  <MenuItem key={r.id} value={r.name}>
                    <Checkbox checked={selected.includes(r.name)} />
                    <ListItemText primary={r.name} />
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {selected.map(name => (
              <Chip key={name} label={name} onDelete={() => removeRole(name)} />
            ))}
          </Stack>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </Stack>
      )}
      {shopperOpen && (
        <Dialog open onClose={() => setShopperOpen(false)}>
          <DialogCloseButton onClose={() => setShopperOpen(false)} />
          <DialogContent>
            <TextField
              label="Client ID"
              value={shopperClientId}
              onChange={e => setShopperClientId(e.target.value)}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Email (optional)"
              type="email"
              value={shopperEmail}
              onChange={e => setShopperEmail(e.target.value)}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Phone (optional)"
              type="tel"
              value={shopperPhone}
              onChange={e => setShopperPhone(e.target.value)}
              fullWidth
              margin="dense"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={createShopper} variant="contained" color="primary">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {removeShopperOpen && (
        <ConfirmDialog
          message={`Remove shopper profile for ${volunteer?.name}?`}
          onConfirm={removeShopper}
          onCancel={() => setRemoveShopperOpen(false)}
        />
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Box>
  );
}
