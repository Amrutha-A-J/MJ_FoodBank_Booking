import { useState, useMemo, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  Autocomplete,
  IconButton,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import Page from '../components/Page';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { getOutgoingReceivers, createOutgoingReceiver } from '../api/outgoingReceivers';
import { getOutgoingDonations, createOutgoingDonation, updateOutgoingDonation, deleteOutgoingDonation } from '../api/outgoingDonations';
import type { OutgoingReceiver } from '../api/outgoingReceivers';
import type { OutgoingDonation } from '../api/outgoingDonations';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function format(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function TrackOutgoingDonations() {
  const [donations, setDonations] = useState<OutgoingDonation[]>([]);
  const [receivers, setReceivers] = useState<OutgoingReceiver[]>([]);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(new Date());
    const today = new Date();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<OutgoingDonation | null>(null);
  const [newReceiverOpen, setNewReceiverOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<OutgoingDonation | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  const [form, setForm] = useState<{ date: string; receiverId: number | null; weight: string; note: string }>({
    date: format(new Date()),
    receiverId: null,
    weight: '',
    note: '',
  });
  const [receiverName, setReceiverName] = useState('');

  useEffect(() => {
    getOutgoingReceivers()
      .then(r => setReceivers(r.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setReceivers([]));
  }, []);

  const selectedDate = weekDates[tab];

  function loadDonations() {
    getOutgoingDonations(format(selectedDate))
      .then(setDonations)
      .catch(() => setDonations([]));
  }

  useEffect(() => {
    loadDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  function handleSaveDonation() {
    if (!form.receiverId || !form.weight) return;
    const action = editing
      ? updateOutgoingDonation(editing.id, { date: form.date, receiverId: form.receiverId, weight: Number(form.weight), note: form.note })
      : createOutgoingDonation({ date: form.date, receiverId: form.receiverId, weight: Number(form.weight), note: form.note });
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({ date: format(selectedDate), receiverId: null, weight: '', note: '' });
        loadDonations();
        setSnackbar({ open: true, message: editing ? 'Outgoing donation updated' : 'Outgoing donation recorded' });
      })
      .catch(err => setSnackbar({ open: true, message: err.message || 'Failed to save outgoing donation' }));
  }

  function handleAddReceiver() {
    if (receiverName && !receivers.some(r => r.name === receiverName)) {
      createOutgoingReceiver(receiverName)
        .then(newReceiver => {
          setReceivers([...receivers, newReceiver].sort((a, b) => a.name.localeCompare(b.name)));
          setSnackbar({ open: true, message: 'Receiver added' });
        })
        .catch(err => {
          setSnackbar({ open: true, message: err.message || 'Failed to add receiver' });
        });
    }
    setReceiverName('');
    setNewReceiverOpen(false);
  }

  return (
    <Page
      title="Track Outgoing Donations"
      actions={
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" onClick={() => setRecordOpen(true)}>
            Record Outgoing Donation
          </Button>
          <Button size="small" variant="outlined" onClick={() => setNewReceiverOpen(true)}>
            Add Receiver
          </Button>
        </Stack>
      }
    >
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        {weekDates.map((d, i) => (
          <Tab key={i} label={d.toLocaleDateString(undefined, { weekday: 'short' })} />
        ))}
      </Tabs>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Receiver</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Note</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {donations.map(d => (
              <TableRow key={d.id}>
                <TableCell>{d.date}</TableCell>
                <TableCell>{d.receiver}</TableCell>
                <TableCell>{d.weight}</TableCell>
                <TableCell>{d.note}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditing(d);
                      setForm({ date: d.date, receiverId: d.receiverId, weight: String(d.weight), note: d.note || '' });
                      setRecordOpen(true);
                    }}
                    aria-label="Edit outgoing donation"
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => { setToDelete(d); setDeleteOpen(true); }} aria-label="Delete outgoing donation">
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={recordOpen} onClose={() => { setRecordOpen(false); setEditing(null); }}>
        <DialogTitle>{editing ? 'Edit Outgoing Donation' : 'Record Outgoing Donation'}</DialogTitle>
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
            <Autocomplete
              options={receivers}
              value={receivers.find(r => r.id === form.receiverId) || null}
              onChange={(_e, v) => setForm({ ...form, receiverId: v ? v.id : null })}
              renderInput={params => <TextField {...params} label="Receiver" />}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={option => option.name}
            />
            <TextField
              label="Note"
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              multiline
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRecordOpen(false); setEditing(null); }}>Cancel</Button>
          <Button onClick={handleSaveDonation} disabled={!form.receiverId || !form.weight}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setToDelete(null); }}>
        <DialogTitle>Delete Outgoing Donation</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this outgoing donation?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteOpen(false); setToDelete(null); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (toDelete) {
                deleteOutgoingDonation(toDelete.id)
                  .then(() => {
                    setSnackbar({ open: true, message: 'Outgoing donation deleted' });
                    setDeleteOpen(false);
                    setToDelete(null);
                    loadDonations();
                  })
                  .catch(err => {
                    setSnackbar({ open: true, message: err.message || 'Failed to delete outgoing donation' });
                  });
              }
            }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newReceiverOpen} onClose={() => setNewReceiverOpen(false)}>
        <DialogTitle>Add Donation Receiver</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Receiver Name"
            value={receiverName}
            onChange={e => setReceiverName(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewReceiverOpen(false)}>Cancel</Button>
          <Button onClick={handleAddReceiver} disabled={!receiverName}>Save</Button>
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
