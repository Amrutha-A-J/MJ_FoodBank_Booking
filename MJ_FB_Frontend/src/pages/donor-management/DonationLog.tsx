import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  TableContainer,
  Stack,
  Autocomplete,
} from '@mui/material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import StyledTabs from '../../components/StyledTabs';
import DialogCloseButton from '../../components/DialogCloseButton';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import DonorQuickLinks from '../../components/DonorQuickLinks';
import {
  getMonetaryDonors,
  createMonetaryDonor,
  getMonetaryDonations,
  createMonetaryDonation,
  type MonetaryDonor,
  type MonetaryDonation,
} from '../../api/monetaryDonors';
import {
  formatLocaleDate,
  toDate,
  formatDate,
  addDays,
} from '../../utils/date';

function startOfWeek(date: Date) {
  const d = toDate(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday first
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function format(date: Date) {
  return formatDate(date);
}

type DonationRow = MonetaryDonation & {
  firstName: string;
  lastName: string;
  email: string;
};

export default function DonationLog() {
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [donors, setDonors] = useState<MonetaryDonor[]>([]);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(toDate());
    const today = toDate();
    return Math.floor(
      (today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000),
    );
  });
  const [recordOpen, setRecordOpen] = useState(false);
  const [newDonorOpen, setNewDonorOpen] = useState(false);
  const [form, setForm] = useState<{
    date: string;
    donorId: number | null;
    amount: string;
  }>({
    date: formatDate(),
    donorId: null,
    amount: '',
  });
  const [donorForm, setDonorForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
  });

  const currency = useMemo(
    () => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }),
    [],
  );

  const weekDates = useMemo(() => {
    const start = startOfWeek(toDate());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  useEffect(() => {
    getMonetaryDonors()
      .then(d =>
        setDonors(
          d.sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`,
            ),
          ),
        ),
      )
      .catch(() => setDonors([]));
  }, []);

  const selectedDate = weekDates[tab];

  const loadDonations = useCallback(() => {
    const dateStr = format(selectedDate);
    if (donors.length === 0) {
      setDonations([]);
      return;
    }
    Promise.all(
      donors.map(d =>
        getMonetaryDonations(d.id)
          .then(list =>
            list
              .filter(n => n.date === dateStr)
              .map(n => ({
                ...n,
                firstName: d.firstName,
                lastName: d.lastName,
                email: d.email,
              })),
          )
          .catch(() => []),
      ),
    )
      .then(res => setDonations(res.flat()))
      .catch(() => setDonations([]));
  }, [donors, selectedDate]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  function handleSaveDonation() {
    if (!form.donorId || !form.amount) return;
    createMonetaryDonation(form.donorId, {
      date: form.date,
      amount: Number(form.amount),
    })
      .then(() => {
        setRecordOpen(false);
        setForm({ date: format(selectedDate), donorId: null, amount: '' });
        loadDonations();
        setSnackbar({ open: true, message: 'Donation recorded' });
      })
      .catch(() =>
        setSnackbar({ open: true, message: 'Failed to save donation' }),
      );
  }

  function handleAddDonor() {
    if (!donorForm.firstName || !donorForm.lastName || !donorForm.email) return;
    createMonetaryDonor(donorForm)
      .then(newDonor => {
        setDonors(
          [...donors, newDonor].sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`,
            ),
          ),
        );
        setNewDonorOpen(false);
        setDonorForm({ firstName: '', lastName: '', email: '' });
        setSnackbar({ open: true, message: 'Donor added' });
      })
      .catch(() =>
        setSnackbar({ open: true, message: 'Failed to add donor' }),
      );
  }

  const columns: Column<DonationRow>[] = [
    {
      field: 'date',
      header: 'Date',
      render: d => formatLocaleDate(d.date),
    },
    { field: 'firstName', header: 'First Name' },
    { field: 'lastName', header: 'Last Name' },
    { field: 'email', header: 'Email' },
    {
      field: 'amount',
      header: 'Amount',
      render: d => currency.format(d.amount),
    },
  ];

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
    <>
      <DonorQuickLinks />
      <Page title="Donation Log">
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={e => {
              (e.currentTarget as HTMLButtonElement).blur();
              setForm({ date: format(selectedDate), donorId: null, amount: '' });
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

        <Dialog
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
        >
          <DialogCloseButton onClose={() => setRecordOpen(false)} />
          <DialogTitle>Record Donation</DialogTitle>
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
            <Button
              onClick={handleAddDonor}
              disabled={!donorForm.firstName || !donorForm.lastName || !donorForm.email}
            >
              Save
            </Button>
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

