import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  TextField,
  IconButton,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import StyledTabs from '../../components/StyledTabs';
import DialogCloseButton from '../../components/DialogCloseButton';
import {
  getPigPounds,
  createPigPound,
  updatePigPound,
  deletePigPound,
  type PigPound,
} from '../../api/pigPounds';
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

export default function TrackPigpound() {
  const [entries, setEntries] = useState<PigPound[]>([]);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(toDate());
    const today = toDate();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const weekDates = useMemo(() => {
    const start = startOfWeek(toDate());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);
  const selectedDate = weekDates[tab];
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<PigPound | null>(null);
  const [form, setForm] = useState<{ date: string; weight: string }>({
    date: formatDate(),
    weight: '',
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PigPound | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const fetchId = useRef(0);

  useEffect(() => {
    load(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  function load(date: Date) {
    const id = ++fetchId.current;
    const dateStr = format(date);
    getPigPounds(dateStr)
      .then(data => {
        if (fetchId.current === id) setEntries(data);
      })
      .catch(() => {
        if (fetchId.current === id) setEntries([]);
      });
  }

  function handleSave() {
    if (!form.date || !form.weight) return;
    const action = editing
      ? updatePigPound(editing.id, { date: form.date, weight: Number(form.weight) })
      : createPigPound({ date: form.date, weight: Number(form.weight) });
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({ date: format(selectedDate), weight: '' });
        load(selectedDate);
        setSnackbar({ open: true, message: editing ? 'Entry updated' : 'Entry recorded' });
      })
      .catch(err =>
        setSnackbar({ open: true, message: err.message || 'Failed to save entry' }),
      );
  }

  const table = (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Weight (lbs)</TableCell>
            <TableCell align="right"></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center">
                No records
              </TableCell>
            </TableRow>
          ) : (
            entries.map(e => (
              <TableRow key={e.id}>
                <TableCell>
                  {formatLocaleDate(e.date)}
                </TableCell>
                <TableCell>{e.weight} lbs</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditing(e);
                      setForm({ date: formatDate(e.date), weight: String(e.weight) });
                      setRecordOpen(true);
                    }}
                    aria-label="Edit entry"
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setToDelete(e);
                      setDeleteOpen(true);
                    }}
                    aria-label="Delete entry"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
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
      title="Track Pigpound"
      header={
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            setForm({ date: format(selectedDate), weight: '' });
            setEditing(null);
            setRecordOpen(true);
          }}
        >
          Record Pig Pound Donation
        </Button>
      }
    >
      <StyledTabs tabs={tabs} value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }} />

        <Dialog
          open={recordOpen}
          onClose={() => {
            setRecordOpen(false);
            setEditing(null);
          }}
        >
          <DialogCloseButton onClose={() => {
            setRecordOpen(false);
            setEditing(null);
          }} />
          <DialogTitle>{editing ? 'Edit Entry' : 'Record Entry'}</DialogTitle>
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
          </Stack>
        </DialogContent>
          <DialogActions>
            <Button onClick={handleSave} disabled={!form.date || !form.weight}>
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
          <DialogCloseButton onClose={() => {
            setDeleteOpen(false);
            setToDelete(null);
          }} />
          <DialogTitle>Delete Entry</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this entry?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                if (toDelete) {
                  deletePigPound(toDelete.id)
                    .then(() => {
                      setSnackbar({ open: true, message: 'Entry deleted' });
                      setDeleteOpen(false);
                      setToDelete(null);
                      load();
                    })
                    .catch(err =>
                      setSnackbar({
                        open: true,
                        message: err.message || 'Failed to delete entry',
                      }),
                    );
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
