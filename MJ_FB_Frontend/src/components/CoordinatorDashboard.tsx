import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getVolunteerRoles,
  getVolunteerBookingsByRole,
  updateVolunteerBookingStatus,
  searchVolunteers,
  getVolunteerBookingHistory,
  createVolunteer,
  updateVolunteerTrainedAreas,
  createVolunteerBookingForVolunteer,
} from '../api/api';
import type { VolunteerBookingDetail } from '../types';
import { formatTime } from '../utils/time';
import VolunteerScheduleTable from './VolunteerScheduleTable';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import FeedbackSnackbar from './FeedbackSnackbar';
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
} from '@mui/material';


interface RoleOption {
  id: number; // unique slot id
  role_id: number; // grouped role id
  name: string;
  category: string;
  start_time: string;
  end_time: string;
  max_volunteers: number;
}

interface VolunteerResult {
  id: number;
  name: string;
  trainedAreas: number[];
}


export default function CoordinatorDashboard({ token }: { token: string }) {
  const [tab, setTab] = useState<'schedule' | 'search' | 'create' | 'pending'>('schedule');
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [baseRoles, setBaseRoles] = useState<{ id: number; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | ''>('');
  const [bookings, setBookings] = useState<VolunteerBookingDetail[]>([]);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<VolunteerBookingDetail[]>([]);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<VolunteerResult[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerResult | null>(null);
  const [trainedEdit, setTrainedEdit] = useState<number[]>([]);
  const [editMsg, setEditMsg] = useState('');
  const [history, setHistory] = useState<VolunteerBookingDetail[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCreateRoles, setSelectedCreateRoles] = useState<number[]>([]);
  const [createMsg, setCreateMsg] = useState('');
  const [createSeverity, setCreateSeverity] = useState<'success' | 'error'>('success');

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function toggleCreateRole(id: number, checked: boolean) {
    setSelectedCreateRoles(prev =>
      checked ? [...prev, id] : prev.filter(r => r !== id)
    );
  }

  const [assignModal, setAssignModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignResults, setAssignResults] = useState<VolunteerResult[]>([]);
  const [assignMsg, setAssignMsg] = useState('');
  const [decisionBooking, setDecisionBooking] = useState<VolunteerBookingDetail | null>(null);

  const reginaTimeZone = 'America/Regina';
  const [currentDate, setCurrentDate] = useState(() => {
    const todayStr = formatInTimeZone(new Date(), reginaTimeZone, 'yyyy-MM-dd');
    return fromZonedTime(`${todayStr}T00:00:00`, reginaTimeZone);
  });

  const formatDate = (date: Date) => formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');

  function changeDay(delta: number) {
    setCurrentDate(d => new Date(d.getTime() + delta * 86400000));
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
    getVolunteerRoles(token)
      .then(data => {
        setRoles(data);
        const map = new Map<number, string>();
        data.forEach((r: RoleOption) => {
          if (!map.has(r.role_id)) map.set(r.role_id, r.name);
        });
        setBaseRoles(Array.from(map, ([id, name]) => ({ id, name })));
      })
      .catch(() => {});
  }, [token]);

  const groupedRoles = useMemo(() => {
    const unique = new Map<number, { id: number; name: string; category: string }>();
    roles.forEach(r => {
      if (!unique.has(r.role_id)) {
        unique.set(r.role_id, { id: r.role_id, name: r.name, category: r.category });
      }
    });
    const groups = new Map<string, { id: number; name: string }[]>();
    unique.forEach(r => {
      const arr = groups.get(r.category) || [];
      arr.push({ id: r.id, name: r.name });
      groups.set(r.category, arr);
    });
    return Array.from(groups.entries()).map(([category, roles]) => ({ category, roles }));
  }, [roles]);

  const scheduleRoleGroups = useMemo(() => {
    const groups = new Map<string, RoleOption[]>();
    roles.forEach(r => {
      const arr = groups.get(r.category) || [];
      arr.push(r);
      groups.set(r.category, arr);
    });
    return Array.from(groups.entries()).map(([category, roles]) => ({
      category,
      roles,
    }));
  }, [roles]);

  const scheduleRoleItems = useMemo(
    () =>
      scheduleRoleGroups.flatMap(g => [
        <ListSubheader key={`${g.category}-header`}>{g.category}</ListSubheader>,
        ...g.roles.map(r => (
          <MenuItem key={r.id} value={r.id}>
            {r.name}
          </MenuItem>
        )),
      ]),
    [scheduleRoleGroups]
  );

  const selectedRoleNames = useMemo(() => {
    const map = new Map<number, string>();
    groupedRoles.forEach(g => g.roles.forEach(r => map.set(r.id, r.name)));
    return selectedCreateRoles
      .map(id => map.get(id))
      .filter(Boolean)
      .join(', ');
  }, [groupedRoles, selectedCreateRoles]);

  useEffect(() => {
    if (selectedRole && tab === 'schedule') {
      getVolunteerBookingsByRole(token, Number(selectedRole))
        .then(data => {
          setBookings(data);
        })
        .catch(() => {});
    } else if (!selectedRole) {
      setBookings([]);
    }
  }, [selectedRole, token, tab]);

  useEffect(() => {
    if (search.length < 3) {
      setResults([]);
      return;
    }
    let active = true;
    searchVolunteers(token, search)
      .then(data => {
        if (active) setResults(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [search, token]);

  const loadPending = useCallback(async () => {
    const all: VolunteerBookingDetail[] = [];
    for (const r of roles) {
      try {
        const data = await getVolunteerBookingsByRole(token, r.id);
        const approvedByDate: Record<string, number> = {};
        data.forEach((b: VolunteerBookingDetail) => {
          if (b.status.toLowerCase() === 'approved') {
            approvedByDate[b.date] = (approvedByDate[b.date] || 0) + 1;
          }
        });
        data.forEach((b: VolunteerBookingDetail) => {
          if (b.status.toLowerCase() === 'pending') {
            const approvedCount = approvedByDate[b.date] || 0;
            const canBook = approvedCount < r.max_volunteers;
            all.push({ ...b, role_name: b.role_name || r.name, can_book: canBook });
          }
        });
      } catch {
        // ignore
      }
    }
    setPending(all);
  }, [roles, token]);

  useEffect(() => {
    if (tab === 'pending') {
      loadPending();
    }
  }, [tab, loadPending]);

  async function decide(id: number, status: 'approved' | 'rejected' | 'cancelled') {
    try {
      await updateVolunteerBookingStatus(token, id, status);
      if (selectedRole) {
        const data = await getVolunteerBookingsByRole(token, Number(selectedRole));
        setBookings(data);
      }
      if (tab === 'pending') loadPending();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function selectVolunteer(u: VolunteerResult) {
    setSelectedVolunteer(u);
    setResults([]);
    setSearch(u.name);
    setTrainedEdit(u.trainedAreas || []);
    try {
      const data = await getVolunteerBookingHistory(token, u.id);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }

  function toggleTrained(id: number, checked: boolean) {
    setTrainedEdit(prev =>
      checked ? [...prev, id] : prev.filter(t => t !== id)
    );
  }


  async function assignVolunteer(vol: VolunteerResult) {
    if (!roleInfo) return;
    try {
      setAssignMsg('');
      await createVolunteerBookingForVolunteer(
        token,
        vol.id,
        roleInfo.id,
        formatDate(currentDate)
      );
      setAssignModal(false);
      setAssignSearch('');
      setAssignResults([]);
      const data = await getVolunteerBookingsByRole(token, roleInfo.id);
      setBookings(data);
    } catch (e) {
      setAssignMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveTrainedAreas() {
    if (!selectedVolunteer) return;
    try {
      await updateVolunteerTrainedAreas(token, selectedVolunteer.id, trainedEdit);
      setEditMsg('Roles updated');
    } catch (e) {
      setEditMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function submitVolunteer() {
    if (
      !firstName ||
      !lastName ||
      !username ||
      !password ||
      selectedCreateRoles.length === 0
    ) {
      setCreateSeverity('error');
      setCreateMsg(
        'First name, last name, username, password and at least one role required'
      );
      return;
    }
    try {
      await createVolunteer(
        token,
        firstName,
        lastName,
        username,
        password,
        selectedCreateRoles,
        email || undefined,
        phone || undefined
      );
      setCreateSeverity('success');
      setCreateMsg('Volunteer created');
      setFirstName('');
      setLastName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setPassword('');
      setSelectedCreateRoles([]);
    } catch (e) {
      setCreateSeverity('error');
      setCreateMsg(e instanceof Error ? e.message : String(e));
    }
  }

  const roleInfo = roles.find(r => r.id === selectedRole);

  useEffect(() => {
    if (!assignModal || assignSearch.length < 3 || !roleInfo) {
      setAssignResults([]);
      return;
    }
    const delay = setTimeout(() => {
      searchVolunteers(token, assignSearch)
        .then((data: VolunteerResult[]) => {
          const filtered = data
            .filter(v => v.trainedAreas.includes(roleInfo.id))
            .slice(0, 5);
          setAssignResults(filtered);
        })
        .catch(() => setAssignResults([]));
    }, 300);
    return () => clearTimeout(delay);
  }, [assignSearch, token, assignModal, roleInfo]);

  const bookingsForDate = bookings.filter(
    b =>
      b.date === formatDate(currentDate) &&
      ['approved', 'pending'].includes(b.status.toLowerCase())
  );
  const rows = roleInfo
    ? (() => {
        const approvedCount = bookingsForDate.filter(
          b => b.status.toLowerCase() === 'approved'
        ).length;
        const canBook = approvedCount < roleInfo.max_volunteers;
        return [
          {
            time: `${formatTime(roleInfo.start_time)} - ${formatTime(roleInfo.end_time)}`,
            cells: Array.from({ length: roleInfo.max_volunteers }).map((_, i) => {
              const booking = bookingsForDate[i];
              return {
                content: booking
                  ?
                      booking.volunteer_name +
                      (booking.status.toLowerCase() === 'pending' && !canBook
                        ? ' (Full)'
                        : '')
                  : '',
                backgroundColor: booking
                  ? booking.status.toLowerCase() === 'approved'
                    ? '#c8e6c9'
                    : '#ffd8b2'
                  : undefined,
                onClick: () => {
                  if (booking) {
                    if (booking.status.toLowerCase() === 'pending') {
                      setDecisionBooking({ ...booking, can_book: canBook });
                    }
                  } else {
                    setAssignModal(true);
                    setAssignSearch('');
                    setAssignResults([]);
                    setAssignMsg('');
                  }
                },
              };
            }),
          },
        ];
      })()
    : [];

  return (
    <div>
      <h2>Coordinator Dashboard</h2>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={() => setTab('schedule')} disabled={tab === 'schedule'} variant="outlined" color="primary">Schedule</Button>
        <Button onClick={() => setTab('search')} disabled={tab === 'search'} style={{ marginLeft: 8 }} variant="outlined" color="primary">Search Volunteer</Button>
        <Button onClick={() => setTab('create')} disabled={tab === 'create'} style={{ marginLeft: 8 }} variant="outlined" color="primary">Create Volunteer</Button>
        <Button onClick={() => setTab('pending')} disabled={tab === 'pending'} style={{ marginLeft: 8 }} variant="outlined" color="primary">Pending</Button>
      </div>
      {tab === 'schedule' && (
        <div>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="schedule-role-label">Role</InputLabel>
            <Select
              labelId="schedule-role-label"
              value={selectedRole === '' ? '' : selectedRole}
              label="Role"
              onChange={e =>
                setSelectedRole(e.target.value ? Number(e.target.value) : '')
              }
            >
              <MenuItem value="">Select role</MenuItem>
              {scheduleRoleItems}
            </Select>
          </FormControl>
          {selectedRole && roleInfo ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <Button onClick={() => changeDay(-1)} variant="outlined" color="primary">Previous</Button>
                <h3>{formatDate(currentDate)}</h3>
                <Button onClick={() => changeDay(1)} variant="outlined" color="primary">Next</Button>
              </div>
              <VolunteerScheduleTable maxSlots={roleInfo.max_volunteers} rows={rows} />
            </>
          ) : (
            <p style={{ marginTop: 16 }}>Select a role to view schedule.</p>
          )}
        </div>
      )}

      {tab === 'search' && (
        <div>
          <TextField
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search volunteers"
            label="Search"
            size="small"
            sx={{ mb: 1 }}
          />
          {results.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {results.map(r => (
                <li key={r.id}>
                  <Button onClick={() => selectVolunteer(r)} variant="outlined" color="primary">{r.name}</Button>
                </li>
              ))}
            </ul>
          )}
          {selectedVolunteer && (
            <div>
              <h3>Roles for {selectedVolunteer.name}</h3>
              <div style={{ marginBottom: 8 }}>
                {baseRoles.map(r => (
                  <label
                    key={r.id}
                    style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}
                  >
                    <input
                      type="checkbox"
                      value={r.id}
                      checked={trainedEdit.includes(r.id)}
                      onChange={e => toggleTrained(r.id, e.target.checked)}
                      style={{ marginRight: 6 }}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
              <Button onClick={saveTrainedAreas} variant="outlined" color="primary">Save Roles</Button>
              {editMsg && <p>{editMsg}</p>}
              <h3 style={{ marginTop: 16 }}>History for {selectedVolunteer.name}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ccc', padding: 4 }}>Role</th>
                    <th style={{ border: '1px solid #ccc', padding: 4 }}>Date</th>
                    <th style={{ border: '1px solid #ccc', padding: 4 }}>Time</th>
                    <th style={{ border: '1px solid #ccc', padding: 4 }}>Status</th>
                    <th style={{ border: '1px solid #ccc', padding: 4 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>{h.role_name}</td>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>{h.date}</td>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>{formatTime(h.start_time)} - {formatTime(h.end_time)}</td>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>{h.status}</td>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>
                        {h.status === 'pending' && (
                          <>
                            <Button onClick={() => decide(h.id, 'approved')} variant="outlined" color="primary">Approve</Button>{' '}
                            <Button onClick={() => decide(h.id, 'rejected')} variant="outlined" color="primary">Reject</Button>
                          </>
                        )}
                          {h.status === 'approved' && (
                            <Button onClick={() => decide(h.id, 'cancelled')} variant="outlined" color="primary">Cancel</Button>
                          )}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 8 }}>No bookings.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'create' && (
        <div>
          <TextField
            label="First Name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            size="small"
            sx={{ mb: 1 }}
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            size="small"
            sx={{ mb: 1 }}
          />
          <TextField
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            size="small"
            sx={{ mb: 1 }}
          />
          <TextField
            label="Email (optional)"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            size="small"
            sx={{ mb: 1 }}
          />
          <TextField
            label="Phone (optional)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            size="small"
            sx={{ mb: 1 }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            size="small"
            sx={{ mb: 1 }}
          />
          <div style={{ marginBottom: 8, position: 'relative' }} ref={dropdownRef}>
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
                        key={r.id}
                        control={
                          <Checkbox
                            value={r.id}
                            checked={selectedCreateRoles.includes(r.id)}
                            onChange={e => toggleCreateRole(r.id, e.target.checked)}
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
          <Button onClick={submitVolunteer} variant="outlined" color="primary">Add Volunteer</Button>
          <FeedbackSnackbar
            open={!!createMsg}
            onClose={() => setCreateMsg('')}
            message={createMsg}
            severity={createSeverity}
          />
        </div>
      )}

      {tab === 'pending' && (
        <div>
          <h3>Pending Volunteer Bookings</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {pending.map(p => (
              <li key={p.id} style={{ marginBottom: 12, border: '1px solid #ccc', padding: 8 }}>
                <div><strong>Volunteer:</strong> {p.volunteer_name}</div>
                <div><strong>Role:</strong> {p.role_name}</div>
                <div><strong>Date:</strong> {p.date}</div>
                <div><strong>Time:</strong> {formatTime(p.start_time)} - {formatTime(p.end_time)}</div>
                <div><strong>Slot Availability:</strong> {p.can_book ? 'Available' : 'Full'}</div>
                <div style={{ marginTop: 4 }}>
                  <Button onClick={() => decide(p.id, 'approved')} variant="outlined" color="primary">Approve</Button>{' '}
                  <Button onClick={() => decide(p.id, 'rejected')} variant="outlined" color="primary">Reject</Button>
                </div>
              </li>
            ))}
            {pending.length === 0 && <li>No pending bookings.</li>}
          </ul>
        </div>
      )}

      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity="error" />

      {assignModal && (
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
          <div style={{ background: 'white', padding: 16, borderRadius: 4, width: 300 }}>
            <h4>Assign Volunteer</h4>
            <TextField
              type="text"
              placeholder="Search volunteers"
              value={assignSearch}
              onChange={e => setAssignSearch(e.target.value)}
              label="Search"
              size="small"
              fullWidth
              sx={{ mb: 1 }}
            />
            <ul style={{ listStyle: 'none', paddingLeft: 0, maxHeight: '150px', overflowY: 'auto' }}>
              {assignResults.map(v => (
                <li key={v.id} style={{ marginBottom: 4 }}>
                  {v.name}
                  <Button style={{ marginLeft: 4 }} onClick={() => assignVolunteer(v)} variant="outlined" color="primary">
                    Assign
                  </Button>
                </li>
              ))}
            </ul>
            {assignMsg && <p style={{ color: 'red' }}>{assignMsg}</p>}
            <Button
              onClick={() => {
                setAssignModal(false);
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

      {decisionBooking && (
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
          <div style={{ background: 'white', padding: 16, borderRadius: 4, width: 300 }}>
            <p>
              Approve or reject booking for {decisionBooking.volunteer_name}?<br />
              Slot Availability: {decisionBooking.can_book ? 'Available' : 'Full'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <Button
                onClick={() => {
                  decide(decisionBooking.id, 'approved');
                  setDecisionBooking(null);
                }}
                variant="outlined"
                color="primary"
              >
                Approve
              </Button>
              <Button
                onClick={() => {
                  decide(decisionBooking.id, 'rejected');
                  setDecisionBooking(null);
                }}
                variant="outlined"
                color="primary"
              >
                Reject
              </Button>
              <Button onClick={() => setDecisionBooking(null)} variant="outlined" color="primary">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
