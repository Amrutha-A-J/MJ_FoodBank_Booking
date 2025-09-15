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
      const data = await getAgencyClients(id);
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.clients)
        ? (data as any).clients
        : [];
      const mapped = list.map((c: any) => ({
        id: typeof c === 'object' ? c.client_id : Number(c),
        name:
          typeof c === 'object'
            ? c.name ??
              c.client_name ??
              `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()
            : `ID: ${c}`,
        email: typeof c === 'object' ? c.email : undefined,
      }));
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
    if (!user.client_id) return;
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

  const handleRemove = (client: AgencyClient) => {
    setRemoveClient(client);
  };

  const confirmRemove = async () => {
    if (!agency || !removeClient) return;
    try {
      await removeAgencyClient(agency.id, removeClient.id);
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
                          handleAdd(u);
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
                      key={c.id}
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
                      <ListItemText primary={c.name} secondary={`ID: ${c.id}`} />
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
                userId={bookingClient.id}
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

