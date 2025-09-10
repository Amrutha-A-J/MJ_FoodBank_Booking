import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  Stack,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery } from '@tanstack/react-query';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DonorQuickLinks from '../../components/DonorQuickLinks';
import {
  getMonetaryDonor,
  getMonetaryDonations,
  createMonetaryDonation,
  updateMonetaryDonation,
  deleteMonetaryDonation,
  type MonetaryDonation,
  type MonetaryDonorDetail,
} from '../../api/monetaryDonors';
import { formatDate, formatLocaleDate } from '../../utils/date';

export default function DonorProfile() {
  const { id } = useParams();
  const donorId = Number(id);

  const {
    data: donor,
    refetch: refetchDonor,
  } = useQuery<MonetaryDonorDetail>({
    queryKey: ['monetary-donor', donorId],
    queryFn: () => getMonetaryDonor(donorId),
    enabled: !Number.isNaN(donorId),
  });

  const {
    data: donations,
    refetch: refetchDonations,
  } = useQuery<MonetaryDonation[]>({
    queryKey: ['monetary-donations', donorId],
    queryFn: () => getMonetaryDonations(donorId),
    enabled: !Number.isNaN(donorId),
  });

  const currency = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ id?: number; amount: string; date: string }>(
    { amount: '', date: formatDate() },
  );
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  function openAdd() {
    setForm({ amount: '', date: formatDate() });
    setFormOpen(true);
  }

  function openEdit(d: MonetaryDonation) {
    setForm({ id: d.id, amount: String(d.amount), date: d.date });
    setFormOpen(true);
  }

  async function handleSave() {
    try {
      const base = { amount: Number(form.amount), date: form.date };
      if (form.id) {
        await updateMonetaryDonation(form.id, { ...base, donorId });
        setSnackbar({
          open: true,
          message: 'Donation updated',
          severity: 'success',
        });
      } else {
        await createMonetaryDonation(donorId, base);
        setSnackbar({
          open: true,
          message: 'Donation added',
          severity: 'success',
        });
      }
      setFormOpen(false);
      await Promise.all([refetchDonor(), refetchDonations()]);
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to save donation',
        severity: 'error',
      });
    }
  }

  async function handleDelete() {
    if (deleteId === null) return;
    try {
      await deleteMonetaryDonation(deleteId);
      setSnackbar({
        open: true,
        message: 'Donation deleted',
        severity: 'success',
      });
      setDeleteId(null);
      await Promise.all([refetchDonor(), refetchDonations()]);
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to delete donation',
        severity: 'error',
      });
    }
  }

  return (
    <>
      <DonorQuickLinks />
      <Page title="Donor Profile">
        <Stack spacing={2}>
        {donor && (
          <Stack spacing={0.5}>
            <Typography variant="h5">
              {donor.firstName} {donor.lastName}
            </Typography>
            <Typography>{donor.email}</Typography>
            <Typography>
              Total Donated: {currency.format(donor.amount)}
            </Typography>
          </Stack>
        )}

        <Button variant="contained" onClick={openAdd} sx={{ alignSelf: 'flex-start' }}>
          Add Donation
        </Button>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {donations?.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{formatLocaleDate(d.date)}</TableCell>
                  <TableCell>{currency.format(d.amount)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label="edit"
                      onClick={() => openEdit(d)}
                    >
                      <EditIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="delete"
                      onClick={() => setDeleteId(d.id)}
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {donations && donations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>No donations yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
          <DialogTitle>{form.id ? 'Edit Donation' : 'Add Donation'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Amount"
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
          <DialogTitle>Delete Donation?</DialogTitle>
          <DialogActions>
            <Button onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDelete}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <FeedbackSnackbar
          open={snackbar.open}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          message={snackbar.message}
          severity={snackbar.severity}
        />
      </Stack>
    </Page>
    </>
  );
}
