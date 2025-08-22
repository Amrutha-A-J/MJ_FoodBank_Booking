import { useState, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Autocomplete,
} from '@mui/material';
import Page from '../components/Page';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { getDonors } from '../data/donors';

interface Donation {
  date: string; // YYYY-MM-DD
  donor: string;
  weight: number;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function format(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function DonationLog() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<string[]>(getDonors());
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(new Date());
    const today = new Date();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const [recordOpen, setRecordOpen] = useState(false);
  const [newDonorOpen, setNewDonorOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  const [form, setForm] = useState({
    date: format(new Date()),
    donor: '',
    weight: '',
  });
  const [donorName, setDonorName] = useState('');

  const selectedDate = weekDates[tab];
  const dayDonations = donations.filter(d => d.date === format(selectedDate));

  function handleAddDonation() {
    setDonations([...donations, { date: form.date, donor: form.donor, weight: Number(form.weight) }]);
    setRecordOpen(false);
    setForm({ date: format(new Date()), donor: '', weight: '' });
    setSnackbar({ open: true, message: 'Donation recorded' });
  }

  function handleAddDonor() {
    if (donorName && !donors.includes(donorName)) {
      setDonors([...donors, donorName].sort());
      setSnackbar({ open: true, message: 'Donor added' });
    }
    setDonorName('');
    setNewDonorOpen(false);
  }

  return (
    <Page
      title="Donation Log"
      header={
        <Stack direction="row" spacing={1} mb={2}>
          <Button size="small" variant="contained" onClick={() => setRecordOpen(true)}>
            Record Donation
          </Button>
          <Button size="small" variant="outlined" onClick={() => setNewDonorOpen(true)}>
            Add Donor
          </Button>
        </Stack>
      }
    >
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        {weekDates.map((d, i) => (
          <Tab key={i} label={d.toLocaleDateString(undefined, { weekday: 'short' })} />
        ))}
      </Tabs>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Donor</TableCell>
            <TableCell>Weight</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dayDonations.map((d, i) => (
            <TableRow key={i}>
              <TableCell>{d.donor}</TableCell>
              <TableCell>{d.weight}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={recordOpen} onClose={() => setRecordOpen(false)}>
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
              label="Weight"
              type="number"
              value={form.weight}
              onChange={e => setForm({ ...form, weight: e.target.value })}
            />
            <Autocomplete
              options={donors}
              value={form.donor}
              onChange={(_e, v) => setForm({ ...form, donor: v || '' })}
              renderInput={params => <TextField {...params} label="Donor" />}
              freeSolo={false}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordOpen(false)}>Cancel</Button>
          <Button onClick={handleAddDonation} disabled={!form.donor || !form.weight}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newDonorOpen} onClose={() => setNewDonorOpen(false)}>
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
          <Button onClick={() => setNewDonorOpen(false)}>Cancel</Button>
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
