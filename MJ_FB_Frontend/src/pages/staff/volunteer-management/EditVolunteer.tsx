import { useEffect, useState } from 'react';
import EntitySearch from '../../../components/EntitySearch';
import {
  getVolunteerRoles,
  updateVolunteerTrainedAreas,
  getVolunteerById,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  type VolunteerRoleWithShifts,
  type VolunteerSearchResult,
} from '../../../api/volunteers';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import ConfirmDialog from '../../../components/ConfirmDialog';
import DialogCloseButton from '../../../components/DialogCloseButton';

export default function EditVolunteer() {
  const [volunteer, setVolunteer] =
    useState<VolunteerSearchResult | null>(null);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
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

  function handleSelect(v: VolunteerSearchResult) {
    setVolunteer(v);
    setSelected(v.trainedAreas);
    setHasShopper(v.hasShopper);
  }

  function toggleRole(id: number, checked: boolean) {
    setSelected(prev => (checked ? [...prev, id] : prev.filter(r => r !== id)));
  }

  async function handleSave() {
    if (!volunteer) return;
    try {
      await updateVolunteerTrainedAreas(volunteer.id, selected);
      setMessage('Volunteer updated');
      setSeverity('success');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
      setSeverity('error');
    }
  }

  async function refreshVolunteer(id: number) {
    try {
      const v = await getVolunteerById(id);
      setVolunteer(v);
      setSelected(v.trainedAreas);
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
      setMessage(err instanceof Error ? err.message : 'Update failed');
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
      setMessage(err instanceof Error ? err.message : 'Update failed');
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
          <FormControlLabel
            control={
              <Switch
                checked={hasShopper}
                onChange={handleShopperToggle}
                color="primary"
              />
            }
            label="Shopper Profile"
          />
          {roles.map(r => (
            <FormControlLabel
              key={r.id}
              control={
                <Checkbox
                  checked={selected.includes(r.id)}
                  onChange={e => toggleRole(r.id, e.target.checked)}
                />
              }
              label={r.name}
            />
          ))}
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
