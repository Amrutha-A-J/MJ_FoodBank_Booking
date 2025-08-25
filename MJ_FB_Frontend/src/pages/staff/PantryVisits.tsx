import { useState, useMemo, useEffect } from 'react';
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
  TableContainer,
  Stack,
  IconButton,
  FormControlLabel,
  Checkbox,
  Typography,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  getClientVisits,
  createClientVisit,
  updateClientVisit,
  deleteClientVisit,
  type ClientVisit,
} from '../../api/clientVisits';
import { addUser, getUserByClientId } from '../../api/users';
import type { AlertColor } from '@mui/material';

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

export default function PantryVisits({ token }: { token: string }) {
  const [visits, setVisits] = useState<ClientVisit[]>([]);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(new Date());
    const today = new Date();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<ClientVisit | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ClientVisit | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor } | null>(null);

  const [cartTare, setCartTare] = useState(27);

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  const selectedDate = weekDates[tab];

  const [form, setForm] = useState({
    date: format(new Date()),
    anonymous: false,
    clientId: '',
    weightWithCart: '',
    weightWithoutCart: '',
    petItem: '0',
  });
  const [autoWeight, setAutoWeight] = useState(true);
  const [clientFound, setClientFound] = useState<boolean | null>(null);

  function loadVisits() {
    getClientVisits(format(selectedDate))
      .then(setVisits)
      .catch(() => setVisits([]));
  }

  useEffect(() => {
    loadVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    if (recordOpen && autoWeight) {
      setForm(f => ({
        ...f,
        weightWithoutCart: f.weightWithCart ? String(Number(f.weightWithCart) - cartTare) : '',
      }));
    }
  }, [form.weightWithCart, cartTare, autoWeight, recordOpen]);

  useEffect(() => {
    if (form.anonymous || !form.clientId) {
      setClientFound(null);
      return;
    }
    getUserByClientId(token, form.clientId)
      .then(() => setClientFound(true))
      .catch(() => setClientFound(false));
  }, [form.clientId, form.anonymous, token]);

  function handleSaveVisit() {
    if (!form.date || !form.weightWithCart || !form.weightWithoutCart) {
      setSnackbar({ open: true, message: 'Date and weights required', severity: 'error' });
      return;
    }
    if (!form.anonymous && !form.clientId) {
      setSnackbar({ open: true, message: 'Client ID required', severity: 'error' });
      return;
    }
    const payload = {
      date: form.date,
      clientId: form.anonymous ? undefined : Number(form.clientId),
      weightWithCart: Number(form.weightWithCart),
      weightWithoutCart: Number(form.weightWithoutCart),
      petItem: Number(form.petItem || 0),
    };
    const action = editing
      ? updateClientVisit(editing.id, payload)
      : createClientVisit(payload);
    action
      .then(() => {
        setRecordOpen(false);
        setEditing(null);
        setForm({
          date: format(selectedDate),
          anonymous: false,
          clientId: '',
          weightWithCart: '',
          weightWithoutCart: '',
          petItem: '0',
        });
        setAutoWeight(true);
        loadVisits();
        setSnackbar({ open: true, message: editing ? 'Visit updated' : 'Visit recorded', severity: 'success' });
      })
      .catch(err => setSnackbar({ open: true, message: err.message || 'Failed to save visit', severity: 'error' }));
  }

  async function handleCreateClient() {
    if (!form.clientId) return;
    try {
      await addUser(token, '', '', form.clientId, 'shopper', undefined, false);
      setClientFound(true);
      setSnackbar({ open: true, message: 'Client created', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to create client', severity: 'error' });
    }
  }

  return (
    <Page
      title="Pantry Visits"
      header={
        <Stack direction="row" spacing={1} mb={2}>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setForm({
                date: format(selectedDate),
                anonymous: false,
                clientId: '',
                weightWithCart: '',
                weightWithoutCart: '',
                petItem: '0',
              });
              setAutoWeight(true);
              setEditing(null);
              setRecordOpen(true);
            }}
          >
            Record Visit
          </Button>
          <TextField
            label="Cart Tare (lbs)"
            type="number"
            size="small"
            value={cartTare}
            onChange={e => setCartTare(Number(e.target.value) || 0)}
            sx={{ width: 140 }}
          />
        </Stack>
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
              <TableCell>Client ID</TableCell>
              <TableCell>Client Name</TableCell>
              <TableCell>Profile</TableCell>
              <TableCell>Weight With Cart</TableCell>
              <TableCell>Weight Without Cart</TableCell>
              <TableCell>Pet Item</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visits.map(v => (
              <TableRow key={v.id}>
                <TableCell>{v.date}</TableCell>
                <TableCell>{v.clientId ?? 'N/A'}</TableCell>
                <TableCell>{v.clientName ?? ''}</TableCell>
                <TableCell>
                  {v.clientId ? (
                    <a
                      href={`https://portal.link2feed.ca/org/1605/intake/${v.clientId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Link
                    </a>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>{v.weightWithCart}</TableCell>
                <TableCell>{v.weightWithoutCart}</TableCell>
                <TableCell>{v.petItem}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditing(v);
                      setForm({
                        date: v.date,
                        anonymous: !v.clientId,
                        clientId: v.clientId ? String(v.clientId) : '',
                        weightWithCart: String(v.weightWithCart),
                        weightWithoutCart: String(v.weightWithoutCart),
                        petItem: String(v.petItem),
                      });
                      setAutoWeight(true);
                      setRecordOpen(true);
                    }}
                    aria-label="Edit visit"
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setToDelete(v);
                      setDeleteOpen(true);
                    }}
                    aria-label="Delete visit"
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
        <DialogTitle>{editing ? 'Edit Visit' : 'Record Visit'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Date"
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControlLabel
              control={<Checkbox checked={form.anonymous} onChange={e => setForm({ ...form, anonymous: e.target.checked })} />}
              label="Anonymous"
            />
            {!form.anonymous && (
              <>
                <TextField
                  label="Client ID"
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                />
                {clientFound === false && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="error" sx={{ flexGrow: 1 }}>
                      Client not present in database
                    </Typography>
                    <Button size="small" variant="outlined" onClick={handleCreateClient}>
                      Create
                    </Button>
                  </Stack>
                )}
              </>
            )}
            <TextField
              label="Weight With Cart"
              type="number"
              value={form.weightWithCart}
              onChange={e => {
                setForm({ ...form, weightWithCart: e.target.value });
                setAutoWeight(true);
              }}
            />
            <TextField
              label="Weight Without Cart"
              type="number"
              value={form.weightWithoutCart}
              onChange={e => {
                setForm({ ...form, weightWithoutCart: e.target.value });
                setAutoWeight(false);
              }}
            />
            <TextField
              label="Pet Item"
              type="number"
              value={form.petItem}
              onChange={e => setForm({ ...form, petItem: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRecordOpen(false); setEditing(null); }}>Cancel</Button>
          <Button onClick={handleSaveVisit} disabled={!form.weightWithCart || !form.weightWithoutCart || (!form.anonymous && !form.clientId)}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setToDelete(null); }}>
        <DialogTitle>Delete Visit</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this visit?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteOpen(false); setToDelete(null); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (toDelete) {
                deleteClientVisit(toDelete.id)
                  .then(() => {
                    setSnackbar({ open: true, message: 'Visit deleted', severity: 'success' });
                    setDeleteOpen(false);
                    setToDelete(null);
                    loadVisits();
                  })
                  .catch(err => setSnackbar({ open: true, message: err.message || 'Failed to delete visit', severity: 'error' }));
              }
            }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </Page>
  );
}
