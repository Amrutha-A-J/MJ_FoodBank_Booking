import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  ListItemText,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import PageContainer from '../../../components/layout/PageContainer';
import PageCard from '../../../components/layout/PageCard';
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
  type VolunteerBooking,
  type VolunteerRoleWithShifts,
  type VolunteerSearchResult,
  type VolunteerStatsByIdResponse,
} from '../../../api/volunteers';
import { getApiErrorMessage } from '../../../api/helpers';
import { requestPasswordReset } from '../../../api/users';
import { formatLocaleDate } from '../../../utils/date';
import slugify from '../../../utils/slugify';

export default function VolunteerProfile() {
  const { volunteerId } = useParams<{ volunteerId: string }>();
  const navigate = useNavigate();
  const id = Number(volunteerId);

  const [loading, setLoading] = useState(true);
  const [volunteer, setVolunteer] = useState<VolunteerSearchResult | null>(null);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [history, setHistory] = useState<VolunteerBooking[]>([]);
  const [stats, setStats] = useState<VolunteerStatsByIdResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [initialSelected, setInitialSelected] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [shopperOpen, setShopperOpen] = useState(false);
  const [removeShopperOpen, setRemoveShopperOpen] = useState(false);
  const [shopperClientId, setShopperClientId] = useState('');
  const [shopperEmail, setShopperEmail] = useState('');
  const [shopperPhone, setShopperPhone] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [pageError, setPageError] = useState('');

  const hoursFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-CA', {
        maximumFractionDigits: 1,
      }),
    [],
  );

  const formatHours = useCallback(
    (hours: number) => `${hoursFormatter.format(hours)} ${hours === 1 ? 'hour' : 'hours'}`,
    [hoursFormatter],
  );

  const formatShifts = useCallback(
    (count: number) => `${count} ${count === 1 ? 'shift' : 'shifts'}`,
    [],
  );

  const idToName = useMemo(() => {
    const map = new Map<number, string>();
    roles.forEach(r => {
      map.set(r.id, r.name);
    });
    return map;
  }, [roles]);

  const nameToRoleIds = useMemo(() => {
    const map = new Map<string, number[]>();
    roles.forEach(r => {
      const current = map.get(r.name) || [];
      current.push(r.id);
      map.set(r.name, current);
    });
    return map;
  }, [roles]);

  const groupedRoles = useMemo(() => {
    const groups = new Map<string, { id: number; name: string }[]>();
    roles.forEach(role => {
      const group = groups.get(role.category_name) || [];
      if (!group.some(r => r.name === role.name)) {
        group.push({ id: role.id, name: role.name });
      }
      groups.set(role.category_name, group);
    });
    return Array.from(groups.entries()).map(([category, values]) => ({
      category,
      roles: values,
    }));
  }, [roles]);

  const hasRoleChanges = useMemo(() => {
    if (selected.length !== initialSelected.length) return true;
    const next = [...selected].sort();
    const initial = [...initialSelected].sort();
    return next.some((value, index) => value !== initial[index]);
  }, [selected, initialSelected]);

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
    [volunteer],
  );

  const refreshVolunteer = useCallback(
    async (volunteerId: number) => {
      try {
        const updated = await getVolunteerById(volunteerId);
        setVolunteer(updated);
        const names = updated.trainedAreas
          .map(roleId => idToName.get(roleId))
          .filter((name): name is string => Boolean(name));
        setSelected(names);
        setInitialSelected(names);
      } catch (err) {
        setMessage(getApiErrorMessage(err, 'Unable to refresh volunteer'));
        setSeverity('error');
      }
    },
    [idToName],
  );

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setPageError('Volunteer not found.');
      return;
    }

    let active = true;
    setLoading(true);
    setPageError('');

    Promise.all([
      getVolunteerById(id),
      getVolunteerRoles(),
      getVolunteerBookingHistory(id),
    ])
      .then(([volunteerData, rolesData, historyData]) => {
        if (!active) return;
        setVolunteer(volunteerData);
        setRoles(rolesData);
        setHistory(historyData);
        const roleNames = volunteerData.trainedAreas
          .map(roleId => {
            const roleName = rolesData.find(r => r.id === roleId)?.name;
            return roleName;
          })
          .filter((name): name is string => Boolean(name));
        setSelected(roleNames);
        setInitialSelected(roleNames);
      })
      .catch(err => {
        if (!active) return;
        setPageError(getApiErrorMessage(err, 'Unable to load volunteer'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    setStatsLoading(true);
    getVolunteerStatsById(id)
      .then(data => {
        if (!active) return;
        setStats(data);
        setStatsError('');
      })
      .catch(err => {
        if (!active) return;
        setStatsError(getApiErrorMessage(err, 'Unable to load stats'));
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const handleRoleChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelected(typeof value === 'string' ? value.split(',') : value);
  };

  const removeRole = (roleName: string) => {
    setSelected(prev => prev.filter(name => name !== roleName));
  };

  const handleSaveRoles = async () => {
    if (!volunteer || !hasRoleChanges) return;
    setSavingRoles(true);
    try {
      const roleIds = selected.flatMap(name => nameToRoleIds.get(name) || []);
      await updateVolunteerTrainedAreas(volunteer.id, roleIds);
      setInitialSelected(selected);
      setVolunteer(prev => (prev ? { ...prev, trainedAreas: roleIds } : prev));
      setMessage('Volunteer updated');
      setSeverity('success');
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to update volunteer roles'));
      setSeverity('error');
    } finally {
      setSavingRoles(false);
    }
  };

  const saveProfile = useCallback(
    async (
      data: AccountEditFormData,
      { sendResetLink = false, skipRefresh = false }: { sendResetLink?: boolean; skipRefresh?: boolean } = {},
    ) => {
      if (!volunteer) return false;

      const profileChanged =
        data.firstName !== volunteer.firstName ||
        data.lastName !== volunteer.lastName ||
        data.email !== (volunteer.email || '') ||
        data.phone !== (volunteer.phone || '') ||
        data.onlineAccess !== volunteer.hasPassword ||
        (!!data.password && data.password.length > 0);

      if (!profileChanged && !sendResetLink) {
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
        setMessage(getApiErrorMessage(err, 'Unable to update volunteer'));
        setSeverity('error');
        return false;
      } finally {
        setProfileSaving(false);
      }
    },
    [refreshVolunteer, volunteer],
  );

  const handleSendReset = useCallback(
    async (data: AccountEditFormData) => {
      if (!volunteer) return false;
      const saved = await saveProfile(data, {
        sendResetLink: true,
        skipRefresh: true,
      });
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
    },
    [refreshVolunteer, saveProfile, volunteer],
  );

  const handleShopperToggle = (event: ChangeEvent<HTMLInputElement>) => {
    if (!volunteer) return;
    if (event.target.checked) {
      setShopperClientId(volunteer.clientId ? String(volunteer.clientId) : '');
      setShopperEmail(volunteer.email || '');
      setShopperPhone(volunteer.phone || '');
      setShopperOpen(true);
    } else {
      setRemoveShopperOpen(true);
    }
  };

  const createShopper = async () => {
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
      setShopperOpen(false);
      await refreshVolunteer(volunteer.id);
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to create shopper profile'));
      setSeverity('error');
    }
  };

  const removeShopper = async () => {
    if (!volunteer) return;
    try {
      await removeVolunteerShopperProfile(volunteer.id);
      setMessage('Shopper profile removed');
      setSeverity('success');
      setRemoveShopperOpen(false);
      await refreshVolunteer(volunteer.id);
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to remove shopper profile'));
      setSeverity('error');
    }
  };

  const statsContent = useMemo(() => {
    if (statsLoading) {
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} aria-label="Loading volunteer stats" />
          <Typography variant="body2" color="text.secondary">
            Loading stats…
          </Typography>
        </Stack>
      );
    }
    if (statsError) {
      return (
        <Typography variant="body2" color="text.secondary">
          {statsError}
        </Typography>
      );
    }
    if (!stats) {
      return (
        <Typography variant="body2" color="text.secondary">
          No stats available yet.
        </Typography>
      );
    }
    return (
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Typography variant="body2">
            <strong>Month to date:</strong> {formatHours(stats.monthToDate.hours)} ·{' '}
            {formatShifts(stats.monthToDate.shifts)}
          </Typography>
          <Typography variant="body2">
            <strong>Year to date:</strong> {formatHours(stats.yearToDate.hours)} ·{' '}
            {formatShifts(stats.yearToDate.shifts)}
          </Typography>
          <Typography variant="body2">
            <strong>Lifetime:</strong> {formatHours(stats.lifetime.hours)} ·{' '}
            {formatShifts(stats.lifetime.shifts)}
          </Typography>
        </Stack>
        {stats.topRoles && stats.topRoles.length > 0 && (
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Top roles</Typography>
            {stats.topRoles.map(role => (
              <Typography variant="body2" key={role.roleName}>
                {role.roleName} — {formatShifts(role.shifts)} · {formatHours(role.hours)}
              </Typography>
            ))}
          </Stack>
        )}
        {stats.lastCompletedShift && (
          <Typography variant="body2">
            <strong>Last shift:</strong> {stats.lastCompletedShift.roleName} on{' '}
            {formatLocaleDate(stats.lastCompletedShift.date, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            · {formatHours(stats.lastCompletedShift.hours)}
          </Typography>
        )}
      </Stack>
    );
  }, [stats, statsError, statsLoading, formatHours, formatShifts]);

  return (
    <PageContainer>
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : pageError ? (
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="h6">{pageError}</Typography>
          <Button variant="outlined" onClick={() => navigate('/volunteer-management/volunteers')}>
            Back to volunteers
          </Button>
        </Stack>
      ) : volunteer ? (
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Typography variant="h5">{volunteer.name}</Typography>
            <Button variant="outlined" onClick={() => setProfileDialogOpen(true)}>
              Edit Volunteer
            </Button>
          </Stack>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 5 }}>
              <PageCard>
                <Stack spacing={2}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1">Contact</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography data-testid="volunteer-email">
                      {volunteer.email || 'Not provided'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography data-testid="volunteer-phone">
                      {volunteer.phone || 'Not provided'}
                    </Typography>
                  </Stack>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1">Account</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography data-testid="volunteer-online-access">
                        {volunteer.hasPassword ? 'Online access enabled' : 'Online access disabled'}
                      </Typography>
                      {volunteer.hasPassword && (
                        <Chip
                          icon={<CheckCircleOutline fontSize="small" />}
                          label="Online account"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                    <FormControl component="fieldset" variant="standard">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={volunteer.hasShopper}
                            onChange={handleShopperToggle}
                            color="primary"
                            inputProps={{ 'data-testid': 'shopper-toggle' }}
                          />
                        }
                        label="Shopper profile"
                      />
                      <FormHelperText>
                        Enable if this volunteer also shops at the pantry.
                      </FormHelperText>
                    </FormControl>
                  </Stack>
                </Stack>
              </PageCard>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <PageCard>{statsContent}</PageCard>
            </Grid>
          </Grid>
          <PageCard>
            <Stack spacing={2}>
              <Typography variant="h6">Trained roles</Typography>
              <FormControl fullWidth>
                <InputLabel id="volunteer-roles-label">Roles</InputLabel>
                <Select
                  labelId="volunteer-roles-label"
                  multiple
                  value={selected}
                  onChange={handleRoleChange}
                  label="Roles"
                  renderValue={selected =>
                    (selected as string[]).length === 0
                      ? 'Select roles'
                      : `${(selected as string[]).length} selected`
                  }
                  data-testid="roles-select"
                >
                  {groupedRoles.flatMap(group => [
                    <ListSubheader key={`${group.category}-header`}>
                      {group.category}
                    </ListSubheader>,
                    ...group.roles.map(role => (
                      <MenuItem key={role.id} value={role.name}>
                        <ListItemText primary={role.name} />
                      </MenuItem>
                    )),
                  ])}
                </Select>
                {selected.length === 0 && (
                  <FormHelperText>No roles assigned yet</FormHelperText>
                )}
              </FormControl>
              {selected.length > 0 && (
                <Grid
                  container
                  spacing={1}
                  sx={{
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  {selected.map(name => (
                    <Grid key={name} size="auto">
                      <Chip
                        label={name}
                        onDelete={() => removeRole(name)}
                        size="small"
                        data-testid={`role-chip-${slugify(name)}`}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={handleSaveRoles}
                  disabled={!hasRoleChanges || savingRoles}
                  data-testid="save-button"
                >
                  Save
                </Button>
              </Box>
            </Stack>
          </PageCard>
          <PageCard>
            <Stack spacing={2}>
              <Typography variant="h6">Booking history</Typography>
              <BookingHistoryTable rows={history} showRole />
            </Stack>
          </PageCard>
        </Stack>
      ) : null}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
      {volunteer && (
        <FormDialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)}>
          <DialogCloseButton onClose={() => setProfileDialogOpen(false)} />
          <Typography component="h2" variant="h6" sx={{ px: 3, pt: 3 }}>
            Edit Volunteer
          </Typography>
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
      {shopperOpen && volunteer && (
        <FormDialog open onClose={() => setShopperOpen(false)}>
          <DialogCloseButton onClose={() => setShopperOpen(false)} />
          <Stack spacing={2} sx={{ p: 3 }}>
            <Typography variant="h6">Create shopper profile</Typography>
            <TextField
              label="Client ID"
              value={shopperClientId}
              onChange={event => setShopperClientId(event.target.value)}
              fullWidth
            />
            <TextField
              label="Email (optional)"
              type="email"
              value={shopperEmail}
              onChange={event => setShopperEmail(event.target.value)}
              fullWidth
            />
            <TextField
              label="Phone (optional)"
              type="tel"
              value={shopperPhone}
              onChange={event => setShopperPhone(event.target.value)}
              fullWidth
            />
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button onClick={() => setShopperOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={createShopper}>
                Create
              </Button>
            </Box>
          </Stack>
        </FormDialog>
      )}
      {removeShopperOpen && volunteer && (
        <ConfirmDialog
          message={`Remove shopper profile for ${volunteer.name}?`}
          onConfirm={removeShopper}
          onCancel={() => setRemoveShopperOpen(false)}
        />
      )}
    </PageContainer>
  );
}
