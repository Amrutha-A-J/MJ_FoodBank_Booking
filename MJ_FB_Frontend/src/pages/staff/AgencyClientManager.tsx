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
  Card,
  CardContent,
  Box,
  Stack,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EntitySearch from '../../components/EntitySearch';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  addAgencyClient,
  removeAgencyClient,
  getAgencyClients,
} from '../../api/agencies';
import BookingUI from '../BookingUI';
import type { AgencyClient } from '../../types';

export default function AgencyClientManager() {
  const [agency, setAgency] = useState<{ id: number; name: string } | null>(null);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: 'success' | 'error' } | null
  >(null);
  const [conflictAgency, setConflictAgency] = useState<string | null>(null);
  const [bookingClient, setBookingClient] = useState<AgencyClient | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [removeClient, setRemoveClient] = useState<AgencyClient | null>(null);

  const load = async (id: number) => {
    try {
      const data = (await getAgencyClients(id)) as unknown;
      const list: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray((data as { clients?: unknown[] }).clients)
        ? (data as { clients: unknown[] }).clients
        : [];
      const mapped: AgencyClient[] = list.map(c => {
        if (typeof c === 'object' && c !== null) {
          const obj = c as Record<string, unknown>;
          const clientId =
            typeof obj.client_id === 'number'
              ? obj.client_id
              : Number(obj.id);
          const name =
            typeof obj.name === 'string'
              ? obj.name
              : typeof obj.client_name === 'string'
              ? obj.client_name
              : `${(obj.first_name as string | undefined) ?? ''} ${
                  (obj.last_name as string | undefined) ?? ''
                }`.trim();
          const email =
            typeof obj.email === 'string' ? obj.email : undefined;
          return { clientId, name, email };
        }
        return { clientId: Number(c), name: `ID: ${c}` };
      });
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

  const handleAdd = async (user: AgencyClient) => {
    if (!agency) {
      setSnackbar({ message: 'Select an agency first', severity: 'error' });
      return;
    }
    if (!user.clientId) return;
    try {
      await addAgencyClient(agency.id, user.clientId);
      setSnackbar({ message: 'Client added', severity: 'success' });
      load(agency.id);
    } catch (err: unknown) {
      const e = err as { details?: { agencyName?: unknown }; message?: string };
      if (e.details?.agencyName) {
        setConflictAgency(String(e.details.agencyName));
      } else {
        setSnackbar({
          message: e.message || 'Failed to add client',
          severity: 'error',
        });
      }
    }
  };

  const handleRemove = (client: AgencyClient) => {
    setRemoveClient(client);
  };

  const confirmRemove = async () => {
    if (!agency || !removeClient) return;
    try {
      await removeAgencyClient(agency.id, removeClient.clientId);
      setSnackbar({ message: 'Client removed', severity: 'success' });
      load(agency.id);
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to remove client',
        severity: 'error',
      });
    }
    setRemoveClient(null);
  };
  const handleBook = (client: AgencyClient) => {
    setBookingClient(client);
    setBookingLoading(true);
  };
  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Select Agency
          </Typography>
          <EntitySearch
            type="agency"
            placeholder="Search agencies"
            onSelect={ag => setAgency({ id: Number(ag.id), name: ag.name })}
          />
        </CardContent>
      </Card>
      {agency && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Search Clients
                </Typography>
                <EntitySearch
                  type="user"
                  placeholder="Search clients"
                  onSelect={() => {}}
                  clearOnSelect
                  renderResult={(u, select) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{`${u.name} (${u.client_id})`}</span>
                      <Button
                        
                        variant="contained"
                        onClick={() => {
                          const result = u as {
                            client_id?: number | string;
                            id?: number | string;
                            name: string;
                            email?: string;
                          };
                          handleAdd({
                            clientId: Number(result.client_id ?? result.id),
                            name: result.name,
                            email: result.email,
                          });
                          select();
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Clients for {agency.name}
                </Typography>
                <List dense>
                  {clients.map(c => (
                    <ListItem
                      key={c.clientId}
                      secondaryAction={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button
                            
                            variant="contained"
                            onClick={() => handleBook(c)}
                          >
                            Book
                          </Button>
                          <IconButton
                            edge="end"
                            aria-label="remove"
                            onClick={() => handleRemove(c)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <ListItemText primary={c.name} secondary={`ID: ${c.clientId}`} />
                    </ListItem>
                  ))}
                  {clients.length === 0 && <Typography>No clients assigned.</Typography>}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      {removeClient && (
        <ConfirmDialog
          message="Remove this client from the agency?"
          onConfirm={confirmRemove}
          onCancel={() => setRemoveClient(null)}
        />
      )}
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
      <Dialog
        open={!!bookingClient}
        onClose={() => setBookingClient(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {bookingClient
            ? `Book for ${bookingClient.name}`
            : 'Book Shopping Appointment'}
        </DialogTitle>
        <DialogContent>
          {bookingLoading && (
            <Box
              sx={{
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={24} />
            </Box>
          )}
          {bookingClient && (
            <Box sx={{ display: bookingLoading ? 'none' : 'block' }}>
              <BookingUI
                shopperName={bookingClient.name}
                userId={bookingClient.clientId}
                embedded
                onLoadingChange={setBookingLoading}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingClient(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

