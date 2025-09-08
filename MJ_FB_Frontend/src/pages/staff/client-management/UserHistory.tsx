import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBookingHistory, cancelBooking } from '../../../api/bookings';
import { deleteClientVisit } from '../../../api/clientVisits';
import {
  getUserByClientId,
  updateUserInfo,
  requestPasswordReset,
} from '../../../api/users';
import { useAuth } from '../../../hooks/useAuth';
import { formatTime } from '../../../utils/time';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import RescheduleDialog from '../../../components/RescheduleDialog';
import EntitySearch from '../../../components/EntitySearch';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import DialogCloseButton from '../../../components/DialogCloseButton';
import PasswordField from '../../../components/PasswordField';
import { useTranslation } from 'react-i18next';
import { toDate, formatDate } from '../../../utils/date';
import Page from '../../../components/Page';
import type { Booking } from '../../../types';
import ResponsiveTable from '../../../components/ResponsiveTable';

interface User {
  name: string;
  client_id: number;
}

export default function UserHistory({
  initialUser,
}: {
  initialUser?: User;
}) {
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<User | null>(initialUser || null);
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const [editOpen, setEditOpen] = useState(false);
  const [notesOnly, setNotesOnly] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    onlineAccess: false,
    password: '',
    hasPassword: false,
  });
  const { t } = useTranslation();
  const { role } = useAuth();
  const showNotes = role === 'staff' || role === 'agency';

  const pageSize = 10;

  const loadBookings = useCallback(() => {
    if (!selected) return Promise.resolve();
    const opts: {
      status?: string;
      past?: boolean;
      userId?: number;
      includeVisits?: boolean;
      includeStaffNotes?: boolean;
    } = { includeVisits: true };
    if (role === 'staff' || role === 'agency') {
      opts.includeStaffNotes = true;
    }
    if (!initialUser) opts.userId = selected.client_id;
    if (filter === 'past') opts.past = true;
    else if (filter !== 'all') opts.status = filter;
    return getBookingHistory(opts)
      .then(data => {
        const arr = Array.isArray(data) ? data : [data];
        const sorted = arr.sort(
          (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime(),
        );
        setBookings(sorted);
        setPage(1);
      })
      .catch(err => console.error('Error loading history:', err));
  }, [selected, filter, initialUser]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (initialUser) return;
    const name = searchParams.get('name');
    const clientId = searchParams.get('clientId');
    if (name && clientId) {
      setSelected({ name, client_id: Number(clientId) });
    }
  }, [searchParams, initialUser]);

  const filtered = notesOnly
    ? bookings.filter(
        b => b.status === 'visited' && (b.client_note || b.staff_note),
      )
    : bookings;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const columns = [
    {
      field: 'date',
      header: t('date'),
      render: (b: Booking) =>
        b.date && !isNaN(toDate(b.date).getTime())
          ? formatDate(b.date, 'MMM D, YYYY')
          : 'N/A',
    },
    {
      field: 'time',
      header: t('time'),
      render: (b: Booking) => {
        const startTime = b.start_time ? formatTime(b.start_time) : 'N/A';
        const endTime = b.end_time ? formatTime(b.end_time) : 'N/A';
        return startTime !== 'N/A' && endTime !== 'N/A'
          ? `${startTime} - ${endTime}`
          : 'N/A';
      },
    },
    { field: 'status', header: t('status'), render: (b: Booking) => t(b.status) },
    { field: 'reason', header: t('reason'), render: (b: Booking) => b.reason || '' },
  ] as any;

  if (showNotes) {
    columns.push({
      field: 'staff_note' as keyof Booking & string,
      header: t('staff_note_label'),
      render: (b: Booking) =>
        b.staff_note ? <Typography variant="body2">{b.staff_note}</Typography> : '',
    });
  }

  columns.push({
    field: 'actions' as keyof Booking & string,
    header: t('actions'),
    render: (b: Booking) => (
      <>
        {['approved'].includes(b.status.toLowerCase()) && (
          <Stack
            direction={isSmall ? 'column' : 'row'}
            spacing={1}
            alignItems={isSmall ? 'stretch' : 'center'}
          >
            <Button onClick={() => setCancelId(b.id)} variant="outlined" color="primary">
              {t('cancel')}
            </Button>
            <Button onClick={() => setRescheduleBooking(b)} variant="outlined" color="primary">
              {t('reschedule')}
            </Button>
          </Stack>
        )}
        {role === 'staff' && b.status === 'visited' && !b.slot_id && (
          <Button
            onClick={() => setDeleteVisitId(b.id)}
            variant="outlined"
            color="error"
            size="small"
            sx={{ mt: ['approved'].includes(b.status.toLowerCase()) ? 1 : 0 }}
          >
            Delete visit
          </Button>
        )}
      </>
    ),
  });

  async function confirmCancel() {
    if (cancelId == null) return;
    try {
      await cancelBooking(String(cancelId));
      setSeverity('success');
      setMessage(t('booking_cancelled'));
      loadBookings();
    } catch {
      setSeverity('error');
      setMessage(t('cancel_booking_failed'));
    } finally {
      setCancelId(null);
    }
  }

  async function confirmDeleteVisit() {
    if (deleteVisitId == null) return;
    try {
      await deleteClientVisit(deleteVisitId);
      setSeverity('success');
      setMessage('Visit deleted');
      loadBookings();
    } catch {
      setSeverity('error');
      setMessage('Failed to delete visit');
    } finally {
      setDeleteVisitId(null);
    }
  }

  async function handleEditClient() {
    if (!selected) return;
    try {
      const data = await getUserByClientId(String(selected.client_id));
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        onlineAccess: Boolean(data.onlineAccess),
        password: '',
        hasPassword: data.hasPassword,
      });
      setEditOpen(true);
    } catch {
      setSeverity('error');
      setMessage(t('load_client_failed'));
    }
  }

  async function handleSaveClient(): Promise<boolean> {
    if (!selected) return false;
    try {
      await updateUserInfo(selected.client_id, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        onlineAccess: form.hasPassword ? true : form.onlineAccess,
        ...(form.onlineAccess && form.password
          ? { password: form.password }
          : {}),
      });
      setSelected(s =>
        s ? { ...s, name: `${form.firstName} ${form.lastName}` } : s
      );
      setSeverity('success');
      setMessage(t('client_updated'));
      setEditOpen(false);
      loadBookings();
      return true;
    } catch {
      setSeverity('error');
      setMessage(t('update_failed'));
      return false;
    }
  }

  async function handleSendReset() {
    if (!selected) return;
    const ok = await handleSaveClient();
    if (!ok) return;
    try {
      await requestPasswordReset({ clientId: String(selected.client_id) });
      setSeverity('success');
      setMessage('Password reset link sent');
    } catch {
      setSeverity('error');
      setMessage('Failed to send password reset link');
    }
  }

  return (
    <Page title={initialUser ? t('booking_history') : t('client_history')}>
      <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
        <Box width="100%" maxWidth={800} mt={4}>
        {!initialUser && (
          <EntitySearch
            type="user"
            placeholder={t('search_by_name_or_client_id')}
            onSelect={u => setSelected(u as User)}
          />
        )}
        {selected && (
          <div>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              {selected.name && <h3>{t('history_for', { name: selected.name })}</h3>}
              {!initialUser && (
                <Button size="small" variant="contained" onClick={handleEditClient}>
                  Edit Client
                </Button>
              )}
            </Stack>
            <FormControl size="small" sx={{ minWidth: 160, mb: 1 }}>
              <InputLabel id="filter-label">{t('filter')}</InputLabel>
              <Select
                labelId="filter-label"
                value={filter}
                label={t('filter')}
                onChange={e => setFilter(e.target.value)}
              >
                <MenuItem value="all">{t('all')}</MenuItem>
                <MenuItem value="approved">{t('approved')}</MenuItem>
                <MenuItem value="visited">{t('visited')}</MenuItem>
                <MenuItem value="no_show">{t('no_show')}</MenuItem>
                <MenuItem value="past">{t('past')}</MenuItem>
              </Select>
            </FormControl>
            {role === 'staff' && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={notesOnly}
                    onChange={e => setNotesOnly(e.target.checked)}
                  />
                }
                label={t('visits_with_notes_only')}
              />
            )}
            {paginated.length === 0 ? (
              <Typography align="center">{t('no_bookings')}</Typography>
            ) : (
              <ResponsiveTable
                columns={columns}
                rows={paginated}
                getRowKey={b => `${b.id}-${b.date}`}
              />
            )}
            {totalPages > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1,
                  mt: 1,
                }}
              >
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  variant="outlined"
                  color="primary"
                >
                  {t('previous')}
                </Button>
                <span>
                  {t('page_of_total', { page, total: totalPages })}
                </span>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  variant="outlined"
                  color="primary"
                >
                  {t('next')}
                </Button>
              </Box>
            )}
          </div>
        )}
        {rescheduleBooking && (
          <RescheduleDialog
            open={!!rescheduleBooking}
            rescheduleToken={rescheduleBooking.reschedule_token!}
            onClose={() => setRescheduleBooking(null)}
            onRescheduled={() => {
              loadBookings();
            }}
          />
        )}
          {editOpen && (
            <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
              <DialogCloseButton onClose={() => setEditOpen(false)} />
              <DialogTitle>Edit Client</DialogTitle>
              <DialogContent>
              <Stack spacing={2} mt={1}>
                <Tooltip
                  title="Client already has a password"
                  disableHoverListener={!form.hasPassword}
                >
                  <span>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.onlineAccess}
                          onChange={e =>
                            setForm({
                              ...form,
                              onlineAccess: e.target.checked,
                            })
                          }
                          disabled={form.hasPassword}
                        />
                      }
                      label="Online Access"
                    />
                  </span>
                </Tooltip>
                <TextField
                  label="First Name"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                />
                <TextField
                  label="Last Name"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                />
                <TextField
                  label="Email (optional)"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
                <TextField
                  label="Phone (optional)"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
                {form.onlineAccess && !form.hasPassword && (
                  <PasswordField
                    label="Password"
                    value={form.password}
                    onChange={e =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                )}
              </Stack>
            </DialogContent>
                <DialogActions>
                  {form.onlineAccess && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleSendReset}
                    >
                      Send password reset link
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveClient}
                    disabled={!form.firstName || !form.lastName}
                  >
                    Save
                  </Button>
                </DialogActions>
              </Dialog>
          )}
          <Dialog open={cancelId !== null} onClose={() => setCancelId(null)}>
            <DialogCloseButton onClose={() => setCancelId(null)} />
            <DialogTitle>{t('cancel_booking')}</DialogTitle>
            <DialogContent>
              <Typography>{t('cancel_booking_question')}</Typography>
            </DialogContent>
            <DialogActions>
              <Button
                color="error"
                variant="contained"
                onClick={confirmCancel}
              >
                {t('cancel_booking')}
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={deleteVisitId !== null}
            onClose={() => setDeleteVisitId(null)}
          >
            <DialogCloseButton onClose={() => setDeleteVisitId(null)} />
            <DialogTitle>Delete visit</DialogTitle>
            <DialogContent>
              <Typography>Delete this visit?</Typography>
            </DialogContent>
            <DialogActions>
              <Button
                color="error"
                variant="contained"
                onClick={confirmDeleteVisit}
              >
                Delete visit
              </Button>
            </DialogActions>
          </Dialog>
          <FeedbackSnackbar
          open={!!message}
          onClose={() => setMessage('')}
          message={message}
          severity={severity}
        />
        </Box>
      </Box>
    </Page>
  );
}
