import { useEffect, useMemo, useState } from 'react';
import {
  Button,
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
import WarehouseQuickLinks from '../../components/WarehouseQuickLinks';
import StyledTabs from '../../components/StyledTabs';
import DialogCloseButton from '../../components/DialogCloseButton';
import FormDialog from '../../components/FormDialog';
import useSnackbar from '../../hooks/useSnackbar';
import {
  getSurplus,
  createSurplus,
  updateSurplus,
  deleteSurplus,
  type Surplus,
} from '../../api/surplus';
import { formatLocaleDate, formatDate, normalizeDate } from '../../utils/date';
import useWarehouseSettings from '../../hooks/useWarehouseSettings';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import { useWeekTabs } from '../../components/useWeekTabs';

export default function TrackSurplus() {
  const { tab, setTab, selectedDate, getTabs } = useWeekTabs();

  const [records, setRecords] = useState<Surplus[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<Surplus | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Surplus | null>(null);
  const { open, message, showSnackbar, closeSnackbar, severity } = useSnackbar();
  const { settings } = useWarehouseSettings();
  const config = settings ?? {
    breadWeightMultiplier: 10,
    cansWeightMultiplier: 20,
  };

  const [form, setForm] = useState<{ date: string; type: 'BREAD' | 'CANS'; count: string }>({
    date: formatDate(selectedDate),
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
  }, []);

  const filteredRecords = useMemo(() => {
    const dateStr = formatDate(selectedDate);
    return records.filter(r => normalizeDate(r.date) === dateStr);
  }, [records, selectedDate]);

  function handleSave() {
    if (!form.date || !form.count) return;
    const data = { date: form.date, type: form.type, count: Number(form.count) };
    const action = editing ? updateSurplus(editing.id, data) : createSurplus(data);
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({ date: formatDate(selectedDate), type: 'BREAD', count: '' });
        load();
        showSnackbar(editing ? 'Surplus updated' : 'Surplus recorded');
      })
      .catch(err => showSnackbar(err.message || 'Failed to save surplus', 'error'));
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
            
            onClick={() => {
              setEditing(r);
              setForm({ date: normalizeDate(r.date), type: r.type, count: String(r.count) });
              setRecordOpen(true);
            }}
            aria-label="Edit surplus"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            
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

  const tabs = getTabs(() => table);

  return (
    <>
      <WarehouseQuickLinks />
      <Page title="Track Surplus">
        <Button
          
          variant="contained"
          onClick={() => {
            setForm({ date: formatDate(selectedDate), type: 'BREAD', count: '' });
            setEditing(null);
            setRecordOpen(true);
          }}
          sx={{ mb: 2 }}
        >
          Record Surplus
        </Button>
        <StyledTabs tabs={tabs} value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }} />

      <FormDialog
        open={recordOpen}
        onClose={() => {
          setRecordOpen(false);
          setEditing(null);
        }}
      >
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
        <DialogTitle>Delete Surplus</DialogTitle>
        <DialogContent>Are you sure you want to delete this surplus record?</DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (toDelete) {
                deleteSurplus(toDelete.id)
                  .then(() => {
                    showSnackbar('Surplus deleted');
                    setDeleteOpen(false);
                    setToDelete(null);
                    load();
                  })
                  .catch(err =>
                    showSnackbar(
                      err.message || 'Failed to delete surplus',
                      'error',
                    ),
                  );
              }
            }}
            autoFocus
          >
            Delete
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
