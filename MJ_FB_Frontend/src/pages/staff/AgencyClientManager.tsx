import { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EntitySearch from '../../components/EntitySearch';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  addAgencyClient,
  removeAgencyClient,
  getAgencyClients,
} from '../../api/agencies';

interface AgencyClient {
  id: number;
  name: string;
  email?: string;
}

export default function AgencyClientManager() {
  const [agencyId, setAgencyId] = useState('');
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: 'success' | 'error' } | null
  >(null);

  const load = async (id: number) => {
    try {
      const data = await getAgencyClients(id);
      const mapped = Array.isArray(data)
        ? data.map((c: any) => ({
            id: c.id ?? c.client_id,
            name:
              c.name ??
              c.client_name ??
              `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
            email: c.email,
          }))
        : [];
      setClients(mapped);
    } catch {
      setClients([]);
    }
  };

  useEffect(() => {
    const id = Number(agencyId);
    if (!id) {
      setClients([]);
      return;
    }
    load(id);
  }, [agencyId]);

  const handleAdd = async (user: any) => {
    const id = Number(agencyId);
    if (!id) return;
    try {
      await addAgencyClient(id, user.id);
      setSnackbar({ message: 'Client added', severity: 'success' });
      load(id);
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to add client',
        severity: 'error',
      });
    }
  };

  const handleRemove = async (id: number) => {
    const agency = Number(agencyId);
    if (!agency) return;
    try {
      await removeAgencyClient(agency, id);
      setSnackbar({ message: 'Client removed', severity: 'success' });
      load(agency);
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to remove client',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Clients
          </Typography>
          <List dense>
            {clients.map(c => (
              <ListItem
                key={c.id}
                secondaryAction={
                  <IconButton edge="end" aria-label="remove" onClick={() => handleRemove(c.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={c.name} secondary={`ID: ${c.id}`} />
              </ListItem>
            ))}
            {clients.length === 0 && <Typography>No clients assigned.</Typography>}
          </List>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Add Client
          </Typography>
          <TextField
            label="Agency ID"
            value={agencyId}
            onChange={e => setAgencyId(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
          />
          <EntitySearch type="user" onSelect={handleAdd} placeholder="Search clients" />
        </Grid>
      </Grid>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </>
  );
}

