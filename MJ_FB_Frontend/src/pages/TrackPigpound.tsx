import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  TextField,
  IconButton,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import Page from '../components/Page';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import {
  getPigPounds,
  createPigPound,
  updatePigPound,
  deletePigPound,
  type PigPound,
} from '../api/pigPounds';

function format(date: Date) {
  return date.toLocaleDateString('en-CA');
}

export default function TrackPigpound() {
  const [entries, setEntries] = useState<PigPound[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<PigPound | null>(null);
  const [form, setForm] = useState<{ date: string; weight: string }>({
    date: format(new Date()),
    weight: '',
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PigPound | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  useEffect(() => {
    load();
  }, []);

  function load() {
    getPigPounds()
      .then(setEntries)
      .catch(() => setEntries([]));
  }

  function handleSave() {
    if (!form.date || !form.weight) return;
    const action = editing
      ? updatePigPound(editing.id, { date: form.date, weight: Number(form.weight) })
      : createPigPound({ date: form.date, weight: Number(form.weight) });
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({ date: format(new Date()), weight: '' });
        load();
        setSnackbar({ open: true, message: editing ? 'Entry updated' : 'Entry recorded' });
      })
      .catch(err =>
        setSnackbar({ open: true, message: err.message || 'Failed to save entry' }),
      );
  }

  return (
    <Page
      title="Track Pigpound"
      header={
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            setForm({ date: format(new Date()), weight: '' });
            setEditing(null);
            setRecordOpen(true);
          }}
        >
          Record Pig Pound Donation
        </Button>
      }
    >
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map(e => (
              <TableRow key={e.id}>
                <TableCell>
                  {new Date(e.date).toLocaleDateString('en-CA')}
                </TableCell>
                <TableCell>{e.weight}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditing(e);
                      setForm({ date: e.date, weight: String(e.weight) });
                      setRecordOpen(true);
                    }}
                    aria-label="Edit entry"
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setToDelete(e);
                      setDeleteOpen(true);
                    }}
                    aria-label="Delete entry"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={recordOpen}
        onClose={() => {
          setRecordOpen(false);
          setEditing(null);
        }}
      >
        <DialogTitle>{editing ? 'Edit Entry' : 'Record Entry'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Date"
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Weight"
              type="number"
              value={form.weight}
              onChange={e => setForm({ ...form, weight: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRecordOpen(false);
              setEditing(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.date || !form.weight}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setToDelete(null);
        }}
      >
        <DialogTitle>Delete Entry</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this entry?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteOpen(false);
              setToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (toDelete) {
                deletePigPound(toDelete.id)
                  .then(() => {
                    setSnackbar({ open: true, message: 'Entry deleted' });
                    setDeleteOpen(false);
                    setToDelete(null);
                    load();
                  })
                  .catch(err =>
                    setSnackbar({
                      open: true,
                      message: err.message || 'Failed to delete entry',
                    }),
                  );
              }
            }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
      />
    </Page>
  );
}
