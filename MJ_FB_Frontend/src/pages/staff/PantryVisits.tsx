import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  TableContainer,
  Stack,
  IconButton,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Checkbox,
  Alert,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import StyledTabs from '../../components/StyledTabs';
import DialogCloseButton from '../../components/DialogCloseButton';
import FormDialog from '../../components/FormDialog';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import ResponsiveTable from '../../components/ResponsiveTable';
import {
  getClientVisits,
  createClientVisit,
  updateClientVisit,
  deleteClientVisit,
  toggleClientVisitVerification,
  type ClientVisit,
} from '../../api/clientVisits';
import { getSunshineBag, saveSunshineBag } from '../../api/sunshineBags';
import { addUser, getUserByClientId } from '../../api/users';
import useAppConfig from '../../hooks/useAppConfig';
import type { AlertColor } from '@mui/material';
import { toDate, formatDate, formatLocaleDate, addDays, toDayjs } from '../../utils/date';

function startOfWeek(date: Date) {
  const d = toDayjs(date);
  const day = d.day();
  return d.subtract(day === 0 ? 6 : day - 1, 'day').startOf('day').toDate();
}

function format(date: Date) {
  return formatDate(date);
}

export default function PantryVisits() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramDate = searchParams.get('date');
  const initialDate = paramDate ? toDate(paramDate) : toDate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(initialDate));
  const [tab, setTab] = useState(() =>
    Math.floor((initialDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)),
  );
  const [lookupDate, setLookupDate] = useState(formatDate(initialDate));
  const [visits, setVisits] = useState<ClientVisit[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<ClientVisit | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ClientVisit | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor } | null>(null);
  const [saving, setSaving] = useState(false);

  const { appConfig } = useAppConfig();
  const cartTare = appConfig.cartTare;
  const [search, setSearch] = useState('');

  useEffect(() => {
    const d = paramDate ? toDate(paramDate) : toDate();
    const start = startOfWeek(d);
    setWeekStart(start);
    setTab(Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
    setLookupDate(formatDate(d));
  }, [paramDate]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const selectedDate = weekDates[tab];

  const [form, setForm] = useState({
    date: formatDate(initialDate),
    anonymous: false,
    sunshineBag: false,
    sunshineWeight: '',
    sunshineClients: '',
    clientId: '',
    weightWithCart: '',
    weightWithoutCart: '',
    adults: '',
    children: '',
    petItem: '0',
    note: '',
  });
  const [autoWeight, setAutoWeight] = useState(true);
  const [clientFound, setClientFound] = useState<boolean | null>(null);
  const [sunshineBagWeight, setSunshineBagWeight] = useState(0);
  const [sunshineBagClients, setSunshineBagClients] = useState(0);

  const filteredVisits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visits;
    return visits.filter(v => {
      const name = v.clientName?.toLowerCase() || '';
      const id = v.clientId ? String(v.clientId) : '';
      return name.includes(q) || id.includes(q);
    });
  }, [visits, search]);

  const loadVisits = useCallback(() => {
    getClientVisits(format(selectedDate))
      .then(setVisits)
      .catch(() => setVisits([]));
    getSunshineBag(format(selectedDate))
      .then(sb => {
        setSunshineBagWeight(sb?.weight ?? 0);
        setSunshineBagClients(sb?.clientCount ?? 0);
      })
      .catch(() => {
        setSunshineBagWeight(0);
        setSunshineBagClients(0);
      });
  }, [selectedDate]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    if (recordOpen && autoWeight && !form.sunshineBag) {
      setForm(f => ({
        ...f,
        weightWithoutCart: f.weightWithCart ? String(Number(f.weightWithCart) - cartTare) : '',
      }));
    }
  }, [form.weightWithCart, cartTare, autoWeight, recordOpen, form.sunshineBag]);

  useEffect(() => {
    if (form.sunshineBag) return;
    if (!form.clientId || form.clientId.length < 4) {
      setClientFound(null);
      return;
    }
    getUserByClientId(form.clientId)
      .then(() => setClientFound(true))
      .catch(() => setClientFound(false));
  }, [form.clientId, form.sunshineBag]);

  useEffect(() => {
    if (form.sunshineBag) {
      getSunshineBag(form.date)
        .then(sb =>
          setForm(f => ({
            ...f,
            sunshineWeight: sb?.weight ? String(sb.weight) : '',
            sunshineClients: sb?.clientCount
              ? String(sb.clientCount)
              : '',
          })),
        )
        .catch(() =>
          setForm(f => ({ ...f, sunshineWeight: '', sunshineClients: '' })),
        );
    }
  }, [form.sunshineBag, form.date]);

  const summary = useMemo(() => {
    const clients = visits.filter(v => !v.anonymous).length;
    const totalWeight =
      visits.reduce((sum, v) => sum + v.weightWithoutCart, 0) + sunshineBagWeight;
    const adults = visits.reduce((sum, v) => sum + (v.anonymous ? 0 : v.adults), 0);
    const children = visits.reduce(
      (sum, v) => sum + (v.anonymous ? 0 : v.children),
      0,
    );
    return { clients, totalWeight, adults, children };
  }, [visits, sunshineBagWeight]);

  function handleSaveVisit() {
    setSaving(true);
    if (form.sunshineBag) {
      if (!form.sunshineWeight || !form.sunshineClients) {
        setSnackbar({ open: true, message: 'Weight and clients required', severity: 'error' });
        setSaving(false);
        return;
      }
      saveSunshineBag({
        date: form.date,
        weight: Number(form.sunshineWeight),
        clientCount: Number(form.sunshineClients),
      })
        .then(() => {
          setRecordOpen(false);
          setEditing(null);
          setForm({
            date: format(selectedDate),
            anonymous: false,
            sunshineBag: false,
            sunshineWeight: '',
            sunshineClients: '',
            clientId: '',
            weightWithCart: '',
            weightWithoutCart: '',
            adults: '',
            children: '',
            petItem: '0',
            note: '',
          });
          setAutoWeight(true);
          loadVisits();
          setSnackbar({ open: true, message: 'Sunshine bag saved', severity: 'success' });
        })
        .catch(err =>
          setSnackbar({
            open: true,
            message: err.message || 'Failed to save sunshine bag',
            severity: 'error',
          }),
        )
        .finally(() => setSaving(false));
      return;
    }
    if (!form.date || !form.weightWithCart || !form.weightWithoutCart) {
      setSnackbar({ open: true, message: 'Date and weights required', severity: 'error' });
      setSaving(false);
      return;
    }
    if (!form.clientId) {
      setSnackbar({ open: true, message: 'Client ID required', severity: 'error' });
      setSaving(false);
      return;
    }
    const payload = {
      date: form.date,
      clientId: Number(form.clientId),
      anonymous: form.anonymous,
      weightWithCart: Number(form.weightWithCart),
      weightWithoutCart: Number(form.weightWithoutCart),
      adults: Number(form.adults || 0),
      children: Number(form.children || 0),
      petItem: Number(form.petItem || 0),
      note: form.note.trim() || undefined,
      verified: editing?.verified ?? false,
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
          sunshineBag: false,
          sunshineWeight: '',
          sunshineClients: '',
          clientId: '',
          weightWithCart: '',
          weightWithoutCart: '',
          adults: '',
          children: '',
          petItem: '0',
          note: '',
        });
        setAutoWeight(true);
        loadVisits();
        setSnackbar({ open: true, message: editing ? 'Visit updated' : 'Visit recorded', severity: 'success' });
      })
      .catch(err =>
        setSnackbar({ open: true, message: err.message || 'Failed to save visit', severity: 'error' }),
      )
      .finally(() => setSaving(false));
  }

  async function handleCreateClient() {
    if (!form.clientId) return;
    try {
      await addUser(form.clientId, 'shopper', false);
      setClientFound(true);
      setSnackbar({ open: true, message: 'Client created', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to create client', severity: 'error' });
    }
  }

  const columns: any[] = [
    {
      field: 'index',
      header: '#',
    },
    {
      field: 'clientId',
      header: 'Client ID',
      render: (v: ClientVisit & { index: number }) =>
        `${v.clientId ?? 'N/A'}${v.anonymous ? ' (ANONYMOUS)' : ''}`,
    },
    {
      field: 'clientName',
      header: 'Client Name',
      render: (v: ClientVisit & { index: number }) => v.clientName ?? '',
    },
    {
      field: 'profile',
      header: 'Profile',
      render: (v: ClientVisit & { index: number }) =>
        v.clientId ? (
          <a
            href={`https://portal.link2feed.ca/org/1605/intake/${v.clientId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Profile
          </a>
        ) : (
          'N/A'
        ),
    },
    { field: 'weightWithCart', header: 'Weight With Cart' },
    { field: 'weightWithoutCart', header: 'Weight Without Cart' },
    {
      field: 'adults',
      header: 'Adults',
      render: (v: ClientVisit & { index: number }) => v.adults,
    },
    {
      field: 'children',
      header: 'Children',
      render: (v: ClientVisit & { index: number }) => v.children,
    },
    {
      field: 'petItem',
      header: 'Pet Item',
      render: (v: ClientVisit & { index: number }) => v.petItem,
    },
    {
      field: 'note',
      header: 'Note',
      render: (v: ClientVisit & { index: number }) => v.note || '',
    },
    {
      field: 'verified',
      header: 'Verified',
      render: (v: ClientVisit & { index: number }) => (
        <Checkbox
          checked={v.verified}
          onChange={() => {
            toggleClientVisitVerification(v.id)
              .then(u =>
                setVisits(prev =>
                  prev.map(vis => (vis.id === u.id ? u : vis)),
                ),
              )
              .catch(() =>
                setSnackbar({
                  open: true,
                  message: 'Error updating verification',
                  severity: 'error',
                }),
              );
          }}
          inputProps={{ 'aria-label': 'Verify visit' }}
        />
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      render: (v: ClientVisit & { index: number }) =>
        !v.verified && (
          <Stack direction="row" spacing={1}>
            <IconButton

              onClick={() => {
                setEditing(v);
              setForm({
                date: formatDate(v.date),
                anonymous: v.anonymous,
                sunshineBag: false,
                sunshineWeight: '',
                sunshineClients: '',
                clientId: v.clientId ? String(v.clientId) : '',
                weightWithCart: String(v.weightWithCart),
                weightWithoutCart: String(v.weightWithoutCart),
                adults: String(v.adults),
                children: String(v.children),
                petItem: String(v.petItem),
                note: v.note ?? '',
              });
              setAutoWeight(true);
              setRecordOpen(true);
            }}
            aria-label="Edit visit"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            
            onClick={() => {
              setToDelete(v);
              setDeleteOpen(true);
            }}
            aria-label="Delete visit"
          >
            <Delete fontSize="small" />
          </IconButton>
        </Stack>
        ),
    },
  ];

  const indexedVisits = useMemo(
    () => filteredVisits.map((v, i) => ({ ...v, index: i + 1 })),
    [filteredVisits],
  );

  const table =
    indexedVisits.length === 0 ? (
      <Typography align="center">No records</Typography>
    ) : (
      <TableContainer sx={{ overflowX: 'auto' }}>
        <ResponsiveTable
          columns={columns}
          rows={indexedVisits}
          getRowKey={(v) => v.id}
        />
      </TableContainer>
    );

  const tabs = weekDates.map(d => ({
    label: (
      <Stack spacing={0} alignItems="center">
        <Typography variant="body2">
          {formatLocaleDate(d, { weekday: 'short' })}
        </Typography>
        <Typography variant="caption">
          {formatLocaleDate(d, { month: 'short', day: 'numeric' })}
        </Typography>
      </Stack>
    ),
    content: (
      <>
        <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
          {`Summary of ${formatLocaleDate(d, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })},`}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="body2">
            {`Clients: ${summary.clients}`}
          </Typography>
          <Typography variant="body2">
            {`Total Weight: ${summary.totalWeight}`}
          </Typography>
          <Typography variant="body2">
            {`Adults: ${summary.adults}`}
          </Typography>
          <Typography variant="body2">
            {`Children: ${summary.children}`}
          </Typography>
          <Typography variant="body2">
            {`Sunshine Bag Clients: ${sunshineBagClients}`}
          </Typography>
          <Typography variant="body2">
            {`Sunshine Bag Weight: ${sunshineBagWeight}`}
          </Typography>
        </Stack>
        {table}
      </>
    ),
  }));

  return (
    <Page title="Pantry Visits" header={<PantryQuickLinks />}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <Button
          
          variant="contained"
          onClick={() => {
            setForm({
              date: format(selectedDate),
              anonymous: false,
              sunshineBag: false,
              sunshineWeight: '',
              sunshineClients: '',
              clientId: '',
              weightWithCart: '',
              weightWithoutCart: '',
              adults: '',
              children: '',
              petItem: '0',
              note: '',
            });
            setAutoWeight(true);
            setEditing(null);
            setRecordOpen(true);
          }}
          fullWidth
        >
          Record Visit
        </Button>
        <TextField

          label="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          inputProps={{ 'data-testid': 'entity-search-input' }}
          fullWidth
        />
        <TextField
          
          label="Lookup Date"
          type="date"
          value={lookupDate}
          onChange={e => setLookupDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <Button
          
          variant="contained"
          onClick={() => navigate(`/pantry/visits?date=${lookupDate}`)}
          disabled={!lookupDate}
          fullWidth
        >
          Go
        </Button>
      </Stack>
      <StyledTabs tabs={tabs} value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }} />

      <FormDialog
        open={recordOpen}
        onClose={() => {
          setRecordOpen(false);
          setEditing(null);
        }}
        maxWidth="md"
      >
        <DialogCloseButton onClose={() => { setRecordOpen(false); setEditing(null); }} />
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
            <RadioGroup
              row
              value={form.sunshineBag ? 'sunshine' : form.anonymous ? 'anonymous' : 'regular'}
              onChange={e => {
                const v = e.target.value;
                setForm({
                  ...form,
                  anonymous: v === 'anonymous',
                  sunshineBag: v === 'sunshine',
                });
              }}
              sx={{ gap: 2 }}
            >
              <FormControlLabel value="regular" control={<Radio />} label="Regular visit" />
              <FormControlLabel value="anonymous" control={<Radio />} label="Anonymous visit" />
              <FormControlLabel value="sunshine" control={<Radio />} label="Sunshine bag?" />
            </RadioGroup>
            {form.sunshineBag ? (
              <>
                <TextField
                  label="Sunshine Bag Weight"
                  type="number"
                  value={form.sunshineWeight}
                  onChange={e => setForm({ ...form, sunshineWeight: e.target.value })}
                />
                <TextField
                  label="Sunshine Bag Clients"
                  type="number"
                  value={form.sunshineClients}
                  onChange={e => setForm({ ...form, sunshineClients: e.target.value })}
                />
              </>
            ) : (
              <>
                <TextField
                  label="Client ID"
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                />
                {clientFound === false && (
                  <Alert
                    severity="error"
                    action={
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleCreateClient}
                      >
                        Create
                      </Button>
                    }
                    sx={{ alignItems: 'center' }}
                  >
                    Client not present in database
                  </Alert>
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
                  label="Adults"
                  type="number"
                  value={form.adults}
                  onChange={e => setForm({ ...form, adults: e.target.value })}
                />
                <TextField
                  label="Children"
                  type="number"
                  value={form.children}
                  onChange={e => setForm({ ...form, children: e.target.value })}
                />
                <TextField
                  label="Pet Item"
                  type="number"
                  value={form.petItem}
                  onChange={e => setForm({ ...form, petItem: e.target.value })}
                />
                <TextField
                  label="Staff Note"
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  multiline
                  rows={2}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleSaveVisit}
            disabled={
              saving ||
              (form.sunshineBag
                ? !form.sunshineWeight || !form.sunshineClients
                : !form.weightWithCart || !form.weightWithoutCart || !form.clientId)
            }
          >
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
        <DialogTitle>Delete Visit</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this visit?
        </DialogContent>
        <DialogActions>
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
      </FormDialog>

      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </Page>
  );
}
