import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import EntitySearch from '../../../components/EntitySearch';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import { deleteUser } from '../../../api/users';

interface Client { name: string; client_id: number; }

export default function DeleteClient() {
  const [client, setClient] = useState<Client | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');

  async function handleDelete() {
    if (!client) return;
    try {
      await deleteUser(client.client_id);
      setMessage('Client deleted');
      setSeverity('success');
      setClient(null);
    } catch {
      setMessage('Delete failed');
      setSeverity('error');
    }
    setConfirm(false);
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Delete Client
      </Typography>
      <EntitySearch type="user" placeholder="Search client" onSelect={c => setClient(c as Client)} />
      {client && (
        <Button
          size="small"
          variant="contained"
          color="error"
          sx={{ mt: 2 }}
          onClick={() => setConfirm(true)}
        >
          Delete
        </Button>
      )}
      {confirm && (
        <ConfirmDialog
          message={`Delete ${client?.name}?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(false)}
        />
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Box>
  );
}
