import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
import FormContainer from './FormContainer';
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
}


export default function CoordinatorDashboard({ token }: { token: string }) {
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const tab: 'schedule' | 'search' | 'create' | 'pending' =
    tabParam === 'search' || tabParam === 'create' || tabParam === 'pending'
      ? (tabParam as 'search' | 'create' | 'pending')
      : 'schedule';
  const tabTitles: Record<typeof tab, string> = {
    schedule: 'Schedule',
    search: 'Search Volunteer',
    create: 'Create Volunteer',
    pending: 'Pending',
  };
  const title = tabTitles[tab];
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [bookings, setBookings] = useState<VolunteerBookingDetail[]>([]);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<VolunteerBookingDetail[]>([]);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<VolunteerResult[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerResult | null>(null);
  const [trainedEdit, setTrainedEdit] = useState<string[]>([]);
  const [editMsg, setEditMsg] = useState('');
  const [editSeverity, setEditSeverity] = useState<'success' | 'error'>('success');
  const [history, setHistory] = useState<VolunteerBookingDetail[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCreateRoles, setSelectedCreateRoles] = useState<string[]>([]);
  const [createMsg, setCreateMsg] = useState('');
  const [createSeverity, setCreateSeverity] = useState<'success' | 'error'>('success');

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [editRoleDropdownOpen, setEditRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editDropdownRef = useRef<HTMLDivElement>(null);

  function toggleCreateRole(name: string, checked: boolean) {
    setSelectedCreateRoles(prev =>
      checked ? [...prev, name] : prev.filter(r => r !== name)
    );
  }

  const [assignSlot, setAssignSlot] = useState<RoleOption | null>(null);
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
      if (editDropdownRef.current && !editDropdownRef.current.contains(e.target as Node)) {
        setEditRoleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    getVolunteerRoles(token)
      .then(data => {
        setRoles(data);
      })
      .catch(() => {});
  }, [token]);

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
      const ids = nameToRoleIds.get(selectedRole) || [];
      Promise.all(ids.map(id => getVolunteerBookingsByRole(token, id)))
        .then(data => {
          setBookings(data.flat());
        })
        .catch(() => {});
    } else if (!selectedRole) {
      setBookings([]);
    }
  }, [selectedRole, token, tab, nameToRoleIds]);

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
        const ids = nameToRoleIds.get(selectedRole) || [];
        const data = await Promise.all(
          ids.map(rid => getVolunteerBookingsByRole(token, rid))
        );
        setBookings(data.flat());
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
    setTrainedEdit(
      Array.from(
        new Set(
          (u.trainedAreas || [])
            .map(id => idToName.get(id))
            .filter(Boolean) as string[]
        )
      )
    );
    try {
      const data = await getVolunteerBookingHistory(token, u.id);
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


  async function assignVolunteer(vol: VolunteerResult) {
    if (!assignSlot || !selectedRole) return;
    try {
      setAssignMsg('');
      await createVolunteerBookingForVolunteer(
        token,
        vol.id,
        assignSlot.id,
        formatDate(currentDate)
      );
      setAssignSlot(null);
      setAssignSearch('');
      setAssignResults([]);
      const ids = nameToRoleIds.get(selectedRole) || [];
      const data = await Promise.all(
        ids.map(id => getVolunteerBookingsByRole(token, id))
      );
      setBookings(data.flat());
    } catch (e) {
      setAssignMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveTrainedAreas() {
    if (!selectedVolunteer) return;
    try {
      const ids = Array.from(
        new Set(trainedEdit.flatMap(name => nameToRoleIds.get(name) || []))
      );
      await updateVolunteerTrainedAreas(token, selectedVolunteer.id, ids);
      setEditSeverity('success');
      setEditMsg('Roles updated');
    } catch (e) {
      setEditSeverity('error');
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
      const ids = Array.from(
        new Set(
          selectedCreateRoles.flatMap(name => nameToRoleIds.get(name) || [])
        )
      );
      await createVolunteer(
        token,
        firstName,
        lastName,
        username,
        password,
        ids,
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

  const roleInfos = roles.filter(r => r.name === selectedRole);

  useEffect(() => {
    if (!assignSlot || assignSearch.length < 3) {
      setAssignResults([]);
      return;
    }
    const delay = setTimeout(() => {
      searchVolunteers(token, assignSearch)
        .then((data: VolunteerResult[]) => {
          const filtered = data
            .filter(v => v.trainedAreas.includes(assignSlot.id))
            .slice(0, 5);
          setAssignResults(filtered);
        })
        .catch(() => setAssignResults([]));
    }, 300);
    return () => clearTimeout(delay);
  }, [assignSearch, token, assignSlot]);

  const bookingsForDate = bookings.filter(
    b =>
      b.date === formatDate(currentDate) &&
      ['approved', 'pending'].includes(b.status.toLowerCase())
  );
  const rows = selectedRole
    ? roleInfos.map(role => {
        const slotBookings = bookingsForDate.filter(
          b => b.role_id === role.id
        );
        const approvedCount = slotBookings.filter(
          b => b.status.toLowerCase() === 'approved'
        ).length;
        const canBook = approvedCount < role.max_volunteers;
        return {
          time: `${formatTime(role.start_time || role.startTime || '')} - ${formatTime(role.end_time || role.endTime || '')}`,
          cells: Array.from({ length: role.max_volunteers }).map((_, i) => {
            const booking = slotBookings[i];
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
    <div>
      <h2>{title}</h2>
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
              <VolunteerScheduleTable maxSlots={maxSlots} rows={rows} />
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
                <li
                  key={r.id}
                  style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}
                >
                  <span>{r.name}</span>
                  <Button
                    onClick={() => selectVolunteer(r)}
                    variant="outlined"
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {selectedVolunteer && (
            <div>
              <h3>Edit Roles for {selectedVolunteer.name}</h3>
              <div style={{ marginBottom: 8, position: 'relative' }} ref={editDropdownRef}>
                <label>Role: </label>
                <Button
                  type="button"
                  onClick={() => setEditRoleDropdownOpen(o => !o)}
                  variant="outlined"
                  color="primary"
                >
                  {trainedEdit.length ? trainedEdit.join(', ') : 'Select roles'}
                </Button>
                {editRoleDropdownOpen && (
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
                                checked={trainedEdit.includes(r.name)}
                                onChange={e => toggleTrained(r.name, e.target.checked)}
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
              <Button onClick={saveTrainedAreas} variant="outlined" color="primary">Save Roles</Button>
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
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>{formatTime(h.start_time || h.startTime || '')} - {formatTime(h.end_time || h.endTime || '')}</td>
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
        <>
          <FormContainer
            onSubmit={e => {
              e.preventDefault();
              submitVolunteer();
            }}
            submitLabel="Add Volunteer"
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
            <TextField
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Email (optional)"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Phone (optional)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
          </FormContainer>
          <FeedbackSnackbar
            open={!!createMsg}
            onClose={() => setCreateMsg('')}
            message={createMsg}
            severity={createSeverity}
          />
        </>
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
                <div><strong>Time:</strong> {formatTime(p.start_time || p.startTime || '')} - {formatTime(p.end_time || p.endTime || '')}</div>
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
      <FeedbackSnackbar
        open={!!editMsg}
        onClose={() => setEditMsg('')}
        message={editMsg}
        severity={editSeverity}
      />
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
