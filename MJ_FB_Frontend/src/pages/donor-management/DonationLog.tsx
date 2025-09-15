import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Box,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import DonorQuickLinks from '../../components/DonorQuickLinks';
import {
  getMonetaryDonors,
  createMonetaryDonor,
  getMonetaryDonations,
  createMonetaryDonation,
  updateMonetaryDonation,
  deleteMonetaryDonation,
  importZeffyDonations,
  type MonetaryDonor,
  type MonetaryDonation,
} from '../../api/monetaryDonors';
import { formatLocaleDate } from '../../utils/date';

function formatMonth(dateMs = Date.now()) {
  const date = new Date(dateMs);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

type DonationRow = MonetaryDonation & {
  firstName: string;
  lastName: string;
  email: string | null;
};

export default function DonationLog() {
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [donors, setDonors] = useState<MonetaryDonor[]>([]);
  const [month, setMonth] = useState(formatMonth());
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<DonationRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<DonationRow | null>(null);
  const [newDonorOpen, setNewDonorOpen] = useState(false);
  const [form, setForm] = useState<{
    date: string;
    donorId: number | null;
    amount: string;
  }>({
    date: `${month}-01`,
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
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importZeffyDonations(file);
      const donorSearch = search && isNaN(Number(search)) ? search : undefined;
      const donorList = await getMonetaryDonors(donorSearch).catch(() => []);
      const sorted = donorList.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        ),
      );
      setDonors(sorted);
      await loadDonations(sorted);
      setSnackbar({ open: true, message: 'Donations imported' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to import donations' });
    } finally {
      e.target.value = '';
    }
  }

  const currency = useMemo(
    () => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }),
    [],
  );

  const filteredDonations = useMemo(
    () => {
      const s = search.toLowerCase();
      return donations.filter(
        d =>
          d.firstName.toLowerCase().includes(s) ||
          d.lastName.toLowerCase().includes(s) ||
          (d.email ?? '').toLowerCase().includes(s) ||
          d.amount.toString().includes(s) ||
          String(d.donorId).includes(s),
      );
    },
    [donations, search],
  );

  const loadDonations = useCallback(
    async (list: MonetaryDonor[] = donors) => {
      if (list.length === 0) {
        setDonations([]);
        return;
      }
      try {
        const res = await Promise.all(
          list.map(d =>
            getMonetaryDonations(d.id)
              .then(list =>
                list
                  .filter(n => n.date.startsWith(`${month}-`))
                  .map(n => ({
                    ...n,
                    firstName: d.firstName,
                    lastName: d.lastName,
                    email: d.email,
                  })),
              )
              .catch(() => []),
          ),
        );
        setDonations(
          res
            .flat()
            .sort((a, b) => a.date.localeCompare(b.date)),
        );
      } catch {
        setDonations([]);
      }
    },
    [donors, month],
  );

  useEffect(() => {
    const donorSearch = search || undefined;
    getMonetaryDonors(donorSearch)
      .then(d => {
        const sorted = d.sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`,
          ),
        );
        setDonors(sorted);
        loadDonations(sorted);
      })
      .catch(() => setDonors([]));
  }, [search]);

  useEffect(() => {
    loadDonations();
  }, [month]);

  function handleSaveDonation() {
    if (!form.donorId || !form.amount) return;
    const base = { date: form.date, amount: Number(form.amount) };
    const action = editing
      ? updateMonetaryDonation(editing.id, { ...base, donorId: form.donorId })
      : createMonetaryDonation(form.donorId, base);
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({ date: `${month}-01`, donorId: null, amount: '' });
        loadDonations();
        setSnackbar({
          open: true,
          message: editing ? 'Donation updated' : 'Donation recorded',
        });
      })
      .catch(() =>
        setSnackbar({ open: true, message: 'Failed to save donation' }),
      );
  }

  function handleDeleteDonation() {
    if (!toDelete) return;
    deleteMonetaryDonation(toDelete.id)
      .then(() => {
        setSnackbar({ open: true, message: 'Donation deleted' });
        setDeleteOpen(false);
        setToDelete(null);
        loadDonations();
      })
      .catch(() =>
        setSnackbar({ open: true, message: 'Failed to delete donation' }),
      );
  }

  function handleAddDonor() {
    if (!donorForm.firstName || !donorForm.lastName) return;
    createMonetaryDonor({
      firstName: donorForm.firstName,
      lastName: donorForm.lastName,
      email: donorForm.email || null,
    })
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
    { field: 'email', header: 'Email', render: d => d.email ?? '' },
    {
      field: 'amount',
      header: 'Amount',
      render: d => currency.format(d.amount),
    },
    {
      field: 'actions' as keyof DonationRow & string,
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

  const table = (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <ResponsiveTable columns={columns} rows={filteredDonations} getRowKey={r => r.id} />
    </TableContainer>
  );

  return (
    <>
      <DonorQuickLinks />
      <Page title="Donation Log">
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={e => {
              (e.currentTarget as HTMLButtonElement).blur();
              setEditing(null);
              setForm({ date: `${month}-01`, donorId: null, amount: '' });
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
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <Box sx={{ flexBasis: '100%', height: 0 }} />
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Zeffy CSV
          </Button>
          <TextField
            label="Month"
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Stack>

        {table}

        <Dialog
          open={recordOpen}
          onClose={() => {
            setRecordOpen(false);
            setEditing(null);
          }}
        >
          <DialogCloseButton
            onClose={() => {
              setRecordOpen(false);
              setEditing(null);
            }}
          />
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

        <Dialog
          open={deleteOpen}
          onClose={() => {
            setDeleteOpen(false);
            setToDelete(null);
          }}
        >
          <DialogCloseButton
            onClose={() => {
              setDeleteOpen(false);
              setToDelete(null);
            }}
          />
          <DialogTitle>Delete Donation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this donation?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteDonation} autoFocus>
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
            <Button
              onClick={handleAddDonor}
              disabled={!donorForm.firstName || !donorForm.lastName}
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

