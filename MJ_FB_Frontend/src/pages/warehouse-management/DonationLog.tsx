import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
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
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import StyledTabs from '../../components/StyledTabs';
import DialogCloseButton from '../../components/DialogCloseButton';
import { getDonors, createDonor } from '../../api/donors';
import { getDonations, createDonation, updateDonation, deleteDonation } from '../../api/donations';
import type { Donor } from '../../api/donors';
import type { Donation } from '../../api/donations';
import { formatLocaleDate, toDate, toDayjs, formatDate, addDays } from '../../utils/date';

function startOfWeek(date: Date) {
  const d = toDayjs(date);
  const day = d.day();
  return d.add(day === 0 ? -6 : 1 - day, 'day').startOf('day').toDate();
}

function format(date: Date) {
  return formatDate(date);
}

export default function DonationLog() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(toDate());
    const today = toDate();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<Donation | null>(null);
  const [newDonorOpen, setNewDonorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Donation | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const weekDates = useMemo(() => {
    const start = startOfWeek(toDate());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const [form, setForm] = useState<{ date: string; donorId: number | null; weight: string }>({
    date: formatDate(),
    donorId: null,
    weight: '',
  });
  const [donorName, setDonorName] = useState('');

  useEffect(() => {
    getDonors()
      .then(d => setDonors(d.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setDonors([]));
  }, []);

  const selectedDate = weekDates[tab];

  const loadDonations = useCallback(() => {
    getDonations(format(selectedDate))
      .then(setDonations)
      .catch(() => setDonations([]));
  }, [selectedDate]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  function handleSaveDonation() {
    if (!form.donorId || !form.weight) return;
    const action = editing
      ? updateDonation(editing.id, { date: form.date, donorId: form.donorId, weight: Number(form.weight) })
      : createDonation({ date: form.date, donorId: form.donorId, weight: Number(form.weight) });
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({ date: format(selectedDate), donorId: null, weight: '' });
        loadDonations();
        setSnackbar({ open: true, message: editing ? 'Donation updated' : 'Donation recorded' });
      })
      .catch(err => setSnackbar({ open: true, message: err.message || 'Failed to save donation' }));
  }

  function handleAddDonor() {
    if (donorName && !donors.some(d => d.name === donorName)) {
      createDonor(donorName)
        .then(newDonor => {
          setDonors([...donors, newDonor].sort((a, b) => a.name.localeCompare(b.name)));
          setSnackbar({ open: true, message: 'Donor added' });
        })
        .catch(err => {
          setSnackbar({ open: true, message: err.message || 'Failed to add donor' });
        });
    }
    setDonorName('');
    setNewDonorOpen(false);
  }

  const table = (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Donor</TableCell>
            <TableCell>Weight (lbs)</TableCell>
            <TableCell align="right"></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {donations.map(d => (
            <TableRow key={d.id}>
              <TableCell>{d.donor}</TableCell>
              <TableCell>{d.weight} lbs</TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={e => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    setEditing(d);
                    setForm({ date: d.date, donorId: d.donorId, weight: String(d.weight) });
                    setRecordOpen(true);
                  }}
                  aria-label="Edit donation"
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={e => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    setToDelete(d);
                    setDeleteOpen(true);
                  }}
                  aria-label="Delete donation"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const tabs = weekDates.map(d => ({
    label: formatLocaleDate(d, { weekday: 'short' }),
    content: table,
  }));

  return (
    <Page
      title="Donation Log"
      header={
        <Stack direction="row" spacing={1} mb={2}>
          <Button
            size="small"
            variant="contained"
            onClick={e => {
              (e.currentTarget as HTMLButtonElement).blur();
              setForm({ date: format(selectedDate), donorId: null, weight: '' });
              setEditing(null);
              setRecordOpen(true);
            }}
          >
            Record Donation
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={e => {
              (e.currentTarget as HTMLButtonElement).blur();
              setNewDonorOpen(true);
            }}
          >
            Add Donor
          </Button>
        </Stack>
      }
    >
      <StyledTabs tabs={tabs} value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }} />

      <Dialog open={recordOpen} onClose={() => { setRecordOpen(false); setEditing(null); }}>
        <DialogCloseButton onClose={() => { setRecordOpen(false); setEditing(null); }} />
        <DialogTitle>{editing ? 'Edit Donation' : 'Record Donation'}</DialogTitle>
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
              options={donors}
              value={donors.find(d => d.id === form.donorId) || null}
              onChange={(_e, v) => setForm({ ...form, donorId: v ? v.id : null })}
              renderInput={params => <TextField {...params} label="Donor" />}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={option => option.name}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveDonation} disabled={!form.donorId || !form.weight}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setToDelete(null); }}>
        <DialogCloseButton onClose={() => { setDeleteOpen(false); setToDelete(null); }} />
        <DialogTitle>Delete Donation</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this donation?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (toDelete) {
                deleteDonation(toDelete.id)
                  .then(() => {
                    setSnackbar({ open: true, message: 'Donation deleted' });
                    setDeleteOpen(false);
                    setToDelete(null);
                    loadDonations();
                  })
                  .catch(err => {
                    setSnackbar({ open: true, message: err.message || 'Failed to delete donation' });
                  });
              }
            }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newDonorOpen} onClose={() => setNewDonorOpen(false)}>
        <DialogCloseButton onClose={() => setNewDonorOpen(false)} />
        <DialogTitle>Add Donor</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Donor Name"
            value={donorName}
            onChange={e => setDonorName(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDonor} disabled={!donorName}>Save</Button>
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
