import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import Page from '../components/Page';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import {
  getSurplus,
  createSurplus,
  updateSurplus,
  deleteSurplus,
  type Surplus,
} from '../api/surplus';

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

function normalize(date: string) {
  return date.split('T')[0];
}

const BREAD_MULTIPLIER = Number(import.meta.env.VITE_BREAD_WEIGHT_MULTIPLIER) || 10;
const CANS_MULTIPLIER = Number(import.meta.env.VITE_CANS_WEIGHT_MULTIPLIER) || 20;

export default function TrackSurplus() {
  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(new Date());
    const today = new Date();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const selectedDate = weekDates[tab];

  const [records, setRecords] = useState<Surplus[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<Surplus | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Surplus | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const [form, setForm] = useState<{ date: string; type: 'BREAD' | 'CANS'; count: string }>({
    date: format(selectedDate),
    type: 'BREAD',
    count: '',
  });

  const weight = useMemo(() => {
    const count = Number(form.count) || 0;
    return form.type === 'BREAD' ? count * BREAD_MULTIPLIER : count * CANS_MULTIPLIER;
  }, [form]);

  function load() {
    getSurplus()
      .then(data => setRecords(data))
      .catch(() => setRecords([]));
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRecords = useMemo(() => {
    const dateStr = format(selectedDate);
    return records.filter(r => normalize(r.date) === dateStr);
  }, [records, selectedDate]);

  function handleSave() {
    if (!form.date || !form.count) return;
    const data = { date: form.date, type: form.type, count: Number(form.count) };
    const action = editing ? updateSurplus(editing.id, data) : createSurplus(data);
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({ date: format(selectedDate), type: 'BREAD', count: '' });
        load();
        setSnackbar({ open: true, message: editing ? 'Surplus updated' : 'Surplus recorded' });
      })
      .catch(err => setSnackbar({ open: true, message: err.message || 'Failed to save surplus' }));
  }

  return (
    <Page
      title="Track Surplus"
      header={
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            setForm({ date: format(selectedDate), type: 'BREAD', count: '' });
            setEditing(null);
            setRecordOpen(true);
          }}
        >
          Record Surplus
        </Button>
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
            <TableCell>Type</TableCell>
            <TableCell>Count</TableCell>
            <TableCell>Weight (lbs)</TableCell>
            <TableCell align="right"></TableCell>
          </TableRow>
          </TableHead>
          <TableBody>
          {filteredRecords.map(r => (
            <TableRow key={r.id}>
              <TableCell>
                {new Date(r.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell>{r.type}</TableCell>
              <TableCell>{r.count}</TableCell>
              <TableCell>{r.weight} lbs</TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditing(r);
                    setForm({ date: normalize(r.date), type: r.type, count: String(r.count) });
                    setRecordOpen(true);
                  }}
                  aria-label="Edit surplus"
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    setToDelete(r);
                    setDeleteOpen(true);
                  }}
                  aria-label="Delete surplus"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={recordOpen} onClose={() => { setRecordOpen(false); setEditing(null); }}>
        <DialogTitle>{editing ? 'Edit Surplus' : 'Record Surplus'}</DialogTitle>
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
              select
              label="Type"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as 'BREAD' | 'CANS' })}
            >
              <MenuItem value="BREAD">BREAD</MenuItem>
              <MenuItem value="CANS">CANS</MenuItem>
            </TextField>
            <TextField
              label="Count"
              type="number"
              value={form.count}
              onChange={e => setForm({ ...form, count: e.target.value })}
            />
            <TextField label="Weight (lbs)" type="number" value={weight} InputProps={{ readOnly: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRecordOpen(false); setEditing(null); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.date || !form.count}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setToDelete(null); }}>
        <DialogTitle>Delete Surplus</DialogTitle>
        <DialogContent>Are you sure you want to delete this surplus record?</DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteOpen(false); setToDelete(null); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (toDelete) {
                deleteSurplus(toDelete.id)
                  .then(() => {
                    setSnackbar({ open: true, message: 'Surplus deleted' });
                    setDeleteOpen(false);
                    setToDelete(null);
                    load();
                  })
                  .catch(err => setSnackbar({ open: true, message: err.message || 'Failed to delete surplus' }));
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
