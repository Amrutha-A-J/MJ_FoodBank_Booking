import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  ListItemText,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Checkbox,
  DialogTitle,
} from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import Page from '../../../components/Page';
import PageCard from '../../../components/layout/PageCard';
import VolunteerQuickLinks from '../../../components/VolunteerQuickLinks';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import BookingHistoryTable from '../../../components/BookingHistoryTable';
import FormDialog from '../../../components/FormDialog';
import DialogCloseButton from '../../../components/DialogCloseButton';
import ConfirmDialog from '../../../components/ConfirmDialog';
import AccountEditForm, {
  type AccountEditFormData,
} from '../../../components/account/AccountEditForm';
import {
  createVolunteerShopperProfile,
  getVolunteerBookingHistory,
  getVolunteerById,
  getVolunteerRoles,
  getVolunteerStatsById,
  removeVolunteerShopperProfile,
  updateVolunteer,
  updateVolunteerTrainedAreas,
  deleteVolunteer,
  type VolunteerSearchResult,
  type VolunteerStatsByIdResponse,
  type VolunteerMostBookedRole,
} from '../../../api/volunteers';
import { requestPasswordReset } from '../../../api/users';
import { getApiErrorMessage } from '../../../api/helpers';
import type {
  VolunteerBooking,
  VolunteerRoleWithShifts,
} from '../../../types';
import { formatDate } from '../../../utils/date';
import type { SelectChangeEvent } from '@mui/material/Select';

interface ProfileDetailProps {
  label: string;
  value: string;
  testId?: string;
}

function ProfileDetail({ label, value, testId }: ProfileDetailProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" data-testid={testId}>
        {value}
      </Typography>
    </Stack>
  );
}

function formatHours(hours: number) {
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(hours)} hrs`;
}

function renderRoleSummary(role: VolunteerMostBookedRole) {
  return `${role.shifts} shift${role.shifts === 1 ? '' : 's'} · ${formatHours(role.hours)}`;
}

export default function VolunteerProfile() {
  const { volunteerId } = useParams<{ volunteerId: string }>();
  const navigate = useNavigate();
  const parsedId = volunteerId ? Number(volunteerId) : NaN;

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [volunteer, setVolunteer] = useState<VolunteerSearchResult | null>(null);
  const [stats, setStats] = useState<VolunteerStatsByIdResponse | null>(null);
  const [history, setHistory] = useState<VolunteerBooking[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [initialSelected, setInitialSelected] = useState<string[]>([]);
  const [hasShopper, setHasShopper] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [shopperDialogOpen, setShopperDialogOpen] = useState(false);
  const [removeShopperOpen, setRemoveShopperOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingVolunteer, setDeletingVolunteer] = useState(false);
  const [shopperClientId, setShopperClientId] = useState('');
  const [shopperEmail, setShopperEmail] = useState('');
  const [shopperPhone, setShopperPhone] = useState('');
  const [savingRoles, setSavingRoles] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [loadError, setLoadError] = useState('');

  async function handleDeleteVolunteer() {
    if (!volunteer || deletingVolunteer) return;
    setDeletingVolunteer(true);
    try {
      await deleteVolunteer(volunteer.id);
      setDeleteDialogOpen(false);
      navigate('/volunteer-management');
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to delete volunteer'));
      setSeverity('error');
    } finally {
      setDeletingVolunteer(false);
    }
  }

  useEffect(() => {
    let active = true;
    getVolunteerRoles()
      .then(r => {
        if (!active) return;
        setRoles(r);
      })
      .catch(err => {
        if (!active) return;
        setMessage(getApiErrorMessage(err, 'Unable to load roles'));
        setSeverity('error');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!volunteerId || Number.isNaN(parsedId)) {
      setLoading(false);
      setLoadError('Volunteer not found');
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError('');

    Promise.all([
      getVolunteerById(parsedId),
      getVolunteerStatsById(parsedId),
      getVolunteerBookingHistory(parsedId),
    ])
      .then(([vol, statsResponse, historyResponse]) => {
        if (!active) return;
        setVolunteer(vol);
        setStats(statsResponse);
        setHistory(historyResponse);
        setHasShopper(vol.hasShopper);
      })
      .catch(err => {
        if (!active) return;
        setLoadError('Unable to load volunteer');
        setMessage(getApiErrorMessage(err, 'Unable to load volunteer profile'));
        setSeverity('error');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [volunteerId, parsedId]);

  const groupedRoles = useMemo(() => {
    const groups = new Map<string, { id: number; name: string }[]>();
    roles.forEach(r => {
      const groupRoles = groups.get(r.category_name) ?? [];
      if (!groupRoles.some(role => role.id === r.id)) {
        groupRoles.push({ id: r.id, name: r.name });
      }
      groups.set(r.category_name, groupRoles);
    });
    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      roles: items,
    }));
  }, [roles]);

  const idToName = useMemo(() => {
    const map = new Map<number, string>();
    roles.forEach(r => map.set(r.id, r.name));
    return map;
  }, [roles]);

  const nameToRoleIds = useMemo(() => {
    const map = new Map<string, number[]>();
    roles.forEach(r => {
      const values = map.get(r.name) ?? [];
      values.push(r.id);
      map.set(r.name, values);
    });
    return map;
  }, [roles]);

  useEffect(() => {
    if (!volunteer) return;
    setHasShopper(volunteer.hasShopper);
  }, [volunteer?.hasShopper]);

  useEffect(() => {
    if (!volunteer) {
      setSelected([]);
      setInitialSelected([]);
      return;
    }
    const names = volunteer.trainedAreas
      .map(id => idToName.get(id))
      .filter((name): name is string => Boolean(name));
    setSelected(names);
    setInitialSelected(names);
  }, [volunteer, idToName]);

  function handleRoleChange(e: SelectChangeEvent<string[]>) {
    const value = e.target.value;
    setSelected(typeof value === 'string' ? value.split(',') : value);
  }

  function removeRole(name: string) {
    setSelected(prev => prev.filter(r => r !== name));
  }

  const hasRoleChanges = useMemo(() => {
    if (selected.length !== initialSelected.length) return true;
    const a = [...selected].sort();
    const b = [...initialSelected].sort();
    return a.some((v, i) => v !== b[i]);
  }, [selected, initialSelected]);

  async function refreshVolunteer(id: number) {
    try {
      const updated = await getVolunteerById(id);
      setVolunteer(updated);
      const names = updated.trainedAreas
        .map(rid => idToName.get(rid))
        .filter((n): n is string => Boolean(n));
      setSelected(names);
      setInitialSelected(names);
      setHasShopper(updated.hasShopper);
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to refresh volunteer'));
      setSeverity('error');
    }
  }

  async function handleSaveRoles() {
    if (!volunteer || !hasRoleChanges) return;
    setSavingRoles(true);
    try {
      const roleIds = selected.flatMap(name => nameToRoleIds.get(name) ?? []);
      await updateVolunteerTrainedAreas(volunteer.id, roleIds);
      setInitialSelected(selected);
      setMessage('Volunteer updated');
      setSeverity('success');
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to update volunteer roles'));
      setSeverity('error');
    } finally {
      setSavingRoles(false);
    }
  }

  interface SaveProfileOptions {
    sendResetLink?: boolean;
    skipRefresh?: boolean;
  }

  async function saveProfile(
    data: AccountEditFormData,
    { sendResetLink = false, skipRefresh = false }: SaveProfileOptions = {},
  ): Promise<boolean> {
    if (!volunteer) return false;

    const changed =
      data.firstName !== volunteer.firstName ||
      data.lastName !== volunteer.lastName ||
      data.email !== (volunteer.email || '') ||
      data.phone !== (volunteer.phone || '') ||
      data.onlineAccess !== volunteer.hasPassword ||
      (!!data.password && data.password.length > 0);

    if (!changed && !sendResetLink) {
      return false;
    }

    if (data.onlineAccess && !data.email) {
      setMessage('Email required for online access');
      setSeverity('error');
      return false;
    }

    if (
      data.onlineAccess &&
      !volunteer.hasPassword &&
      !sendResetLink &&
      !data.password
    ) {
      setMessage('Password required');
      setSeverity('error');
      return false;
    }

    setProfileSaving(true);
    try {
      const payload: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        onlineAccess?: boolean;
        password?: string;
      } = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        onlineAccess: data.onlineAccess,
      };

      if (data.password && !sendResetLink) {
        payload.password = data.password;
      }

      await updateVolunteer(volunteer.id, payload);
      if (!skipRefresh) {
        await refreshVolunteer(volunteer.id);
      }
      if (!sendResetLink) {
        setMessage('Volunteer updated');
        setSeverity('success');
      }
      return true;
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to update volunteer profile'));
      setSeverity('error');
      return false;
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSendReset(data: AccountEditFormData): Promise<boolean> {
    if (!volunteer) return false;
    const saved = await saveProfile(data, { sendResetLink: true, skipRefresh: true });
    if (!saved) return false;
    try {
      await requestPasswordReset({ email: data.email });
      setMessage('Password reset link sent');
      setSeverity('success');
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to send password reset link'));
      setSeverity('error');
    } finally {
      await refreshVolunteer(volunteer.id);
    }
    return true;
  }

  function handleShopperToggle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!volunteer) return;
    if (e.target.checked) {
      setShopperDialogOpen(true);
    } else {
      setRemoveShopperOpen(true);
    }
  }

  async function createShopper() {
    if (!volunteer) return;
    try {
      await createVolunteerShopperProfile(
        volunteer.id,
        shopperClientId,
        shopperEmail || undefined,
        shopperPhone || undefined,
      );
      setMessage('Shopper profile created');
      setSeverity('success');
      setShopperDialogOpen(false);
      setShopperClientId('');
      setShopperEmail('');
      setShopperPhone('');
      setHasShopper(true);
      await refreshVolunteer(volunteer.id);
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to create shopper profile'));
      setSeverity('error');
    }
  }

  async function removeShopper() {
    if (!volunteer) return;
    try {
      await removeVolunteerShopperProfile(volunteer.id);
      setMessage('Shopper profile removed');
      setSeverity('success');
      setRemoveShopperOpen(false);
      setHasShopper(false);
      await refreshVolunteer(volunteer.id);
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to remove shopper profile'));
      setSeverity('error');
    }
  }

  const accountInitialData = useMemo<AccountEditFormData>(
    () => ({
      firstName: volunteer?.firstName || '',
      lastName: volunteer?.lastName || '',
      email: volunteer?.email || '',
      phone: volunteer?.phone || '',
      onlineAccess: volunteer?.hasPassword ?? false,
      password: '',
      hasPassword: volunteer?.hasPassword ?? false,
    }),
    [
      volunteer?.firstName,
      volunteer?.lastName,
      volunteer?.email,
      volunteer?.phone,
      volunteer?.hasPassword,
    ],
  );

  const title = volunteer ? volunteer.name : 'Volunteer Profile';

  return (
    <Page title={title} header={<VolunteerQuickLinks />}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading volunteer" />
        </Box>
      ) : loadError ? (
        <Typography color="error" variant="body1">
          {loadError}
        </Typography>
      ) : !volunteer ? (
        <Typography variant="body1">Volunteer not found.</Typography>
      ) : (
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            <Stack spacing={2} sx={{ flex: { xs: '1 1 auto', md: '2 1 0%' }, minWidth: 0 }}>
              <PageCard>
                <Stack spacing={3}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h5" data-testid="volunteer-name">
                        {`${volunteer.firstName} ${volunteer.lastName}`.trim() ||
                          volunteer.name}
                      </Typography>
                      {volunteer.hasPassword && (
                        <Chip
                          icon={<CheckCircleOutline fontSize="small" />}
                          label="Online account"
                          color="success"
                          size="small"
                          variant="outlined"
                          data-testid="online-badge"
                          aria-label="Online account"
                        />
                      )}
                      {hasShopper && (
                        <Chip
                          icon={<CheckCircleOutline fontSize="small" />}
                          label="Shopper profile"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Volunteer ID #{volunteer.id}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    }}
                  >
                    <Box>
                      <ProfileDetail
                        label="Email"
                        value={volunteer.email || 'Not provided'}
                        testId="volunteer-email"
                      />
                    </Box>
                    <Box>
                      <ProfileDetail
                        label="Phone"
                        value={volunteer.phone || 'Not provided'}
                        testId="volunteer-phone"
                      />
                    </Box>
                    <Box>
                      <ProfileDetail
                        label="Online Access"
                        value={volunteer.hasPassword ? 'Enabled' : 'Disabled'}
                        testId="volunteer-online-access"
                      />
                    </Box>
                    <Box>
                      <ProfileDetail
                        label="Shopper Profile"
                        value={hasShopper ? 'Enabled' : 'Disabled'}
                        testId="volunteer-shopper-profile"
                      />
                    </Box>
                    {volunteer.clientId && (
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <ProfileDetail
                          label="Shopper Client ID"
                          value={String(volunteer.clientId)}
                          testId="volunteer-client-id"
                        />
                      </Box>
                    )}
                  </Box>
                  <FormControl component="fieldset">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={hasShopper}
                          onChange={handleShopperToggle}
                          color="primary"
                          data-testid="shopper-toggle"
                        />
                      }
                      label="Shopper profile"
                    />
                    <FormHelperText>
                      Enable if this volunteer also shops at the pantry.
                    </FormHelperText>
                  </FormControl>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{ alignSelf: { sm: 'flex-start' } }}
                  >
                    <Button
                      variant="outlined"
                      onClick={() => setProfileDialogOpen(true)}
                    >
                      Edit Volunteer
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={deletingVolunteer}
                    >
                      Delete Volunteer
                    </Button>
                  </Stack>
                </Stack>
              </PageCard>

              <PageCard>
                <Stack spacing={2}>
                  <Typography variant="h6">Trained Roles</Typography>
                  <FormControl fullWidth>
                    <InputLabel id="volunteer-role-select">Roles</InputLabel>
                    <Select
                      labelId="volunteer-role-select"
                      multiple
                      value={selected}
                      onChange={handleRoleChange}
                      label="Roles"
                      data-testid="roles-select"
                      renderValue={(selectedValue: string | string[]) => {
                        const values = Array.isArray(selectedValue)
                          ? selectedValue
                          : typeof selectedValue === 'string'
                          ? selectedValue.split(',')
                          : [];
                        return values.length ? `${values.length} selected` : 'Select roles';
                      }}
                    >
                      {groupedRoles.flatMap(group => [
                        <ListSubheader key={`${group.category}-header`}>
                          {group.category}
                        </ListSubheader>,
                        ...group.roles.map(role => (
                          <MenuItem key={role.id} value={role.name}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Checkbox checked={selected.includes(role.name)} />
                              <ListItemText primary={role.name} />
                            </Stack>
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                    {selected.length === 0 && (
                      <FormHelperText>No roles assigned yet</FormHelperText>
                    )}
                  </FormControl>
                  {selected.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selected.map(name => (
                        <Chip
                          key={name}
                          label={name}
                          onDelete={() => removeRole(name)}
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Stack>
                  )}
                  <Button
                    variant="contained"
                    onClick={handleSaveRoles}
                    disabled={savingRoles || !hasRoleChanges}
                    data-testid="roles-save-button"
                  >
                    Save trained roles
                  </Button>
                </Stack>
              </PageCard>
            </Stack>
            <PageCard
              sx={{
                flex: { xs: '1 1 auto', md: '1 1 0%' },
                minWidth: { md: 300 },
              }}
            >
              <Stack spacing={2}>
                <Typography variant="h6">Stats</Typography>
                {stats ? (
                  <Stack spacing={2}>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">Month to date</Typography>
                      <Typography data-testid="stats-month">
                        {`${stats.monthToDate.shifts} shifts · ${formatHours(stats.monthToDate.hours)}`}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">Year to date</Typography>
                      <Typography data-testid="stats-ytd">
                        {`${stats.yearToDate.shifts} shifts · ${formatHours(stats.yearToDate.hours)}`}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">Lifetime</Typography>
                      <Typography data-testid="stats-lifetime">
                        {`${stats.lifetime.shifts} shifts · ${formatHours(stats.lifetime.hours)}`}
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Top roles</Typography>
                      {stats.mostBookedRoles.length ? (
                        <Stack spacing={1}>
                          {stats.mostBookedRoles.map(role => (
                            <Typography key={role.roleId} data-testid="stats-top-role">
                              <strong>{role.roleName}</strong> — {renderRoleSummary(role)}
                            </Typography>
                          ))}
                        </Stack>
                      ) : (
                        <Typography color="text.secondary">
                          No role stats available yet.
                        </Typography>
                      )}
                    </Stack>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">Last completed shift</Typography>
                      {stats.lastCompletedShift ? (
                        <Typography data-testid="stats-last-shift">
                          {`${formatDate(stats.lastCompletedShift.date, 'MMM D, YYYY')} · ${
                            stats.lastCompletedShift.roleName
                          } · ${formatHours(stats.lastCompletedShift.hours)}`}
                        </Typography>
                      ) : (
                        <Typography color="text.secondary">
                          No completed shifts yet.
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    Stats unavailable for this volunteer.
                  </Typography>
                )}
              </Stack>
            </PageCard>
          </Box>
          <PageCard>
            <Stack spacing={2}>
              <Typography variant="h6">Booking history</Typography>
              {history.length ? (
                <BookingHistoryTable rows={history} showRole />
              ) : (
                <Typography color="text.secondary">
                  No bookings found for this volunteer.
                </Typography>
              )}
            </Stack>
          </PageCard>
        </Stack>
      )}

      {volunteer && (
        <FormDialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)}>
          <DialogCloseButton onClose={() => setProfileDialogOpen(false)} />
          <DialogTitle>Edit Volunteer</DialogTitle>
          <AccountEditForm
            open={profileDialogOpen}
            initialData={accountInitialData}
            onSave={async data => {
              if (profileSaving) return false;
              const saved = await saveProfile(data);
              if (saved) {
                setProfileDialogOpen(false);
              }
              return saved;
            }}
            onSecondaryAction={async data => {
              if (profileSaving) return;
              const ok = await handleSendReset(data);
              if (ok) {
                setProfileDialogOpen(false);
              }
            }}
            secondaryActionLabel="Send password reset link"
            onlineAccessHelperText="Allow the volunteer to sign in online."
            existingPasswordTooltip="Volunteer already has a password"
            secondaryActionTestId="send-reset-button"
            primaryActionTestId="save-profile-button"
            passwordFieldTestId="volunteer-password-input"
          />
        </FormDialog>
      )}

      {shopperDialogOpen && (
        <FormDialog open onClose={() => setShopperDialogOpen(false)}>
          <DialogCloseButton onClose={() => setShopperDialogOpen(false)} />
          <Stack spacing={2} sx={{ p: 3 }}>
            <Typography variant="h6">Create shopper profile</Typography>
            <TextField
              label="Client ID"
              value={shopperClientId}
              onChange={e => setShopperClientId(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email (optional)"
              type="email"
              value={shopperEmail}
              onChange={e => setShopperEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Phone (optional)"
              type="tel"
              value={shopperPhone}
              onChange={e => setShopperPhone(e.target.value)}
              fullWidth
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={createShopper} variant="contained">
                Create
              </Button>
            </Box>
          </Stack>
        </FormDialog>
      )}

      {removeShopperOpen && (
        <ConfirmDialog
          message={`Remove shopper profile for ${volunteer?.name}?`}
          onConfirm={removeShopper}
          onCancel={() => setRemoveShopperOpen(false)}
        />
      )}

      {deleteDialogOpen && volunteer && (
        <ConfirmDialog
          message={`Delete ${volunteer.name}?`}
          onConfirm={handleDeleteVolunteer}
          onCancel={() => {
            if (deletingVolunteer) return;
            setDeleteDialogOpen(false);
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will permanently remove the volunteer and their online access.
          </Typography>
        </ConfirmDialog>
      )}

      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Page>
  );
}
