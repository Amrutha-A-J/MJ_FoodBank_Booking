import { useEffect, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import ResponsiveTable, { type Column } from '../../../components/ResponsiveTable';
import { getNewClients, deleteNewClient, type NewClient } from '../../../api/users';
import type { AlertColor } from '@mui/material';

export default function NewClients() {
  const [clients, setClients] = useState<NewClient[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  } | null>(null);
  const [confirm, setConfirm] = useState<NewClient | null>(null);

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

  type ClientRow = NewClient & { actions?: string };

  const columns: Column<ClientRow>[] = [
    { field: 'name', header: 'Name' },
    { field: 'email', header: 'Email', render: c => c.email ?? '' },
    { field: 'phone', header: 'Phone', render: c => c.phone ?? '' },
    { field: 'created_at', header: 'Created' },
    {
      field: 'actions' as keyof ClientRow & string,
      header: 'Actions',
      render: c => (
        <IconButton
          aria-label="delete"
          onClick={() => setConfirm(c)}
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        New Clients
      </Typography>
      <ResponsiveTable columns={columns} rows={clients} getRowKey={c => c.id} />
      {confirm && (
        <ConfirmDialog
          message={`Delete ${confirm.name}?`}
          onConfirm={async () => {
            await handleDelete(confirm.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message ?? ''}
        severity={snackbar?.severity}
      />
    </Box>
  );
}

