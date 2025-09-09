import { useEffect, useMemo, useState } from 'react';
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
  Chip,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';

export default function EditVolunteer() {
  const [volunteer, setVolunteer] =
    useState<VolunteerSearchResult | null>(null);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    getVolunteerRoles()
      .then(r => setRoles(r))
      .catch(() => setRoles([]));
  }, []);

  const groupedRoles = useMemo(() => {
    const groups = new Map<string, { name: string }[]>();
    roles.forEach(r => {
      const arr = groups.get(r.category_name) || [];
      if (!arr.some(a => a.name === r.name)) arr.push({ name: r.name });
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
    roles.forEach(r => map.set(r.id, r.name));
    return map;
  }, [roles]);

  function handleSelect(v: VolunteerSearchResult) {
    setVolunteer(v);
  }

  useEffect(() => {
    if (!volunteer) {
      setSelected([]);
      return;
    }
    const names = volunteer.trainedAreas
      .map(id => idToName.get(id))
      .filter((n): n is string => !!n);
    setSelected(names);
  }, [volunteer, idToName]);

  function handleChange(event: SelectChangeEvent<string[]>) {
    const value = event.target.value as string[];
    setSelected(typeof value === 'string' ? value.split(',') : value);
  }

  function handleDelete(name: string) {
    setSelected(prev => prev.filter(r => r !== name));
  }

  async function handleSave() {
    if (!volunteer) return;
    try {
      const ids = Array.from(
        new Set(selected.flatMap(name => nameToRoleIds.get(name) || [])),
      );
      await updateVolunteerTrainedAreas(volunteer.id, ids);
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
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {selected.map(name => (
              <Chip key={name} label={name} onDelete={() => handleDelete(name)} />
            ))}
          </Stack>
          <FormControl fullWidth>
            <InputLabel id="roles-label">Roles</InputLabel>
            <Select
              labelId="roles-label"
              multiple
              value={selected}
              label="Roles"
              onChange={handleChange}
              renderValue={selected => (selected as string[]).join(', ')}
            >
              {groupedRoles.map(g => (
                <div key={g.category}>
                  <ListSubheader>{g.category}</ListSubheader>
                  {g.roles.map(r => (
                    <MenuItem key={r.name} value={r.name}>
                      <Checkbox checked={selected.includes(r.name)} />
                      <ListItemText primary={r.name} />
                    </MenuItem>
                  ))}
                </div>
              ))}
            </Select>
          </FormControl>
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
