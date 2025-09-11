import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getBookingHistory,
  cancelBooking,
} from '../../../api/bookings';
import { deleteClientVisit } from '../../../api/clientVisits';
import {
  getUserByClientId,
  updateUserInfo,
  requestPasswordReset,
} from '../../../api/users';
import BookingManagementBase from '../BookingManagementBase';
import RescheduleDialog from '../../../components/RescheduleDialog';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import DialogCloseButton from '../../../components/DialogCloseButton';
import PasswordField from '../../../components/PasswordField';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import getApiErrorMessage from '../../../utils/getApiErrorMessage';
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
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import type { Booking } from '../../../types';
import { toDate } from '../../../utils/date';

interface User {
  name: string;
  client_id: number;
}

export default function UserHistory({ initialUser }: { initialUser?: User }) {
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<User | null>(initialUser || null);
  const [filter, setFilter] = useState('all');
  const [notesOnly, setNotesOnly] = useState(false);
  const [reschedule, setReschedule] = useState<{ booking: Booking; reload: () => void } | null>(null);
  const [deleteVisit, setDeleteVisit] = useState<{ id: number; reload: () => void } | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const [editOpen, setEditOpen] = useState(false);
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
  const reloadRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (initialUser) return;
    const name = searchParams.get('name');
    const clientId = searchParams.get('clientId');
    if (name && clientId) {
      setSelected({ name, client_id: Number(clientId) });
    }
  }, [searchParams, initialUser]);

  const loadHistory = useCallback(
    (id: number): Promise<Booking[]> => {
      const opts: {
        status?: string;
        past?: boolean;
        userId?: number;
        includeVisits?: boolean;
        includeStaffNotes?: boolean;
      } = { includeVisits: true };
      if (showNotes) opts.includeStaffNotes = true;
      if (!initialUser) opts.userId = id;
      if (filter === 'past') opts.past = true;
      else if (filter !== 'all') opts.status = filter;
      return getBookingHistory(opts).then(data => {
        const arr = Array.isArray(data) ? [...data] : [data];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const active = arr
          .filter(
            b =>
              b.status === 'approved' &&
              toDate(b.date).getTime() >= today.getTime(),
          )
          .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())[0];
        const remaining = active ? arr.filter(b => b !== active) : arr;
        const sorted = remaining.sort(
          (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime(),
        );
        const ordered = active ? [active, ...sorted] : sorted;
        return notesOnly
          ? ordered.filter(
              b => b.status === 'visited' && (b.client_note || b.staff_note),
            )
          : ordered;
      });
    },
    [filter, notesOnly, initialUser, showNotes],
  );

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
    } catch (err: unknown) {
      setSeverity('error');
      setMessage(getApiErrorMessage(err, 'Failed to load client details'));
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
        s ? { ...s, name: `${form.firstName} ${form.lastName}` } : s,
      );
      setSeverity('success');
      setMessage(t('client_updated'));
      setEditOpen(false);
      reloadRef.current();
      return true;
    } catch (err: unknown) {
      setSeverity('error');
      setMessage(getApiErrorMessage(err, 'Unable to update client'));
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
    } catch (err: unknown) {
      setSeverity('error');
      setMessage(getApiErrorMessage(err, 'Failed to send password reset link'));
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {initialUser ? t('booking_history') : t('client_history')}
      </Typography>
      <BookingManagementBase<Booking, User>
        searchType="user"
        searchPlaceholder={t('search_by_name_or_client_id')}
        getId={u => u.client_id}
        loadHistory={loadHistory}
        cancelBooking={id => cancelBooking(String(id))}
        onReschedule={(b, reload) => setReschedule({ booking: b, reload })}
        renderExtraActions={(b, isSmall, reload) =>
          role === 'staff' && b.status === 'visited' && !b.slot_id ? (
            <Button
              onClick={() => setDeleteVisit({ id: b.id, reload })}
              variant="outlined"
              color="error"
              fullWidth={isSmall}
            >
              Delete visit
            </Button>
          ) : null
        }
        showReason
        showStaffNotes={showNotes}
        initialEntity={initialUser}
        reloadDeps={[filter, notesOnly]}
        onMessage={(sev, msg) => {
          setSeverity(sev);
          setMessage(msg);
        }}
        renderEntityActions={(entity, reload) => {
          reloadRef.current = reload;
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              {!initialUser && (
                <Button variant="contained" onClick={handleEditClient}>
                  Edit Client
                </Button>
              )}
              <FormControl sx={{ minWidth: 160 }}>
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
            </Stack>
          );
        }}
        onSelect={u => setSelected(u)}
      />
      {reschedule && (
        <RescheduleDialog
          open={!!reschedule}
          rescheduleToken={reschedule.booking.reschedule_token!}
          onClose={() => setReschedule(null)}
          onRescheduled={() => {
            reschedule.reload();
            setReschedule(null);
          }}
        />
      )}
      <Dialog open={deleteVisit != null} onClose={() => setDeleteVisit(null)}>
        <DialogCloseButton onClose={() => setDeleteVisit(null)} />
        <DialogTitle>Delete visit</DialogTitle>
        <DialogContent>
          <Typography>Delete this visit?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!deleteVisit) return;
              try {
                await deleteClientVisit(deleteVisit.id);
                setSeverity('success');
                setMessage('Visit deleted');
                deleteVisit.reload();
              } catch (err: unknown) {
                setSeverity('error');
                setMessage(getApiErrorMessage(err, 'Unable to delete visit'));
              } finally {
                setDeleteVisit(null);
              }
            }}
          >
            Delete visit
          </Button>
        </DialogActions>
      </Dialog>
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
                  onChange={e => setForm({ ...form, password: e.target.value })}
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
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Box>
  );
}
