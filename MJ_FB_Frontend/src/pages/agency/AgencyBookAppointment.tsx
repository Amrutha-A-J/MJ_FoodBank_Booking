import { useEffect, useState } from 'react';
import { TextField, List, ListItemButton, ListItemText } from '@mui/material';
import BookingUI from '../BookingUI';
import { getMyAgencyClients } from '../../api/agencies';
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

  useEffect(() => {
    getMyAgencyClients()
      .then(data => {
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
      })
      .catch(() => setSnackbar('Failed to load clients'));
  }, []);

  const filtered = search
    ? clients.filter(c => {
        const term = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(term) ||
          (c.email ? c.email.toLowerCase().includes(term) : false)
        );
      })
    : [];

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
        <List>
          {filtered.map(u => (
            <ListItemButton
              key={u.id}
              onClick={() => {
                setSelected(u);
                setSearch('');
              }}
            >
              <ListItemText primary={u.name} secondary={u.email} />
            </ListItemButton>
          ))}
        </List>
      )}
      {selected && (
        <BookingUI
          shopperName={selected.name}
          userId={selected.id}
          embedded
        />
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

