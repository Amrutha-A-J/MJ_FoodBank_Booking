import { useState, useEffect } from 'react';
import { TextField, List, ListItemButton, ListItemText } from '@mui/material';
import BookingUI from '../BookingUI';
import { searchUsers } from '../../api/users';
import { addAgencyClient } from '../../api/agencies';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { useAuth } from '../../hooks/useAuth';
import Page from '../../components/Page';

interface User { id: number; name: string; email: string; client_id: number; }

export default function ClientBookings() {
  const { id: agencyId } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    if (search.length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchUsers(search)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function choose(user: User) {
    if (!agencyId) return;
    try {
      await addAgencyClient(agencyId, user.client_id);
      setSelected(user);
      setSnackbar('Client added');
    } catch (err: any) {
      setSnackbar(err.message ?? 'Failed to add client');
    }
  }

  return (
    <Page title="Client Bookings">
      <TextField
        label="Search Clients"
        value={search}
        onChange={e => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <List>
        {results.map(u => (
          <ListItemButton key={u.id} onClick={() => choose(u)}>
            <ListItemText primary={u.name} secondary={u.email} />
          </ListItemButton>
        ))}
      </List>
      {selected && <BookingUI shopperName={selected.name} userId={selected.id} />}
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar('')}
        message={snackbar}
        severity="info"
      />
    </Page>
  );
}
