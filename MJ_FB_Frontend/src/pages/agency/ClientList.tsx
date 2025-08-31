import { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  getMyAgencyClients,
  addAgencyClient,
  removeAgencyClient,
} from '../../api/agencies';
import { useAuth } from '../../hooks/useAuth';
import Page from '../../components/Page';
import InfoTooltip from '../../components/InfoTooltip';

interface AgencyClient {
  id: number;
  name: string;
  email?: string;
}

export default function ClientList() {
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [newClientId, setNewClientId] = useState('');
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: 'success' | 'error' } | null
  >(null);

  useAuth(); // ensure auth context

  const load = async () => {
    try {
      const data = await getMyAgencyClients();
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
      setSnackbar({ message: 'Failed to load clients', severity: 'error' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    const id = Number(newClientId);
    if (!id) return;
    try {
      await addAgencyClient('me', id);
      setNewClientId('');
      setSnackbar({ message: 'Client added', severity: 'success' });
      load();
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to add client',
        severity: 'error',
      });
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeAgencyClient('me', id);
      setSnackbar({ message: 'Client removed', severity: 'success' });
      load();
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to remove client',
        severity: 'error',
      });
    }
  };

  return (
    <Page title="Agency Clients">
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
          <Typography variant="h5">Clients</Typography>
          <InfoTooltip title="Shows assigned clients and their public IDs." />
        </Stack>
        <List dense>
          {clients.map(c => (
            <ListItem
              key={c.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="remove"
                  onClick={() => handleRemove(c.id)}
                >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={c.name} secondary={`ID: ${c.id}`} />
            </ListItem>
          ))}
          {clients.length === 0 && (
            <Typography>No clients assigned.</Typography>
          )}
        </List>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="h5" gutterBottom>
          Add Client
        </Typography>
        <TextField
          label="Client ID"
          value={newClientId}
          onChange={e => setNewClientId(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 1 }}
        />
        <Button variant="contained" size="small" onClick={handleAdd}>
          Add
        </Button>
      </Grid>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </Grid>
    </Page>
  );
}

