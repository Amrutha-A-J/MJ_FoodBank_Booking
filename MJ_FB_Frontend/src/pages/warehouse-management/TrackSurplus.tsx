import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TableContainer,
  TextField,
  MenuItem,
  IconButton,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import StyledTabs from '../../components/StyledTabs';
import DialogCloseButton from '../../components/DialogCloseButton';
import {
  getSurplus,
  createSurplus,
  updateSurplus,
  deleteSurplus,
  type Surplus,
} from '../../api/surplus';
import { formatLocaleDate, toDate, formatDate, addDays } from '../../utils/date';
import {
  getWarehouseSettings,
  type WarehouseSettings,
} from '../../api/warehouseSettings';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';

function startOfWeek(date: Date) {
  const d = toDate(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
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

export default function TrackSurplus() {
  const weekDates = useMemo(() => {
    const start = startOfWeek(toDate());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(toDate());
    const today = toDate();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const selectedDate = weekDates[tab];

  const [records, setRecords] = useState<Surplus[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<Surplus | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Surplus | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [config, setConfig] = useState<WarehouseSettings>({
    breadWeightMultiplier: 10,
    cansWeightMultiplier: 20,
  });

  const [form, setForm] = useState<{ date: string; type: 'BREAD' | 'CANS'; count: string }>({
    date: format(selectedDate),
    type: 'BREAD',
    count: '',
  });

  const weight = useMemo(() => {
    const count = Number(form.count) || 0;
    return form.type === 'BREAD'
      ? count * config.breadWeightMultiplier
      : count * config.cansWeightMultiplier;
  }, [form, config]);

  function load() {
    getSurplus()
      .then(data => setRecords(data))
      .catch(() => setRecords([]));
  }

  useEffect(() => {
    load();
    getWarehouseSettings()
      .then(cfg => setConfig(cfg))
      .catch(() => {});
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

  type SurplusRow = Surplus & { actions?: string };

  const columns: Column<SurplusRow>[] = [
    {
      field: 'date',
      header: 'Date',
      render: r =>
        formatLocaleDate(r.date, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    { field: 'type', header: 'Type' },
    { field: 'count', header: 'Count' },
    {
      field: 'weight',
      header: 'Weight (lbs)',
      render: r => `${r.weight} lbs`,
    },
    {
      field: 'actions' as keyof SurplusRow & string,
      header: 'Actions',
      render: r => (
        <>
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
        </>
      ),
    },
  ];

  const table = (
    <TableContainer sx={{ overflowX: 'auto' }}>
      {filteredRecords.length ? (
        <ResponsiveTable columns={columns} rows={filteredRecords} getRowKey={r => r.id} />
      ) : (
        <Stack alignItems="center" py={2}>
          No records
        </Stack>
      )}
    </TableContainer>
  );

  const tabs = weekDates.map(d => ({
    label: formatLocaleDate(d, { weekday: 'short' }),
    content: table,
  }));

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
      <StyledTabs tabs={tabs} value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }} />

      <Dialog open={recordOpen} onClose={() => { setRecordOpen(false); setEditing(null); }}>
        <DialogCloseButton onClose={() => { setRecordOpen(false); setEditing(null); }} />
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
          <Button onClick={handleSave} disabled={!form.date || !form.count}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setToDelete(null); }}>
        <DialogCloseButton onClose={() => { setDeleteOpen(false); setToDelete(null); }} />
        <DialogTitle>Delete Surplus</DialogTitle>
        <DialogContent>Are you sure you want to delete this surplus record?</DialogContent>
        <DialogActions>
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
