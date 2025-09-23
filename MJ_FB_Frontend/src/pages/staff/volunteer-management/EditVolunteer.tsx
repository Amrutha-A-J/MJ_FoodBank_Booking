import { useEffect, useState, useMemo } from 'react';
import EntitySearch from '../../../components/EntitySearch';
import {
  getVolunteerRoles,
  updateVolunteerTrainedAreas,
  getVolunteerById,
  updateVolunteer,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  getVolunteerBookingHistory,
  type VolunteerSearchResult,
} from '../../../api/volunteers';
import { requestPasswordReset } from '../../../api/users';
import { getApiErrorMessage } from '../../../api/helpers';
import type { VolunteerRoleWithShifts, VolunteerBooking } from '../../../types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  DialogActions,
  DialogContent,
  DialogTitle,
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import slugify from '../../../utils/slugify';
import type { SelectChangeEvent } from '@mui/material/Select';
import BookingHistoryTable from '../../../components/BookingHistoryTable';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import ConfirmDialog from '../../../components/ConfirmDialog';
import DialogCloseButton from '../../../components/DialogCloseButton';
import FormDialog from '../../../components/FormDialog';
import AccountEditForm, {
  type AccountEditFormData,
} from '../../../components/account/AccountEditForm';

export default function EditVolunteer() {
  const [volunteer, setVolunteer] =
    useState<VolunteerSearchResult | null>(null);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [initialSelected, setInitialSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [hasShopper, setHasShopper] = useState(false);
  const [shopperOpen, setShopperOpen] = useState(false);
  const [shopperClientId, setShopperClientId] = useState('');
  const [shopperEmail, setShopperEmail] = useState('');
  const [shopperPhone, setShopperPhone] = useState('');
  const [removeShopperOpen, setRemoveShopperOpen] = useState(false);
  const [history, setHistory] = useState<VolunteerBooking[]>([]);
  const [expanded, setExpanded] =
    useState<'profile' | 'roles' | 'history' | false>('profile');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  function ProfileDetail({
    label,
    value,
    testId,
  }: {
    label: string;
    value: string;
    testId: string;
  }) {
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

  useEffect(() => {
    getVolunteerRoles()
      .then(r => setRoles(r))
      .catch(() => setRoles([]));
  }, []);

  const groupedRoles = useMemo(() => {
    const groups = new Map<string, { id: number; name: string }[]>();
    roles.forEach(r => {
      const arr = groups.get(r.category_name) || [];
      if (!arr.some(a => a.name === r.name)) {
        arr.push({ id: r.id, name: r.name });
      }
      groups.set(r.category_name, arr);
    });
    return Array.from(groups.entries()).map(([category, roles]) => ({
      category,
      roles,
    }));
  }, [roles]);

  const nameToRoleIds = useMemo(() => {
    const map = new Map<string, number[]>();
    roles.forEach(r => {
      const arr = map.get(r.name) || [];
      arr.push(r.id);
      map.set(r.name, arr);
    });
    return map;
  }, [roles]);

  const idToName = useMemo(() => {
    const map = new Map<number, string>();
    roles.forEach(r => {
      map.set(r.id, r.name);
    });
    return map;
  }, [roles]);

  function handleSelect(v: VolunteerSearchResult) {
    setVolunteer(v);
    setHasShopper(v.hasShopper);
    setProfileDialogOpen(false);
    const names = v.trainedAreas
      .map(id => idToName.get(id))
      .filter((n): n is string => !!n);
    setSelected(names);
    setInitialSelected(names);
    getVolunteerBookingHistory(v.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  function handleRoleChange(e: SelectChangeEvent<string[]>) {
    const value = e.target.value;
    setSelected(typeof value === 'string' ? value.split(',') : value);
  }

  function removeRole(name: string) {
    setSelected(prev => prev.filter(n => n !== name));
  }

  const hasChanges = useMemo(() => {
    if (selected.length !== initialSelected.length) return true;
    const a = [...selected].sort();
    const b = [...initialSelected].sort();
    return a.some((v, i) => v !== b[i]);
  }, [selected, initialSelected]);

  async function handleSave() {
    if (!volunteer || !hasChanges) return;
    setSaving(true);
    try {
      const roleIds = selected.flatMap(name => nameToRoleIds.get(name) || []);
      await updateVolunteerTrainedAreas(volunteer.id, roleIds);
      setInitialSelected(selected);
      setMessage('Volunteer updated');
      setSeverity('success');
    } catch (err: unknown) {
      setMessage(getApiErrorMessage(err, 'Unable to update volunteer'));
      setSeverity('error');
    } finally {
      setSaving(false);
    }
  }

  interface SaveProfileOptions {
    sendResetLink?: boolean;
    skipRefresh?: boolean;
  }

  async function saveProfile(
    data: AccountEditFormData,
    {
      sendResetLink = false,
      skipRefresh = false,
    }: SaveProfileOptions = {},
  ): Promise<boolean> {
    if (!volunteer) return false;

    const profileChanged =
      data.firstName !== volunteer.firstName ||
      data.lastName !== volunteer.lastName ||
      data.email !== (volunteer.email || '') ||
      data.phone !== (volunteer.phone || '') ||
      data.onlineAccess !== volunteer.hasPassword ||
      (!!data.password && data.password.length > 0);

    if (!profileChanged && !sendResetLink) return false;

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
    } catch (err: unknown) {
      setMessage(getApiErrorMessage(err, 'Unable to update volunteer'));
      setSeverity('error');
      return false;
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSendReset(data: AccountEditFormData): Promise<boolean> {
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
    } catch (err: unknown) {
      setMessage(
        getApiErrorMessage(err, 'Unable to send password reset link'),
      );
      setSeverity('error');
    } finally {
      await refreshVolunteer(volunteer.id);
    }
    return true;
  }

  async function refreshVolunteer(id: number) {
    try {
      const v = await getVolunteerById(id);
      setVolunteer(v);
      const names = v.trainedAreas
        .map(rid => idToName.get(rid))
        .filter((n): n is string => !!n);
      setSelected(names);
      setHasShopper(v.hasShopper);
    } catch {}
  }

  function handleShopperToggle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!volunteer) return;
    if (e.target.checked) {
      setShopperOpen(true);
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
      setShopperOpen(false);
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

  return (
    <>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Typography variant="h5">Edit Volunteer</Typography>
          <Stack spacing={2}>
            <EntitySearch
              type="volunteer"
              placeholder="Search volunteer"
              onSelect={v => handleSelect(v as VolunteerSearchResult)}
            />
            {volunteer ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6">
                  {volunteer.name}
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
                {hasShopper && <Chip label="Shopper profile" size="small" />}
              </Stack>
            ) : (
              <FormHelperText>Search and select a volunteer</FormHelperText>
            )}
          </Stack>
          {volunteer && (
            <>
              <Accordion
                expanded={expanded === 'profile'}
                onChange={(_, isExpanded) =>
                  setExpanded(isExpanded ? 'profile' : false)
                }
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Profile</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
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
                        label="Shopper Profile"
                      />
                      <FormHelperText>
                        Enable if this volunteer also shops at the pantry.
                      </FormHelperText>
                    </FormControl>
                    {volunteer && (
                      <Stack spacing={3}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle1">Profile</Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography
                              variant="h6"
                              data-testid="volunteer-name"
                            >
                              {`${volunteer.firstName} ${volunteer.lastName}`.trim() ||
                                volunteer.name}
                            </Typography>
                            {volunteer.hasPassword && (
                              <Chip
                                color="success"
                                icon={<CheckCircleOutline />}
                                label="Online account"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Stack>
                        <Stack spacing={2}>
                          <ProfileDetail
                            label="Email"
                            value={volunteer.email || 'Not provided'}
                            testId="volunteer-email"
                          />
                          <ProfileDetail
                            label="Phone"
                            value={volunteer.phone || 'Not provided'}
                            testId="volunteer-phone"
                          />
                          <ProfileDetail
                            label="Online Access"
                            value={volunteer.hasPassword ? 'Enabled' : 'Disabled'}
                            testId="volunteer-online-access"
                          />
                        </Stack>
                        <Button
                          variant="outlined"
                          onClick={() => setProfileDialogOpen(true)}
                          sx={{ alignSelf: { sm: 'flex-start' } }}
                        >
                          Edit Profile
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
              <Accordion
                expanded={expanded === 'roles'}
                onChange={(_, isExpanded) =>
                  setExpanded(isExpanded ? 'roles' : false)
                }
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Roles</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControl fullWidth>
                    <InputLabel id="role-select-label">Roles</InputLabel>
                    <Select
                      labelId="role-select-label"
                      aria-labelledby="role-select-label"
                      multiple
                      value={selected}
                      onChange={handleRoleChange}
                      renderValue={() => 'Select roles'}
                      label="Select roles"
                      data-testid="roles-select"
                    >
                      {groupedRoles.flatMap(g => [
                        <ListSubheader key={`${g.category}-header`}>
                          {g.category}
                        </ListSubheader>,
                        ...g.roles.map(r => (
                          <MenuItem key={r.id} value={r.name}>
                            <Checkbox checked={selected.includes(r.name)} />
                            <ListItemText primary={r.name} />
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                    {selected.length === 0 && (
                      <FormHelperText>No roles assigned yet</FormHelperText>
                    )}
                  </FormControl>
                  <Grid
                    container
                    spacing={1}
                    sx={{ mt: 2, bgcolor: 'background.default', p: 1, borderRadius: 1 }}
                  >
                    {selected.map(name => (
                      <Grid key={name} size="auto">
                        <Chip
                          label={name}
                          variant="outlined"
                          size="medium"
                          onDelete={() => removeRole(name)}
                          data-testid={`role-chip-${slugify(name)}`}
                          sx={{ maxWidth: 200 }}
                          title={name}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
              <Accordion
                expanded={expanded === 'history'}
                onChange={(_, isExpanded) =>
                  setExpanded(isExpanded ? 'history' : false)
                }
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>History</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <BookingHistoryTable rows={history} showRole />
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </Stack>
      </Container>
      {volunteer && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            py: 2,
            mt: 3,
          }}
        >
          <Container maxWidth="md">
            <Button
              variant="contained"
              fullWidth
              aria-label="Save volunteer changes"
              data-testid="save-button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Save
            </Button>
          </Container>
        </Box>
      )}
      {volunteer && (
        <FormDialog
          open={profileDialogOpen}
          onClose={() => setProfileDialogOpen(false)}
        >
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
      {shopperOpen && (
        <FormDialog open onClose={() => setShopperOpen(false)}>
          <DialogCloseButton onClose={() => setShopperOpen(false)} />
          <DialogContent>
            <TextField
              label="Client ID"
              value={shopperClientId}
              onChange={e => setShopperClientId(e.target.value)}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Email (optional)"
              type="email"
              value={shopperEmail}
              onChange={e => setShopperEmail(e.target.value)}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Phone (optional)"
              type="tel"
              value={shopperPhone}
              onChange={e => setShopperPhone(e.target.value)}
              fullWidth
              margin="dense"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={createShopper} variant="contained" color="primary">
              Create
            </Button>
          </DialogActions>
        </FormDialog>
      )}
      {removeShopperOpen && (
        <ConfirmDialog
          message={`Remove shopper profile for ${volunteer?.name}?`}
          onConfirm={removeShopper}
          onCancel={() => setRemoveShopperOpen(false)}
        />
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </>
  );
}
