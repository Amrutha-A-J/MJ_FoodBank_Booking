import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  TableContainer,
  Stack,
  Autocomplete,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import WarehouseQuickLinks from '../../components/WarehouseQuickLinks';
import DialogCloseButton from '../../components/DialogCloseButton';
import FormDialog from '../../components/FormDialog';
import useSnackbar from '../../hooks/useSnackbar';
import { getDonors, createDonor } from '../../api/donors';
import {
  getDonationsByMonth,
  createDonation,
  updateDonation,
  deleteDonation,
} from '../../api/donations';
import type { Donor } from '../../api/donors';
import type { Donation } from '../../api/donations';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import { formatLocaleDate } from '../../utils/date';

function formatMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

type DonorForDisplay = {
  id?: number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

function formatDonorDisplay(
  donor: DonorForDisplay | null | undefined,
  fallbackId?: number | null,
) {
  const id = donor?.id ?? fallbackId ?? undefined;
  const email = donor?.email?.trim();
  const phone = donor?.phone?.trim();
  const name = donor?.name?.trim() ?? '';

  const base = name
    ? id
      ? `${name} (ID: ${id})`
      : name
    : id
      ? `Unknown donor (ID: ${id})`
      : 'Unknown donor';

  const contact = [email, phone]
    .filter((value): value is string => Boolean(value))
    .join(' • ');

  return contact ? `${base} • ${contact}` : base;
}

export default function DonationLog() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donorOptions, setDonorOptions] = useState<Donor[]>([]);
  const [donorSearch, setDonorSearch] = useState('');
  const [month, setMonth] = useState(formatMonth());
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<Donation | null>(null);
  const [newDonorOpen, setNewDonorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Donation | null>(null);
  const { open, message, showSnackbar, closeSnackbar, severity } = useSnackbar();

  const [form, setForm] = useState<{
    date: string;
    donorId: number | null;
    weight: string;
  }>({
    date: `${month}-01`,
    donorId: null,
    weight: '',
  });
  const [newDonor, setNewDonor] = useState({
    name: '',
    email: '',
    phone: '',
    isPetFood: false,
  });

  type DonationRow = Donation & { actions?: string };

  const columns: Column<DonationRow>[] = [
    {
      field: 'date',
      header: 'Date',
      render: d => formatLocaleDate(d.date),
    },
    {
      field: 'donor' as keyof DonationRow & string,
      header: 'Donor',
      render: d => formatDonorDisplay(d.donor, d.donorId),
    },
    {
      field: 'weight',
      header: 'Weight (lbs)',
      render: d => `${d.weight} lbs`,
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
              setForm({ date: d.date, donorId: d.donorId, weight: String(d.weight) });
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
    let active = true;
    getDonors(donorSearch)
      .then(d => {
        if (active)
          setDonorOptions(
            d.sort((a, b) => a.name.localeCompare(b.name)),
          );
      })
      .catch(() => {
        if (active) setDonorOptions([]);
      });
    return () => {
      active = false;
    };
  }, [donorSearch]);

  const loadDonations = useCallback(() => {
    getDonationsByMonth(month)
      .then(setDonations)
      .catch(() => setDonations([]));
  }, [month]);

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
        setForm({ date: `${month}-01`, donorId: null, weight: '' });
        loadDonations();
        showSnackbar(editing ? 'Donation updated' : 'Donation recorded');
      })
      .catch(err =>
        showSnackbar(err.message || 'Failed to save donation', 'error'),
      );
  }

  function handleAddDonor() {
    const name = newDonor.name.trim();
    const email = newDonor.email.trim();
    const phone = newDonor.phone.trim();
    const isPetFood = newDonor.isPetFood;
    if (name) {
      createDonor({
        name,
        email: email || null,
        phone: phone || null,
        isPetFood,
      })
        .then(d => {
          setDonorOptions(prev =>
            [...prev, d].sort((a, b) => a.name.localeCompare(b.name)),
          );
          showSnackbar('Donor added');
        })
        .catch(err => {
          showSnackbar(err.message || 'Failed to add donor', 'error');
        });
    }
    setNewDonor({ name: '', email: '', phone: '', isPetFood: false });
    setNewDonorOpen(false);
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

  return (
    <>
      <WarehouseQuickLinks />
      <Page title="Donation Log">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          rowGap={1}
          columnGap={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ mb: 2 }}
        >
          <Button
            variant="contained"
            onClick={e => {
              (e.currentTarget as HTMLButtonElement).blur();
              setForm({ date: `${month}-01`, donorId: null, weight: '' });
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
          <TextField
            label="Month"
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 220 } }}
          />
        </Stack>

        {table}

      <FormDialog
        open={recordOpen}
        onClose={() => {
          setRecordOpen(false);
          setEditing(null);
        }}
      >
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
              options={donorOptions}
              value={donorOptions.find(d => d.id === form.donorId) || null}
              onInputChange={(_event, value, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  setDonorSearch(value);
                }
              }}
              onChange={(_e, v) => setForm({ ...form, donorId: v ? v.id : null })}
              renderInput={params => (
                <TextField {...params} label="Donor (search by name or ID)" />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={o => formatDonorDisplay(o)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveDonation} disabled={!form.donorId || !form.weight}>
            Save
          </Button>
        </DialogActions>
      </FormDialog>

      <FormDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setToDelete(null);
        }}
        maxWidth="xs"
      >
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
                    showSnackbar('Donation deleted');
                    setDeleteOpen(false);
                    setToDelete(null);
                    loadDonations();
                  })
                  .catch(err => {
                    showSnackbar(
                      err.message || 'Failed to delete donation',
                      'error',
                    );
                  });
              }
            }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </FormDialog>

      <FormDialog open={newDonorOpen} onClose={() => setNewDonorOpen(false)}>
        <DialogCloseButton onClose={() => setNewDonorOpen(false)} />
        <DialogTitle>Add Donor</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Name"
              value={newDonor.name}
              onChange={e => setNewDonor({ ...newDonor, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={newDonor.email}
              onChange={e => setNewDonor({ ...newDonor, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Phone"
              type="tel"
              value={newDonor.phone}
              onChange={e => setNewDonor({ ...newDonor, phone: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newDonor.isPetFood}
                  onChange={e => setNewDonor({ ...newDonor, isPetFood: e.target.checked })}
                />
              }
              label="Pet food donor"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleAddDonor}
            disabled={!newDonor.name.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </FormDialog>

      <FeedbackSnackbar
        open={open}
        onClose={closeSnackbar}
        message={message}
        severity={severity}
      />
    </Page>
  </>
  );
}
