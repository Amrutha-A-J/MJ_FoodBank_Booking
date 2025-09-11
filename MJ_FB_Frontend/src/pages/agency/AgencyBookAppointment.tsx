import { useEffect, useState } from 'react';
import {
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import BookingUI from '../BookingUI';
import { searchAgencyClients } from '../../api/agencies';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import Page from '../../components/Page';

interface AgencyClient {
  id: number;
  name: string;
  email?: string;
}

export default function AgencyBookAppointment() {
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AgencyClient | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    if (!search) {
      setClients([]);
      return;
    }
    setLoadingClients(true);
    let active = true;
    searchAgencyClients(search)
      .then(data => {
        if (!active) return;
        interface AgencyClientData {
          id?: number;
          client_id?: number;
          name?: string;
          client_name?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
        }
        const mapped = Array.isArray(data)
          ? data.map((c: AgencyClientData) => ({
              id: c.id ?? c.client_id!,
              name:
                c.name ??
                c.client_name ??
                `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
              email: c.email,
            }))
          : [];
        setClients(mapped);
      })
      .catch(() => active && setSnackbar('Failed to load clients'))
      .finally(() => {
        if (active) setLoadingClients(false);
      });
    return () => {
      active = false;
    };
  }, [search]);

  return (
    <Page title="Book Appointment">
      <TextField
        label="Search Clients"
        value={search}
        onChange={e => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      {search && (
        <>
          {loadingClients && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <CircularProgress size={20} />
            </Box>
          )}
          {!loadingClients && clients.length > 0 && (
            <List>
              {clients.map(u => (
                <ListItemButton
                  key={u.id}
                  onClick={() => {
                    setSelected(u);
                    setLoading(true);
                    setSearch('');
                  }}
                >
                  <ListItemText primary={u.name} secondary={u.email} />
                </ListItemButton>
              ))}
            </List>
          )}
          {!loadingClients && clients.length === 0 && (
            <Typography>No clients found</Typography>
          )}
        </>
      )}
      {selected && (
        <>
          {loading && (
            <Box
              sx={{
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={24} />
              <Typography sx={{ ml: 2 }}>Loading availability...</Typography>
            </Box>
          )}
          <Box sx={{ display: loading ? 'none' : 'block' }}>
            <BookingUI
              shopperName={selected.name}
              userId={selected.id}
              embedded
              onLoadingChange={setLoading}
            />
          </Box>
        </>
      )}
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar('')}
        message={snackbar}
        severity="error"
      />
    </Page>
  );
}

