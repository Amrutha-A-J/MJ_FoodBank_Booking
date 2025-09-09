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
import StyledTabs from '../../components/StyledTabs';
import DialogCloseButton from '../../components/DialogCloseButton';
import {
  getMonetaryDonors,
  createMonetaryDonor,
  getMonetaryDonations,
  createMonetaryDonation,
  updateMonetaryDonation,
  deleteMonetaryDonation,
  type MonetaryDonor,
  type MonetaryDonation,
} from '../../api/monetaryDonors';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import { formatLocaleDate, toDate, formatDate, addDays } from '../../utils/date';

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

export default function DonationLog() {
  const [donations, setDonations] = useState<MonetaryDonationRow[]>([]);
  const [donors, setDonors] = useState<MonetaryDonor[]>([]);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(toDate());
    const today = toDate();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<MonetaryDonationRow | null>(null);
  const [newDonorOpen, setNewDonorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<MonetaryDonationRow | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const weekDates = useMemo(() => {
    const start = startOfWeek(toDate());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const [form, setForm] = useState<{ date: string; donorId: number | null; amount: string }>({
    date: formatDate(),
    donorId: null,
    amount: '',
  });
  const [donorForm, setDonorForm] = useState<{ firstName: string; lastName: string; email: string }>({
    firstName: '',
    lastName: '',
    email: '',
  });

  type MonetaryDonationRow = MonetaryDonation & { donor: string };

  const columns: Column<MonetaryDonationRow>[] = [
    {
      field: 'date',
      header: 'Date',
      render: d => formatLocaleDate(d.date),
    },
    { field: 'donor', header: 'Donor' },
    {
      field: 'amount',
      header: 'Amount',
      render: d => `$${d.amount}`,
    },
    {
      field: 'actions' as keyof MonetaryDonationRow & string,
      header: 'Actions',
      render: d => (
        <>
          <IconButton
            onClick={e => {
              (e.currentTarget as HTMLButtonElement).blur();
              setEditing(d);
              setForm({ date: d.date, donorId: d.donorId, amount: String(d.amount) });
              setRecordOpen(true);
            }}
            aria-label="Edit donation"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            onClick={e => {
              (e.currentTarget as HTMLButtonElement).blur();
              setToDelete(d);
              setDeleteOpen(true);
            }}
            aria-label="Delete donation"
          >
            <Delete fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  useEffect(() => {
    getMonetaryDonors()
      .then(d =>
        setDonors(
          d.sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
          ),
        ),
      )
      .catch(() => setDonors([]));
  }, []);

  const selectedDate = weekDates[tab];

  const loadDonations = useCallback(() => {
    Promise.all(
      donors.map(d =>
        getMonetaryDonations(d.id).then(res =>
          res
            .filter(n => n.date === format(selectedDate))
            .map(n => ({ ...n, donor: `${d.firstName} ${d.lastName}` })),
        ),
      ),
    )
      .then(res => setDonations(res.flat()))
      .catch(() => setDonations([]));
  }, [donors, selectedDate]);

  useEffect(() => {
    if (donors.length) loadDonations();
  }, [donors, loadDonations]);

  function handleSaveDonation() {
    if (!form.donorId || !form.amount) return;
    const action = editing
      ? updateMonetaryDonation(form.donorId, editing.id, {
          date: form.date,
          amount: Number(form.amount),
        })
      : createMonetaryDonation(form.donorId, {
          date: form.date,
          amount: Number(form.amount),
        });
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({ date: format(selectedDate), donorId: null, amount: '' });
        loadDonations();
        setSnackbar({ open: true, message: editing ? 'Donation updated' : 'Donation recorded' });
      })
      .catch(err => setSnackbar({ open: true, message: err.message || 'Failed to save donation' }));
  }

  function handleAddDonor() {
    if (donorForm.firstName && donorForm.lastName) {
      createMonetaryDonor(donorForm)
        .then(newDonor => {
          setDonors(
            [...donors, newDonor].sort((a, b) =>
              `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
            ),
          );
          setSnackbar({ open: true, message: 'Donor added' });
        })
        .catch(err => {
          setSnackbar({ open: true, message: err.message || 'Failed to add donor' });
        });
    }
    setDonorForm({ firstName: '', lastName: '', email: '' });
    setNewDonorOpen(false);
  }

  const table = (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <ResponsiveTable columns={columns} rows={donations} getRowKey={r => r.id} />
    </TableContainer>
  );

  const tabs = weekDates.map(d => ({
    label: formatLocaleDate(d, { weekday: 'short' }),
    content: table,
  }));

  return (
    <Page title="Donation Log">
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={e => {
            (e.currentTarget as HTMLButtonElement).blur();
            setForm({ date: format(selectedDate), donorId: null, amount: '' });
            setEditing(null);
            setRecordOpen(true);
          }}
        >
          Record Donation
        </Button>
        <Button
          variant="outlined"
          onClick={e => {
            (e.currentTarget as HTMLButtonElement).blur();
            setNewDonorOpen(true);
          }}
        >
          Add Donor
        </Button>
      </Stack>
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
              label="Amount"
              type="number"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
            <Autocomplete
              options={donors}
              value={donors.find(d => d.id === form.donorId) || null}
              onChange={(_e, v) => setForm({ ...form, donorId: v ? v.id : null })}
              renderInput={params => <TextField {...params} label="Donor" />}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={option => `${option.firstName} ${option.lastName}`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveDonation} disabled={!form.donorId || !form.amount}>
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
                deleteMonetaryDonation(toDelete.donorId, toDelete.id)
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
          <Stack spacing={2} mt={1}>
            <TextField
              label="First Name"
              value={donorForm.firstName}
              onChange={e => setDonorForm({ ...donorForm, firstName: e.target.value })}
            />
            <TextField
              label="Last Name"
              value={donorForm.lastName}
              onChange={e => setDonorForm({ ...donorForm, lastName: e.target.value })}
            />
            <TextField
              label="Email"
              type="email"
              value={donorForm.email}
              onChange={e => setDonorForm({ ...donorForm, email: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDonor} disabled={!donorForm.firstName || !donorForm.lastName}>Save</Button>
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

