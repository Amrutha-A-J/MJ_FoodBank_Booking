import { useEffect, useState } from 'react';
import { IconButton, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Page from '../../../components/Page';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import ResponsiveTable from '../../../components/ResponsiveTable';
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
      <ResponsiveTable
        columns={[
          { field: 'name', header: 'Name' },
          { field: 'email', header: 'Email' },
          { field: 'phone', header: 'Phone' },
          { field: 'created_at', header: 'Created' },
          {
            field: 'actions' as keyof NewClient & string,
            header: 'Actions',
            render: c => (
              <Stack direction="row" justifyContent="flex-end">
                <IconButton
                  aria-label="delete"
                  onClick={() => handleDelete(c.id)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            ),
          },
        ]}
        rows={clients}
        getRowKey={c => c.id}
      />
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message ?? ''}
        severity={snackbar?.severity}
      />
    </Page>
  );
}

