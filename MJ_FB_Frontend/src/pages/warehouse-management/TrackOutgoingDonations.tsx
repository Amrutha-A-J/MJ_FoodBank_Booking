import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  TableContainer,
  Stack,
  Autocomplete,
  IconButton,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import WarehouseQuickLinks from '../../components/WarehouseQuickLinks';
import StyledTabs from '../../components/StyledTabs';
import DialogCloseButton from '../../components/DialogCloseButton';
import { getOutgoingReceivers, createOutgoingReceiver } from '../../api/outgoingReceivers';
import { getOutgoingDonations, createOutgoingDonation, updateOutgoingDonation, deleteOutgoingDonation } from '../../api/outgoingDonations';
import type { OutgoingReceiver } from '../../api/outgoingReceivers';
import type { OutgoingDonation } from '../../api/outgoingDonations';
import { formatLocaleDate, toDate, formatDate, addDays } from '../../utils/date';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';

function startOfWeek(date: Date) {
  const d = toDate(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function format(date: Date) {
  return formatDate(date);
}

function normalize(date: string) {
  return date.split('T')[0];
}

export default function TrackOutgoingDonations() {
  const [donations, setDonations] = useState<OutgoingDonation[]>([]);
  const [receivers, setReceivers] = useState<OutgoingReceiver[]>([]);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(toDate());
    const today = toDate();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<OutgoingDonation | null>(null);
  const [newReceiverOpen, setNewReceiverOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<OutgoingDonation | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const weekDates = useMemo(() => {
    const start = startOfWeek(toDate());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const [form, setForm] = useState<{ date: string; receiverId: number | null; weight: string; note: string }>({
    date: formatDate(),
    receiverId: null,
    weight: '',
    note: '',
  });
  const [receiverName, setReceiverName] = useState('');

  type OutgoingDonationRow = OutgoingDonation & { actions?: string };

  const columns: Column<OutgoingDonationRow>[] = [
    {
      field: 'date',
      header: 'Date',
      render: d =>
        formatLocaleDate(d.date, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    { field: 'receiver', header: 'Receiver' },
    {
      field: 'weight',
      header: 'Weight (lbs)',
      render: d => `${d.weight} lbs`,
    },
    { field: 'note', header: 'Note', render: d => d.note || '' },
    {
      field: 'actions' as keyof OutgoingDonationRow & string,
      header: 'Actions',
      render: d => (
        <>
          <IconButton
            
            onClick={() => {
              setEditing(d);
              setForm({ date: normalize(d.date), receiverId: d.receiverId, weight: String(d.weight), note: d.note || '' });
              setRecordOpen(true);
            }}
            aria-label="Edit outgoing donation"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            
            onClick={() => {
              setToDelete(d);
              setDeleteOpen(true);
            }}
            aria-label="Delete outgoing donation"
          >
            <Delete fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  useEffect(() => {
    getOutgoingReceivers()
      .then(r => setReceivers(r.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setReceivers([]));
  }, []);

  const selectedDate = weekDates[tab];

  const loadDonations = useCallback(() => {
    getOutgoingDonations(format(selectedDate))
      .then(setDonations)
      .catch(() => setDonations([]));
  }, [selectedDate]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

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
    const name = receiverName.trim();
    if (!name) return;
    if (receivers.some(r => r.name.toLowerCase() === name.toLowerCase())) {
      setSnackbar({ open: true, message: 'Receiver already exists' });
      return;
    }
    createOutgoingReceiver(name)
      .then(newReceiver => {
        setReceivers([...receivers, newReceiver].sort((a, b) => a.name.localeCompare(b.name)));
        setForm(prev => ({ ...prev, receiverId: newReceiver.id }));
        setSnackbar({ open: true, message: 'Receiver added' });
        setNewReceiverOpen(false);
        setReceiverName('');
      })
      .catch(err => {
        setSnackbar({ open: true, message: err.message || 'Failed to add receiver' });
      });
  }

  const table = (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <ResponsiveTable
        columns={columns}
        rows={donations}
        getRowKey={r => r.id}
      />
    </TableContainer>
  );

  const tabs = weekDates.map(d => ({
    label: formatLocaleDate(d, { weekday: 'short' }),
    content: table,
  }));

  return (
    <>
      <WarehouseQuickLinks />
      <Page title="Track Outgoing Donations">
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            
            variant="contained"
            onClick={() => {
              setForm({ date: format(selectedDate), receiverId: null, weight: '', note: '' });
              setEditing(null);
              setRecordOpen(true);
            }}
          >
            Record Outgoing Donation
          </Button>
          <Button
            
            variant="outlined"
            onClick={() => {
              setReceiverName('');
              setNewReceiverOpen(true);
            }}
          >
            Add Receiver
          </Button>
        </Stack>
        <StyledTabs tabs={tabs} value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }} />

      <Dialog open={recordOpen} onClose={() => { setRecordOpen(false); setEditing(null); }}>
        <DialogCloseButton onClose={() => { setRecordOpen(false); setEditing(null); }} />
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
              label="Weight (lbs)"
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
          <Button onClick={handleSaveDonation} disabled={!form.receiverId || !form.weight}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setToDelete(null); }}>
        <DialogCloseButton onClose={() => { setDeleteOpen(false); setToDelete(null); }} />
        <DialogTitle>Delete Outgoing Donation</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this outgoing donation?</DialogContentText>
        </DialogContent>
        <DialogActions>
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
        <DialogCloseButton onClose={() => setNewReceiverOpen(false)} />
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
          <Button onClick={handleAddReceiver} disabled={!receiverName}>Save</Button>
        </DialogActions>
      </Dialog>

        <FeedbackSnackbar
          open={snackbar.open}
          onClose={() => setSnackbar({ open: false, message: '' })}
          message={snackbar.message}
        />
      </Page>
    </>
    );
  }
