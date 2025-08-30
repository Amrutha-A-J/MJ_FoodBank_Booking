import { useEffect, useState } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Page from '../../../components/Page';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import {
  getNewClients,
  deleteNewClient,
  type NewClient,
} from '../../../api/users';
import type { AlertColor } from '@mui/material';

export default function NewClients() {
  const [clients, setClients] = useState<NewClient[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  } | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    getNewClients()
      .then(setClients)
      .catch(() => setClients([]));
  }

  async function handleDelete(id: number) {
    try {
      await deleteNewClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
      setSnackbar({ open: true, message: 'Client deleted', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : String(err),
        severity: 'error',
      });
    }
  }

  return (
    <Page title="New Clients">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clients.map(c => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.phone}</TableCell>
              <TableCell>{c.created_at}</TableCell>
              <TableCell align="right">
                <IconButton aria-label="delete" onClick={() => handleDelete(c.id)} size="small">
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message ?? ''}
        severity={snackbar?.severity}
      />
    </Page>
  );
}

