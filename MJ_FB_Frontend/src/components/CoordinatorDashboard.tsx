import { useState, useEffect, useCallback } from 'react';
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

interface RoleOption {
  id: number; // unique slot id
  role_id: number; // grouped role id
  name: string;
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
    getVolunteerRoles(token)
      .then(data => {
        setRoles(data);
        const map = new Map<number, string>();
        data.forEach((r: RoleOption) => map.set(r.role_id, r.name));
        setBaseRoles(Array.from(map, ([id, name]) => ({ id, name })));
      })
      .catch(() => {});
  }, [token]);

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
            all.push({ ...b, can_book: canBook });
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

  function toggleCreateRole(id: number, checked: boolean) {
    setSelectedCreateRoles(prev =>
      checked ? [...prev, id] : prev.filter(r => r !== id)
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
      setCreateMsg('Volunteer created');
      setFirstName('');
      setLastName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setPassword('');
      setSelectedCreateRoles([]);
    } catch (e) {
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
        <button onClick={() => setTab('schedule')} disabled={tab === 'schedule'}>Schedule</button>
        <button onClick={() => setTab('search')} disabled={tab === 'search'} style={{ marginLeft: 8 }}>Search Volunteer</button>
        <button onClick={() => setTab('create')} disabled={tab === 'create'} style={{ marginLeft: 8 }}>Create Volunteer</button>
        <button onClick={() => setTab('pending')} disabled={tab === 'pending'} style={{ marginLeft: 8 }}>Pending</button>
      </div>
      {tab === 'schedule' && (
        <div>
          <label>
            Role:{' '}
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select role</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          {selectedRole && roleInfo ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <button onClick={() => changeDay(-1)}>Previous</button>
                <h3>{formatDate(currentDate)}</h3>
                <button onClick={() => changeDay(1)}>Next</button>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search volunteers" />
          {results.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {results.map(r => (
                <li key={r.id}>
                  <button onClick={() => selectVolunteer(r)}>{r.name}</button>
                </li>
              ))}
            </ul>
          )}
          {selectedVolunteer && (
            <div>
              <h3>Roles for {selectedVolunteer.name}</h3>
              <div style={{ marginBottom: 8 }}>
                {baseRoles.map(r => (
                  <label key={r.id} style={{ display: 'block' }}>
                    <input
                      type="checkbox"
                      value={r.id}
                      checked={trainedEdit.includes(r.id)}
                      onChange={e => toggleTrained(r.id, e.target.checked)}
                    />{' '}
                    {r.name}
                  </label>
                ))}
              </div>
              <button onClick={saveTrainedAreas}>Save Roles</button>
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
                            <button onClick={() => decide(h.id, 'approved')}>Approve</button>{' '}
                            <button onClick={() => decide(h.id, 'rejected')}>Reject</button>
                          </>
                        )}
                          {h.status === 'approved' && (
                            <button onClick={() => decide(h.id, 'cancelled')}>Cancel</button>
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
          <div style={{ marginBottom: 8 }}>
            <label>First Name: <input value={firstName} onChange={e => setFirstName(e.target.value)} /></label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Last Name: <input value={lastName} onChange={e => setLastName(e.target.value)} /></label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Username: <input value={username} onChange={e => setUsername(e.target.value)} /></label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Email (optional): <input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Phone (optional): <input value={phone} onChange={e => setPhone(e.target.value)} /></label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Password: <input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Roles:</label>
            {baseRoles.map(r => (
              <label key={r.id} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  value={r.id}
                  checked={selectedCreateRoles.includes(r.id)}
                  onChange={e => toggleCreateRole(r.id, e.target.checked)}
                />{' '}
                {r.name}
              </label>
            ))}
          </div>
          <button onClick={submitVolunteer}>Add Volunteer</button>
          {createMsg && <p>{createMsg}</p>}
        </div>
      )}

      {tab === 'pending' && (
        <div>
          <h3>Pending Volunteer Bookings</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {pending.map(p => (
              <li key={p.id} style={{ marginBottom: 12, border: '1px solid #ccc', padding: 8 }}>
                <div><strong>Volunteer:</strong> {p.volunteer_name}</div>
                <div><strong>Date:</strong> {p.date}</div>
                <div><strong>Time:</strong> {formatTime(p.start_time)} - {formatTime(p.end_time)}</div>
                <div><strong>Slot Availability:</strong> {p.can_book ? 'Available' : 'Full'}</div>
                <div style={{ marginTop: 4 }}>
                  <button onClick={() => decide(p.id, 'approved')}>Approve</button>{' '}
                  <button onClick={() => decide(p.id, 'rejected')}>Reject</button>
                </div>
              </li>
            ))}
            {pending.length === 0 && <li>No pending bookings.</li>}
          </ul>
        </div>
      )}

      {message && <p style={{ color: 'red' }}>{message}</p>}

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
            <input
              type="text"
              placeholder="Search volunteers"
              value={assignSearch}
              onChange={e => setAssignSearch(e.target.value)}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <ul style={{ listStyle: 'none', paddingLeft: 0, maxHeight: '150px', overflowY: 'auto' }}>
              {assignResults.map(v => (
                <li key={v.id} style={{ marginBottom: 4 }}>
                  {v.name}
                  <button style={{ marginLeft: 4 }} onClick={() => assignVolunteer(v)}>
                    Assign
                  </button>
                </li>
              ))}
            </ul>
            {assignMsg && <p style={{ color: 'red' }}>{assignMsg}</p>}
            <button
              onClick={() => {
                setAssignModal(false);
                setAssignSearch('');
                setAssignResults([]);
                setAssignMsg('');
              }}
            >
              Close
            </button>
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
              <button
                onClick={() => {
                  decide(decisionBooking.id, 'approved');
                  setDecisionBooking(null);
                }}
              >
                Approve
              </button>
              <button
                onClick={() => {
                  decide(decisionBooking.id, 'rejected');
                  setDecisionBooking(null);
                }}
              >
                Reject
              </button>
              <button onClick={() => setDecisionBooking(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
