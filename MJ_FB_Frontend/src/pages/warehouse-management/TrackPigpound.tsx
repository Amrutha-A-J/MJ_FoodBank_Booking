import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TableContainer,
  Stack,
  TextField,
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
  getPigPounds,
  createPigPound,
  updatePigPound,
  deletePigPound,
  type PigPound,
} from '../../api/pigPounds';
import { formatLocaleDate, formatDate } from '../../utils/date';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import { useWeekTabs } from '../../components/useWeekTabs';

export default function TrackPigpound() {
  const [entries, setEntries] = useState<PigPound[]>([]);
  const { tab, setTab, selectedDate, getTabs } = useWeekTabs();
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<PigPound | null>(null);
  const [form, setForm] = useState<{ date: string; weight: string }>({
    date: formatDate(),
    weight: '',
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PigPound | null>(null);
  const { open, message, showSnackbar, closeSnackbar, severity } = useSnackbar();

  const fetchId = useRef(0);

  const load = useCallback((date: Date) => {
    const id = ++fetchId.current;
    const dateStr = formatDate(date);
    getPigPounds(dateStr)
      .then(data => {
        if (fetchId.current === id) setEntries(data);
      })
      .catch(() => {
        if (fetchId.current === id) setEntries([]);
      });
  }, []);

  useEffect(() => {
    load(selectedDate);
  }, [selectedDate, load]);

  function handleSave() {
    if (!form.date || !form.weight) return;
    const action = editing
      ? updatePigPound(editing.id, { date: form.date, weight: Number(form.weight) })
      : createPigPound({ date: form.date, weight: Number(form.weight) });
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({ date: formatDate(selectedDate), weight: '' });
        load(selectedDate);
        showSnackbar(editing ? 'Entry updated' : 'Entry recorded');
      })
      .catch(err =>
        showSnackbar(err.message || 'Failed to save entry', 'error'),
      );
  }

  type PigPoundRow = PigPound & { actions?: string };

  const columns: Column<PigPoundRow>[] = [
    { field: 'date', header: 'Date', render: e => formatLocaleDate(e.date) },
    {
      field: 'weight',
      header: 'Weight (lbs)',
      render: e => `${e.weight} lbs`,
    },
    {
      field: 'actions' as keyof PigPoundRow & string,
      header: 'Actions',
      render: e => (
        <>
          <IconButton
            
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
            
            onClick={() => {
              setToDelete(e);
              setDeleteOpen(true);
            }}
            aria-label="Delete entry"
          >
            <Delete fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  const table = (
    <TableContainer sx={{ overflowX: 'auto' }}>
      {entries.length === 0 ? (
        <Stack alignItems="center" py={2}>
          No records
        </Stack>
      ) : (
        <ResponsiveTable columns={columns} rows={entries} getRowKey={r => r.id} />
      )}
    </TableContainer>
  );

  const tabs = getTabs(() => table);

  return (
    <>
      <WarehouseQuickLinks />
      <Page title="Track Pigpound">
        <Button
          
          variant="contained"
          onClick={() => {
            setForm({ date: formatDate(selectedDate), weight: '' });
            setEditing(null);
            setRecordOpen(true);
          }}
          sx={{ mb: 2 }}
        >
          Record Pig Pound Donation
        </Button>
        <StyledTabs tabs={tabs} value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }} />

        <FormDialog
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
        </FormDialog>

        <FormDialog
          open={deleteOpen}
          onClose={() => {
            setDeleteOpen(false);
            setToDelete(null);
          }}
          maxWidth="xs"
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
                      showSnackbar('Entry deleted');
                      setDeleteOpen(false);
                      setToDelete(null);
                      load(selectedDate);
                    })
                    .catch(err =>
                      showSnackbar(
                        err.message || 'Failed to delete entry',
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
