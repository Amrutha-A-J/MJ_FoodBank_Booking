import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  getVolunteerRoles,
  getVolunteerBookingsByRole,
  cancelRecurringVolunteerBooking,
  searchVolunteers,
  getVolunteerBookingHistory,
  createVolunteer,
  updateVolunteerTrainedAreas,
  createVolunteerBookingForVolunteer,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
} from '../../api/volunteers';
import type { VolunteerBookingDetail } from '../../types';
import { formatTime } from '../../utils/time';
import VolunteerScheduleTable from '../../components/VolunteerScheduleTable';
import { fromZonedTime } from 'date-fns-tz';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormCard from '../../components/FormCard';
import ManageVolunteerShiftDialog from '../../components/ManageVolunteerShiftDialog';
import DialogCloseButton from '../../components/DialogCloseButton';
import PageCard from '../../components/layout/PageCard';
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Checkbox,
  FormControlLabel,
  Switch,
  Dialog,
  DialogActions,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
  useTheme,
  Stack,
  Box,
  Chip,
  CircularProgress,
} from '@mui/material';
import { lighten } from '@mui/material/styles';
const Dashboard = React.lazy(
  () => import('../../components/dashboard/Dashboard')
);
import EntitySearch from '../../components/EntitySearch';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate, addDays } from '../../utils/date';
import Page from '../../components/Page';
import { useTranslation } from 'react-i18next';




interface RoleOption {
  id: number; // unique slot id
  role_id: number; // underlying role id
  category_id: number; // category identifier
  category_name: string; // category display name
  name: string;
  start_time?: string;
  end_time?: string;
  startTime?: string;
  endTime?: string;
  max_volunteers: number;
}

interface VolunteerResult {
  id: number;
  name: string;
  trainedAreas: number[];
  hasShopper: boolean;
}

interface VolunteerManagementProps {
  initialTab?: 'dashboard' | 'schedule' | 'search' | 'create';
}

export default function VolunteerManagement({ initialTab }: VolunteerManagementProps = {}) {
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const tab: 'dashboard' | 'schedule' | 'search' | 'create' =
    initialTab ??
    (tabParam === 'schedule' ||
    tabParam === 'search' ||
    tabParam === 'create'
      ? (tabParam as 'schedule' | 'search' | 'create')
      : 'dashboard');
  const tabTitles: Record<typeof tab, string> = {
    dashboard: t('dashboard'),
    schedule: 'Schedule',
    search: 'Search Volunteer',
    create: 'Create Volunteer',
  };
  const title = tabTitles[tab];
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [bookings, setBookings] = useState<VolunteerBookingDetail[]>([]);
  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerResult | null>(null);
  const [trainedEdit, setTrainedEdit] = useState<string[]>([]);
  const [newTrainedRole, setNewTrainedRole] = useState('');
  const [editMsg, setEditMsg] = useState('');
  const [editSeverity, setEditSeverity] = useState<'success' | 'error'>('success');
  const [history, setHistory] = useState<VolunteerBookingDetail[]>([]);

  const cellSx = { border: 1, borderColor: 'divider', p: 0.5 } as const;

  const theme = useTheme();
  const approvedColor = lighten(theme.palette.success.light, 0.4);
  const statusColors: Record<string, string> = {
    approved: approvedColor,
    no_show: 'rgb(255, 200, 200)',
    completed: 'rgb(111,146,113)',
  };

  useEffect(() => {
    if (tab !== 'search') {
      setSelectedVolunteer(null);
      setSearchParams({});
    }
  }, [tab, setSearchParams]);

  const [shopperOpen, setShopperOpen] = useState(false);
  const [shopperClientId, setShopperClientId] = useState('');
  const [shopperEmail, setShopperEmail] = useState('');
  const [shopperPhone, setShopperPhone] = useState('');
  const [removeShopperOpen, setRemoveShopperOpen] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [onlineAccess, setOnlineAccess] = useState(false);
  const [selectedCreateRoles, setSelectedCreateRoles] = useState<string[]>([]);
  const [createMsg, setCreateMsg] = useState('');
  const [createSeverity, setCreateSeverity] = useState<'success' | 'error'>('success');

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function toggleCreateRole(name: string, checked: boolean) {
    setSelectedCreateRoles(prev =>
      checked ? [...prev, name] : prev.filter(r => r !== name)
    );
  }

  const [assignSlot, setAssignSlot] = useState<RoleOption | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignResults, setAssignResults] = useState<VolunteerResult[]>([]);
  const [assignMsg, setAssignMsg] = useState('');
  const [confirmAssign, setConfirmAssign] = useState<VolunteerResult | null>(null);
  const [manageShift, setManageShift] =
    useState<VolunteerBookingDetail | null>(null);
  const [cancelRecurringBooking, setCancelRecurringBooking] =
    useState<VolunteerBookingDetail | null>(null);

  const reginaTimeZone = 'America/Regina';
  const [currentDate, setCurrentDate] = useState(() => {
    const todayStr = formatDate();
    return fromZonedTime(`${todayStr}T00:00:00`, reginaTimeZone);
  });

  function changeDay(delta: number) {
    setCurrentDate(d => addDays(d, delta));
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    getVolunteerRoles()
      .then(data => {
        const flattened: RoleOption[] = data.flatMap(r =>
          r.shifts.map(s => ({
            id: s.id,
            role_id: r.id,
            category_id: r.category_id,
            category_name: r.category_name,
            name: r.name,
            start_time: s.start_time,
            end_time: s.end_time,
            max_volunteers: r.max_volunteers,
          })),
        );
        setRoles(flattened);
      })
      .catch(() => {});
  }, []);

  const groupedRoles = useMemo(() => {
    const groups = new Map<string, { name: string; category_id: number }[]>();
    roles.forEach(r => {
      const arr = groups.get(r.category_name) || [];
      if (!arr.some(a => a.name === r.name)) {
        arr.push({ name: r.name, category_id: r.category_id });
      }
      groups.set(r.category_name, arr);
    });
    return Array.from(groups.entries()).map(([category, roles]) => ({ category, roles }));
  }, [roles]);

  const nameToSlotIds = useMemo(() => {
    const map = new Map<string, number[]>();
    roles.forEach(r => {
      const arr = map.get(r.name) || [];
      arr.push(r.id);
      map.set(r.name, arr);
    });
    return map;
  }, [roles]);

  const nameToRoleIds = useMemo(() => {
    const map = new Map<string, number[]>();
    roles.forEach(r => {
      const arr = map.get(r.name) || [];
      arr.push(r.role_id);
      map.set(r.name, arr);
    });
    return map;
  }, [roles]);

  const idToName = useMemo(() => {
    const map = new Map<number, string>();
    roles.forEach(r => {
      map.set(r.role_id, r.name);
    });
    return map;
  }, [roles]);

  const scheduleRoleItems = useMemo(
    () =>
      groupedRoles.flatMap(g => [
        <ListSubheader key={`${g.category}-header`}>{g.category}</ListSubheader>,
        ...g.roles.map(r => (
          <MenuItem key={r.name} value={r.name}>
            {r.name}
          </MenuItem>
        )),
      ]),
    [groupedRoles]
  );

  const selectedRoleNames = selectedCreateRoles.join(', ');

  useEffect(() => {
    if (selectedRole && tab === 'schedule') {
      const ids = nameToSlotIds.get(selectedRole) || [];
    Promise.all(ids.map(id => getVolunteerBookingsByRole(id)))
        .then(data => {
          setBookings(data.flat());
        })
        .catch(() => {});
    } else if (!selectedRole) {
      setBookings([]);
    }
  }, [selectedRole, tab, nameToSlotIds]);

  // volunteer search handled via EntitySearch component


  useEffect(() => {
    if (tab !== 'search') return;
    if (selectedVolunteer) return;
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    if (id && name) {
      selectVolunteer({ id: Number(id), name, trainedAreas: [], hasShopper: false });
    }
  }, [tab, searchParams, selectedVolunteer]);

  async function cancelRecurring(id: number) {
    try {
      await cancelRecurringVolunteerBooking(id);
      setSnackbarSeverity('success');
      setMessage('Upcoming bookings cancelled');
      if (selectedVolunteer) {
        const data = await getVolunteerBookingHistory(selectedVolunteer.id);
        setHistory(data);
      }
      if (selectedRole) {
        const ids = nameToSlotIds.get(selectedRole) || [];
        const data = await Promise.all(ids.map(rid => getVolunteerBookingsByRole(rid)));
        setBookings(data.flat());
      }
    } catch (e) {
      setSnackbarSeverity('error');
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleManageUpdated(
    msg: string,
    severity: 'success' | 'error' | 'info' | 'warning',
  ) {
    setSnackbarSeverity(severity);
    setMessage(msg);
    if (selectedRole) {
      try {
        const ids = nameToSlotIds.get(selectedRole) || [];
        const data = await Promise.all(
          ids.map(rid => getVolunteerBookingsByRole(rid)),
        );
        setBookings(data.flat());
      } catch {
        // ignore
      }
    }
    if (selectedVolunteer) {
      try {
        const data = await getVolunteerBookingHistory(selectedVolunteer.id);
        setHistory(data);
      } catch {
        // ignore
      }
    }
  }

  async function loadVolunteer(id: number, name: string): Promise<VolunteerResult> {
    try {
      const res = await searchVolunteers(name);
      const found = res.find((v: VolunteerResult) => v.id === id);
      if (found) return found;
    } catch {
      // ignore
    }
    return { id, name, trainedAreas: [], hasShopper: false };
  }

  async function refreshVolunteer() {
    if (!selectedVolunteer) return;
    const vol = await loadVolunteer(selectedVolunteer.id, selectedVolunteer.name);
    setSelectedVolunteer(vol);
    setTrainedEdit(
      Array.from(
        new Set(
          (vol.trainedAreas || [])
            .map(id => idToName.get(id))
            .filter(Boolean) as string[]
        )
      )
    );
  }

  async function selectVolunteer(u: VolunteerResult) {
    const vol = await loadVolunteer(u.id, u.name);
    setSelectedVolunteer(vol);
    setTrainedEdit(
      Array.from(
        new Set(
          (vol.trainedAreas || [])
            .map(id => idToName.get(id))
            .filter(Boolean) as string[]
        )
      )
    );
    try {
      const data = await getVolunteerBookingHistory(vol.id);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }

  function toggleTrained(name: string, checked: boolean) {
    setTrainedEdit(prev =>
      checked ? [...prev, name] : prev.filter(t => t !== name)
    );
  }


  function assignVolunteer(vol: VolunteerResult) {
    if (!assignSlot || !selectedRole) return;
    if (!vol.trainedAreas.includes(assignSlot.role_id)) {
      setConfirmAssign(vol);
      return;
    }
    completeAssignment(vol, false);
  }

  async function completeAssignment(
    vol: VolunteerResult,
    addTraining: boolean,
  ) {
    if (!assignSlot || !selectedRole) return;
    const slotBookings = bookingsForDate.filter(
      b => b.role_id === assignSlot.id,
    );
    if (slotBookings.some(b => b.volunteer_id === vol.id)) {
      setAssignMsg('Volunteer already booked for this shift');
      return;
    }
    try {
      setAssignMsg('');
      if (addTraining) {
        const newRoles = Array.from(
          new Set([...vol.trainedAreas, assignSlot.role_id]),
        );
        await updateVolunteerTrainedAreas(vol.id, newRoles);
      }
      try {
        await createVolunteerBookingForVolunteer(
          vol.id,
          assignSlot.id,
          formatDate(currentDate),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'Role is full' &&
            window.confirm('Role is full. Force booking and increase capacity?')) {
          await createVolunteerBookingForVolunteer(
            vol.id,
            assignSlot.id,
            formatDate(currentDate),
            true,
          );
        } else {
          throw err;
        }
      }
      setAssignSlot(null);
      setAssignSearch('');
      setAssignResults([]);
      const ids = nameToSlotIds.get(selectedRole) || [];
      const data = await Promise.all(
        ids.map(id => getVolunteerBookingsByRole(id)),
      );
      setBookings(data.flat());
    } catch (e) {
      setAssignMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveTrainedAreas() {
    if (!selectedVolunteer) return;
    if (trainedEdit.length === 0) {
      setEditSeverity('error');
      setEditMsg('Select at least one role');
      return;
    }
    try {
      const ids = Array.from(
        new Set(trainedEdit.flatMap(name => nameToRoleIds.get(name) || []))
      );
      await updateVolunteerTrainedAreas(selectedVolunteer.id, ids);
      setEditSeverity('success');
      setEditMsg('Roles updated');
    } catch (e) {
      setEditSeverity('error');
      setEditMsg(e instanceof Error ? e.message : String(e));
    }
  }

  function handleShopperToggle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedVolunteer) return;
    if (e.target.checked) {
      setShopperOpen(true);
    } else {
      setRemoveShopperOpen(true);
    }
  }

  async function createShopper() {
    if (!selectedVolunteer) return;
    try {
      await createVolunteerShopperProfile(
        selectedVolunteer.id,
        shopperClientId,
        shopperEmail || undefined,
        shopperPhone || undefined,
      );
      setEditSeverity('success');
      setEditMsg('Shopper profile created');
      setShopperOpen(false);
      setShopperClientId('');
      setShopperEmail('');
      setShopperPhone('');
      await refreshVolunteer();
    } catch (e) {
      setEditSeverity('error');
      setEditMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function removeShopper() {
    if (!selectedVolunteer) return;
    try {
      await removeVolunteerShopperProfile(selectedVolunteer.id);
      setEditSeverity('success');
      setEditMsg('Shopper profile removed');
      setRemoveShopperOpen(false);
      await refreshVolunteer();
    } catch (e) {
      setEditSeverity('error');
      setEditMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function submitVolunteer() {
    if (
      !firstName ||
      !lastName ||
      selectedCreateRoles.length === 0
    ) {
      setCreateSeverity('error');
      setCreateMsg('First name, last name and at least one role required');
      return;
    }
    if (onlineAccess && !email) {
      setCreateSeverity('error');
      setCreateMsg('Email required for online access');
      return;
    }
    try {
      const ids = Array.from(
        new Set(
          selectedCreateRoles.flatMap(name => nameToRoleIds.get(name) || [])
        )
      );
      await createVolunteer(
        firstName,
        lastName,
        ids,
        onlineAccess,
        email || undefined,
        phone || undefined
      );
      setCreateSeverity('success');
      setCreateMsg('Volunteer created');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setOnlineAccess(false);
      setSelectedCreateRoles([]);
    } catch (e) {
      setCreateSeverity('error');
      setCreateMsg(e instanceof Error ? e.message : String(e));
    }
  }

  const roleInfos = roles.filter(r => r.name === selectedRole);

  useEffect(() => {
    if (!assignSlot || assignSearch.length < 3) {
      setAssignResults([]);
      return;
    }
    const delay = setTimeout(() => {
      searchVolunteers(assignSearch)
        .then((data: VolunteerResult[]) => {
          const sorted = data
            .sort(
              (a, b) =>
                Number(b.trainedAreas.includes(assignSlot.role_id)) -
                Number(a.trainedAreas.includes(assignSlot.role_id)),
            )
            .slice(0, 5);
          setAssignResults(sorted);
        })
        .catch(() => setAssignResults([]));
    }, 300);
    return () => clearTimeout(delay);
  }, [assignSearch, assignSlot]);

  const bookingsForDate = bookings.filter(b => {
    const bookingDate = formatDate(b.date);
    return (
      bookingDate === formatDate(currentDate) &&
      b.status.toLowerCase() !== 'cancelled'
    );
  });
  const rows = selectedRole
    ? roleInfos.map(role => {
        const slotBookings = bookingsForDate.filter(
          b => b.role_id === role.id
        );
        return {
          time: `${formatTime(role.start_time || '')} - ${formatTime(role.end_time || '')}`,
          cells: Array.from({ length: role.max_volunteers }).map((_, i) => {
            const booking = slotBookings[i];
            return {
              content: booking ? booking.volunteer_name : 'Available',
              backgroundColor: booking
                ? statusColors[booking.status] || approvedColor
                : undefined,
              onClick: () => {
                if (booking) {
                  setManageShift(booking);
                } else {
                  setAssignSlot(role);
                  setAssignSearch('');
                  setAssignResults([]);
                  setAssignMsg('');
                }
              },
            };
          }),
        };
      })
    : [];
  const maxSlots = Math.max(0, ...roleInfos.map(r => r.max_volunteers));

  return (
    <Page title={title}>
      {tab === 'dashboard' && (
        <Suspense fallback={<CircularProgress />}>
          <Dashboard
            role="staff"
            masterRoleFilter={undefined}
            showPantryQuickLinks={false}
          />
        </Suspense>
      )}
      {tab === 'schedule' && (
        <div>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="schedule-role-label">Role</InputLabel>
            <Select
              labelId="schedule-role-label"
              value={selectedRole}
              label="Role"
              onChange={e => setSelectedRole(e.target.value as string)}
            >
              <MenuItem value="">Select role</MenuItem>
              {scheduleRoleItems}
            </Select>
          </FormControl>
          {selectedRole && roleInfos.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <Button onClick={() => changeDay(-1)} variant="outlined" color="primary">Previous</Button>
                <h3>{formatDate(currentDate)}</h3>
                <Button onClick={() => changeDay(1)} variant="outlined" color="primary">Next</Button>
              </div>
              <VolunteerScheduleTable
                maxSlots={maxSlots}
                rows={rows}
              />
            </>
          ) : (
            <p style={{ marginTop: 16 }}>Select a role to view schedule.</p>
          )}
        </div>
      )}

      {tab === 'search' && (
        <>
          <EntitySearch
            type="volunteer"
            placeholder="Search volunteers"
            onSelect={selectVolunteer}
          />
          {selectedVolunteer && (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              mt={2}
            >
              <Box sx={{ width: { xs: 1, md: '33%' } }}>
                <Stack spacing={2} sx={{ width: 1 }}>
                  <PageCard sx={{ width: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Profile
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={selectedVolunteer.hasShopper}
                          onChange={handleShopperToggle}
                          color="primary"
                        />
                      }
                      label="Shopper Profile"
                    />
                  </PageCard>
                  <PageCard sx={{ width: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Roles
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      mb={1}
                      sx={{ width: 1, flexWrap: 'wrap', overflow: 'hidden' }}
                    >
                      {trainedEdit.map(r => (
                        <Chip
                          key={r}
                          label={r}
                          onDelete={() => toggleTrained(r, false)}
                        />
                      ))}
                    </Stack>
                    <FormControl size="small" sx={{ mb: 2, minWidth: 200 }}>
                      <InputLabel id="add-role-label">Add role</InputLabel>
                      <Select
                        labelId="add-role-label"
                        value={newTrainedRole}
                        label="Add role"
                        onChange={e => {
                          const val = e.target.value as string;
                          toggleTrained(val, true);
                          setNewTrainedRole('');
                        }}
                      >
                        {groupedRoles.flatMap(g => [
                          <ListSubheader key={`${g.category}-header`}>
                            {g.category}
                          </ListSubheader>,
                          ...g.roles.map(r => (
                            <MenuItem key={r.name} value={r.name}>
                              {r.name}
                            </MenuItem>
                          )),
                        ])}
                      </Select>
                    </FormControl>
                    <Button variant="contained" size="small" onClick={saveTrainedAreas}>
                      Save
                    </Button>
                    {editMsg && (
                      <Typography
                        variant="body2"
                        mt={1}
                        color={editSeverity === 'error' ? 'error' : 'success.main'}
                      >
                        {editMsg}
                      </Typography>
                    )}
                  </PageCard>
                </Stack>
              </Box>
              <Box sx={{ width: { xs: 1, md: '67%' } }}>
                <PageCard sx={{ width: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {t('booking_history')}
                  </Typography>
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={cellSx}>{t('role')}</TableCell>
                          <TableCell sx={cellSx}>{t('date')}</TableCell>
                          <TableCell sx={cellSx}>{t('time')}</TableCell>
                          <TableCell sx={cellSx}>{t('status')}</TableCell>
                          <TableCell sx={cellSx} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.map(h => (
                          <TableRow key={h.id}>
                            <TableCell sx={cellSx}>{h.role_name}</TableCell>
                            <TableCell sx={cellSx}>{h.date}</TableCell>
                            <TableCell sx={cellSx}>
                              {formatTime(h.start_time || '')} -
                              {formatTime(h.end_time || '')}
                            </TableCell>
                            <TableCell sx={cellSx}>{t(h.status)}</TableCell>
                            <TableCell sx={cellSx}>
                              {h.status === 'approved' && (
                                <>
                                  <Button
                                    onClick={() => setManageShift(h)}
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                  >
                                    {t('manage')}
                                  </Button>
                                  {h.recurring_id && (
                                    <>
                                      {' '}
                                      <Button
                                        onClick={() => setCancelRecurringBooking(h)}
                                        variant="outlined"
                                        color="primary"
                                        size="small"
                                      >
                                        {t('cancel_all_upcoming_short')}
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {history.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ textAlign: 'center', p: 1 }}>
                              {t('no_bookings')}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </PageCard>
              </Box>
            </Stack>
          )}
        </>
      )}

      {tab === 'create' && (
        <>
          <FormCard
            title="Create Volunteer"
            centered={false}
            onSubmit={e => {
              e.preventDefault();
              submitVolunteer();
            }}
            actions={
              <Button type="submit" variant="contained" color="primary" fullWidth>
                Add Volunteer
              </Button>
            }
          >
            <TextField
              label="First Name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Last Name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              size="small"
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={onlineAccess}
                  onChange={e => setOnlineAccess(e.target.checked)}
                />
              }
              label="Online Access"
            />
            {onlineAccess && (
              <Typography variant="body2" color="text.secondary">
                An email invitation will be sent.
              </Typography>
            )}
            <TextField
              label={onlineAccess ? 'Email' : 'Email (optional)'}
              type="email"
              required={onlineAccess}
              value={email}
              onChange={e => setEmail(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Phone (optional)"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              size="small"
              fullWidth
            />
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <label>Role: </label>
              <Button type="button" onClick={() => setRoleDropdownOpen(o => !o)} variant="outlined" color="primary">
                {selectedRoleNames || 'Select roles'}
              </Button>
              {roleDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    background: 'white',
                    border: '1px solid #ccc',
                    padding: 8,
                    zIndex: 1,
                    maxHeight: 200,
                    overflowY: 'auto',
                    marginTop: 4,
                  }}
                >
                  {groupedRoles.map(g => (
                    <div key={g.category} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 'bold' }}>{g.category}</div>
                      {g.roles.map(r => (
                        <FormControlLabel
                          key={r.name}
                          control={
                            <Checkbox
                              value={r.name}
                              checked={selectedCreateRoles.includes(r.name)}
                              onChange={e => toggleCreateRole(r.name, e.target.checked)}
                            />
                          }
                          label={r.name}
                          sx={{ width: '100%', m: 0 }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormCard>
          <FeedbackSnackbar
            open={!!createMsg}
            onClose={() => setCreateMsg('')}
            message={createMsg}
            severity={createSeverity}
          />
        </>
      )}
        {shopperOpen && (
          <Dialog open onClose={() => setShopperOpen(false)}>
            <DialogCloseButton onClose={() => setShopperOpen(false)} />
            <DialogContent>
            <TextField
              label="Client ID"
              value={shopperClientId}
              onChange={e => setShopperClientId(e.target.value)}
              fullWidth
              size="small"
              margin="dense"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              An email invitation will be sent.
            </Typography>
            <TextField
              label="Email (optional)"
              type="email"
              value={shopperEmail}
              onChange={e => setShopperEmail(e.target.value)}
              fullWidth
              size="small"
              margin="dense"
            />
            <TextField
              label="Phone (optional)"
              type="tel"
              value={shopperPhone}
              onChange={e => setShopperPhone(e.target.value)}
              fullWidth
              size="small"
              margin="dense"
            />
          </DialogContent>
            <DialogActions>
              <Button onClick={createShopper} variant="contained" color="primary" size="small">
                Create
              </Button>
            </DialogActions>
          </Dialog>
        )}

      {removeShopperOpen && (
        <ConfirmDialog
          message={`Remove shopper profile for ${selectedVolunteer?.name}?`}
          onConfirm={removeShopper}
          onCancel={() => setRemoveShopperOpen(false)}
        />
      )}

      {confirmAssign && assignSlot && (
        <ConfirmDialog
          message={`${confirmAssign.name} is not trained in ${assignSlot.category_name}-${assignSlot.name}. Confirm assigning this volunteer to this role?`}
          onConfirm={() => {
            completeAssignment(confirmAssign, true);
            setConfirmAssign(null);
          }}
          onCancel={() => setConfirmAssign(null)}
        />
      )}

      {cancelRecurringBooking && (
        <ConfirmDialog
          message={`Cancel all upcoming bookings for ${cancelRecurringBooking.role_name}?`}
          onConfirm={() => {
            if (cancelRecurringBooking.recurring_id) {
              cancelRecurring(cancelRecurringBooking.recurring_id);
            }
            setCancelRecurringBooking(null);
          }}
          onCancel={() => setCancelRecurringBooking(null)}
        />
      )}

      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity={snackbarSeverity} />
      <FeedbackSnackbar
        open={!!assignMsg}
        onClose={() => setAssignMsg('')}
        message={assignMsg}
        severity="error"
      />

      {assignSlot && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ background: 'white', padding: 16, borderRadius: 10, width: 300 }}>
            <h4>Assign Volunteer</h4>
              <TextField
                type="text"
                placeholder="Search volunteers"
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                label="Search"
                size="small"
                fullWidth
              />
            <ul style={{ listStyle: 'none', paddingLeft: 0, maxHeight: '150px', overflowY: 'auto' }}>
              {assignResults.map(v => (
                <li key={v.id} style={{ marginBottom: 4 }}>
                  {v.name}
                  <Button
                    style={{ marginLeft: 4 }}
                    onClick={() => assignVolunteer(v)}
                    variant="outlined"
                    color="primary"
                  >
                    Assign
                  </Button>
                </li>
              ))}
              {assignSearch.length >= 3 && assignResults.length === 0 && (
                <li>No search results.</li>
              )}
            </ul>
            <Button
              onClick={() => {
                setAssignSlot(null);
                setAssignSearch('');
                setAssignResults([]);
                setAssignMsg('');
              }}
              variant="outlined"
              color="primary"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      <ManageVolunteerShiftDialog
        open={!!manageShift}
        booking={manageShift}
        onClose={() => setManageShift(null)}
        onUpdated={handleManageUpdated}
      />
    </Page>
  );
}
