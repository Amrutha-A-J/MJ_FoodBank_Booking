import { useEffect, useState } from 'react';
import EntitySearch from '../../../components/EntitySearch';
import {
  getVolunteerRoles,
  updateVolunteerTrainedAreas,
  type VolunteerRoleWithShifts,
  type VolunteerSearchResult,
} from '../../../api/volunteers';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';

export default function EditVolunteer() {
  const [volunteer, setVolunteer] =
    useState<VolunteerSearchResult | null>(null);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    getVolunteerRoles()
      .then(r => setRoles(r))
      .catch(() => setRoles([]));
  }, []);

  function handleSelect(v: VolunteerSearchResult) {
    setVolunteer(v);
    setSelected(v.trainedAreas);
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
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Box>
  );
}
