import { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  const [agency, setAgency] = useState<{ id: number; name: string } | null>(null);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: 'success' | 'error' } | null
  >(null);
  const [conflictAgency, setConflictAgency] = useState<string | null>(null);

  const load = async (id: number) => {
    try {
      const data = await getAgencyClients(id);
      const mapped = Array.isArray(data)
        ? data.map((c: any) => ({
            id: c.client_id,
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
    if (!agency) {
      setClients([]);
      return;
    }
    load(agency.id);
  }, [agency]);

  const handleAdd = async (user: any) => {
    if (!agency) {
      setSnackbar({ message: 'Select an agency first', severity: 'error' });
      return;
    }
    try {
      await addAgencyClient(agency.id, user.client_id);
      setSnackbar({ message: 'Client added', severity: 'success' });
      load(agency.id);
    } catch (err: any) {
      if (err.details?.agencyName) {
        setConflictAgency(err.details.agencyName as string);
      } else {
        setSnackbar({
          message: err.message || 'Failed to add client',
          severity: 'error',
        });
      }
    }
  };

  const handleRemove = async (id: number) => {
    if (!agency) return;
    if (!window.confirm('Remove this client from the agency?')) return;
    try {
      await removeAgencyClient(agency.id, id);
      setSnackbar({ message: 'Client removed', severity: 'success' });
      load(agency.id);
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to remove client',
        severity: 'error',
      });
    }
  };
  if (!agency) {
    return (
      <>
        <Typography variant="h5" gutterBottom>
          Select Agency
        </Typography>
        <EntitySearch
          type="agency"
          placeholder="Search agencies"
          onSelect={ag => setAgency({ id: ag.id, name: ag.name })}
        />
        <FeedbackSnackbar
          open={!!snackbar}
          onClose={() => setSnackbar(null)}
          message={snackbar?.message || ''}
          severity={snackbar?.severity}
        />
      </>
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography variant="h5" gutterBottom>
            Search Clients
          </Typography>
          <EntitySearch
            type="user"
            placeholder="Search clients"
            onSelect={() => {}}
            renderResult={(u, select) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{`${u.name} (${u.client_id})`}</span>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    handleAdd(u);
                    select();
                  }}
                >
                  Add
                </Button>
              </div>
            )}
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <Typography variant="h5" gutterBottom>
            Select Agency
          </Typography>
          <EntitySearch
            type="agency"
            placeholder="Search agencies"
            onSelect={ag => setAgency({ id: ag.id, name: ag.name })}
          />
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Clients for {agency.name}
          </Typography>
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
            {clients.length === 0 && <Typography>No clients assigned.</Typography>}
          </List>
        </Grid>
      </Grid>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
      <Dialog open={!!conflictAgency} onClose={() => setConflictAgency(null)}>
        <DialogTitle>Client Already Associated</DialogTitle>
        <DialogContent>
          <Typography>
            This client is already associated with {conflictAgency}. Remove them
            from there and add again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictAgency(null)}>OK</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

