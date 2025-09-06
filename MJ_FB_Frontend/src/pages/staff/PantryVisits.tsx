import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  IconButton,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import StyledTabs from '../../components/StyledTabs';
import DialogCloseButton from '../../components/DialogCloseButton';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import {
  getClientVisits,
  createClientVisit,
  updateClientVisit,
  deleteClientVisit,
  importVisitsXlsx,
  type ClientVisit,
  type VisitImportSheet,
} from '../../api/clientVisits';
import { getSunshineBag, saveSunshineBag, type SunshineBag } from '../../api/sunshineBags';
import { addUser, getUserByClientId } from '../../api/users';
import { getAppConfig } from '../../api/appConfig';
import type { AlertColor } from '@mui/material';
import { toDayjs, toDate, formatDate, formatLocaleDate, addDays } from '../../utils/date';

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

function formatDisplay(dateStr: string) {
  const d = toDayjs(dateStr);
  if (!d.isValid()) return dateStr;
  return formatLocaleDate(d, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PantryVisits() {
  const { t } = useTranslation();
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
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<VisitImportSheet[]>([]);

  const [cartTare, setCartTare] = useState(0);
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
    getAppConfig()
      .then(cfg => setCartTare(cfg.cartTare))
      .catch(() => {});
  }, []);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImportFile(file);
    setPreview([]);
  }

  function handleDryRun() {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    importVisitsXlsx(formData, true)
      .then(res => setPreview(res?.sheets || []))
      .catch(err =>
        setSnackbar({
          open: true,
          message: err.message || t('pantry_visits.import_error'),
          severity: 'error',
        }),
      );
  }

  function handleImport() {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    importVisitsXlsx(formData)
      .then(() => {
        setSnackbar({
          open: true,
          message: t('pantry_visits.import_success'),
          severity: 'success',
        });
        setImportOpen(false);
        setImportFile(null);
        setPreview([]);
        loadVisits();
      })
      .catch(err =>
        setSnackbar({
          open: true,
          message: err.message || t('pantry_visits.import_error'),
          severity: 'error',
        }),
      );
  }

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
    if (form.sunshineBag) {
      if (!form.sunshineWeight || !form.sunshineClients) {
        setSnackbar({ open: true, message: 'Weight and clients required', severity: 'error' });
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
        .catch(err => setSnackbar({ open: true, message: err.message || 'Failed to save sunshine bag', severity: 'error' }));
      return;
    }
    if (!form.date || !form.weightWithCart || !form.weightWithoutCart) {
      setSnackbar({ open: true, message: 'Date and weights required', severity: 'error' });
      return;
    }
    if (!form.clientId) {
      setSnackbar({ open: true, message: 'Client ID required', severity: 'error' });
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
      .catch(err => setSnackbar({ open: true, message: err.message || 'Failed to save visit', severity: 'error' }));
  }

  async function handleCreateClient() {
    if (!form.clientId) return;
    try {
      await addUser('', '', form.clientId, 'shopper', false);
      setClientFound(true);
      setSnackbar({ open: true, message: 'Client created', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to create client', severity: 'error' });
    }
  }

  const table = (
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
            <TableCell>{t('adults_label')}</TableCell>
            <TableCell>{t('children_label')}</TableCell>
            <TableCell>Pet Item</TableCell>
            <TableCell>Note</TableCell>
            <TableCell align="right"></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredVisits.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} align="center">
                No records
              </TableCell>
            </TableRow>
          ) : (
            filteredVisits.map(v => (
              <TableRow key={v.id}>
                <TableCell>{formatDisplay(v.date)}</TableCell>
                <TableCell>
                  {v.clientId ?? 'N/A'}
                  {v.anonymous ? ' (ANONYMOUS)' : ''}
                </TableCell>
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
                <TableCell>{v.adults}</TableCell>
                <TableCell>{v.children}</TableCell>
                <TableCell>{v.petItem}</TableCell>
                <TableCell>{v.note || ''}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditing(v);
                      setForm({
                        date: formatDate(v.date),
                        anonymous: v.anonymous,
                        sunshineBag: false,
                        sunshineWeight: '',
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
            ))
          )}
        </TableBody>
      </Table>
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
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="body2">
            {t('pantry_visits.summary.clients')}: {summary.clients}
          </Typography>
          <Typography variant="body2">
            {t('pantry_visits.summary.total_weight')}: {summary.totalWeight}
          </Typography>
          <Typography variant="body2">
            {t('pantry_visits.summary.adults')}: {summary.adults}
          </Typography>
          <Typography variant="body2">
            {t('pantry_visits.summary.children')}: {summary.children}
          </Typography>
          <Typography variant="body2">
            {t('pantry_visits.summary.sunshine_bag_weight')}: {sunshineBagWeight}
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
          size="small"
          variant="contained"
          onClick={() => {
            setForm({
              date: format(selectedDate),
              anonymous: false,
              sunshineBag: false,
              sunshineWeight: '',
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
        <Button
          size="small"
          variant="contained"
          onClick={() => setImportOpen(true)}
          fullWidth
        >
          {t('pantry_visits.import_visits')}
        </Button>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
        />
        <TextField
          size="small"
          label="Lookup Date"
          type="date"
          value={lookupDate}
          onChange={e => setLookupDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <Button
          size="small"
          variant="contained"
          onClick={() => navigate(`/pantry/visits?date=${lookupDate}`)}
          disabled={!lookupDate}
          fullWidth
        >
          Go
        </Button>
      </Stack>
      <StyledTabs tabs={tabs} value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }} />

      <Dialog open={recordOpen} onClose={() => { setRecordOpen(false); setEditing(null); }}>
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
              <FormControlLabel value="sunshine" control={<Radio />} label={t('sunshine_bag_label')} />
            </RadioGroup>
            {form.sunshineBag ? (
              <>
                <TextField
                  label={t('sunshine_bag_weight_label')}
                  type="number"
                  value={form.sunshineWeight}
                  onChange={e => setForm({ ...form, sunshineWeight: e.target.value })}
                />
                <TextField
                  label={t('sunshine_bag_clients_label')}
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
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="error" sx={{ flexGrow: 1 }}>
                      Client not present in database
                    </Typography>
                    <Button size="small" variant="outlined" onClick={handleCreateClient}>
                      Create
                    </Button>
                  </Stack>
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
                  label={t('adults_label')}
                  type="number"
                  value={form.adults}
                  onChange={e => setForm({ ...form, adults: e.target.value })}
                />
                <TextField
                  label={t('children_label')}
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
                  label={t('staff_note_label')}
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
              form.sunshineBag
                ? !form.sunshineWeight || !form.sunshineClients
                : !form.weightWithCart || !form.weightWithoutCart || !form.clientId
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportFile(null);
          setPreview([]);
        }}
      >
        <DialogCloseButton
          onClose={() => {
            setImportOpen(false);
            setImportFile(null);
            setPreview([]);
          }}
        />
        <DialogTitle>{t('pantry_visits.import_visits')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <input
              type="file"
              accept=".xlsx"
              data-testid="import-input"
              onChange={handleFileChange}
            />
            {preview.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('pantry_visits.sheet_date')}</TableCell>
                    <TableCell>{t('pantry_visits.sheet_rows')}</TableCell>
                    <TableCell>{t('pantry_visits.sheet_errors')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDisplay(s.date)}</TableCell>
                      <TableCell>{s.rows}</TableCell>
                      <TableCell>{s.errors.join(', ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDryRun} disabled={!importFile}>
            {t('pantry_visits.dry_run')}
          </Button>
          <Button onClick={handleImport} disabled={!importFile}>
            {t('pantry_visits.import')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setToDelete(null); }}>
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
