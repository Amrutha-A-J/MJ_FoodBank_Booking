import { useState, useEffect } from 'react';
import {
  getVolunteerRoles,
  getVolunteerBookingsByRole,
  updateVolunteerBookingStatus,
  searchUsers,
  getVolunteerBookingHistory,
  createVolunteer,
} from '../api/api';
import type { VolunteerBookingDetail } from '../types';
import { formatTime } from '../utils/time';

interface RoleOption {
  id: number;
  name: string;
}

interface UserResult {
  id: number;
  name: string;
  client_id: number;
}

interface SlotGroup {
  slot_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  bookings: VolunteerBookingDetail[];
}

export default function CoordinatorDashboard({ token }: { token: string }) {
  const [tab, setTab] = useState<'schedule' | 'search' | 'create' | 'pending'>('schedule');
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | ''>('');
  const [bookings, setBookings] = useState<VolunteerBookingDetail[]>([]);
  const [slotModal, setSlotModal] = useState<{
    slot_id: number;
    slot_date: string;
    start_time: string;
    end_time: string;
    bookings: VolunteerBookingDetail[];
  } | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<VolunteerBookingDetail[]>([]);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<UserResult | null>(null);
  const [history, setHistory] = useState<VolunteerBookingDetail[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  useEffect(() => {
    getVolunteerRoles(token)
      .then(setRoles)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (selectedRole) {
      getVolunteerBookingsByRole(token, Number(selectedRole))
        .then(data => {
          setBookings(data);
        })
        .catch(() => {});
    } else {
      setBookings([]);
    }
  }, [selectedRole, token]);

  useEffect(() => {
    if (search.length < 3) {
      setResults([]);
      return;
    }
    let active = true;
    searchUsers(token, search)
      .then(data => {
        if (active) setResults(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [search, token]);

  useEffect(() => {
    if (tab === 'pending') {
      loadPending();
    }
  }, [tab, roles, token]);

  async function loadPending() {
    const all: VolunteerBookingDetail[] = [];
    for (const r of roles) {
      try {
        const data = await getVolunteerBookingsByRole(token, r.id);
        all.push(...data.filter((b: VolunteerBookingDetail) => b.status === 'pending'));
      } catch {
        // ignore
      }
    }
    setPending(all);
  }

  const grouped = bookings.reduce((acc: Record<number, SlotGroup>, b) => {
    const slot = acc[b.slot_id] || {
      slot_id: b.slot_id,
      slot_date: b.slot_date,
      start_time: b.start_time,
      end_time: b.end_time,
      bookings: [],
    };
    slot.bookings.push(b);
    acc[b.slot_id] = slot;
    return acc;
  }, {} as Record<number, SlotGroup>);
  const slotArray: SlotGroup[] = Object.values(grouped);

  async function decide(id: number, status: 'approved' | 'rejected') {
    try {
      await updateVolunteerBookingStatus(token, id, status);
      if (selectedRole) {
        const data = await getVolunteerBookingsByRole(token, Number(selectedRole));
        setBookings(data);
        if (slotModal) {
          const updated = data.filter(b => b.slot_id === slotModal.slot_id);
          setSlotModal({ ...slotModal, bookings: updated });
        }
      }
      if (tab === 'pending') loadPending();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function selectVolunteer(u: UserResult) {
    setSelectedVolunteer(u);
    setResults([]);
    setSearch(u.name);
    try {
      const data = await getVolunteerBookingHistory(token, u.id);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }

  async function submitVolunteer() {
    if (!firstName || !lastName || !email || !password) {
      setCreateMsg('All fields required');
      return;
    }
    try {
      await createVolunteer(token, firstName, lastName, email, password);
      setCreateMsg('Volunteer created');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
    } catch (e) {
      setCreateMsg(e instanceof Error ? e.message : String(e));
    }
  }

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {slotArray.map((s: SlotGroup) => {
              const hasPending = s.bookings.some((b: VolunteerBookingDetail) => b.status === 'pending');
              const color = hasPending ? '#ffd8b2' : '#c8e6c9';
              return (
                <button
                  key={s.slot_id}
                  style={{ backgroundColor: color, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                  onClick={() => setSlotModal(s)}
                >
                  {s.slot_date} {formatTime(s.start_time)} - {formatTime(s.end_time)}
                </button>
              );
            })}
            {slotArray.length === 0 && <p>No bookings.</p>}
          </div>
          {slotModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'white', padding: 16, borderRadius: 4, width: 400 }}>
                <h3>
                  {slotModal.slot_date} {formatTime(slotModal.start_time)} - {formatTime(slotModal.end_time)}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {slotModal.bookings.map(b => (
                    <li key={b.id} style={{ marginBottom: 8, padding: 4, background: b.status === 'pending' ? '#ffd8b2' : '#c8e6c9' }}>
                      {b.volunteer_name} ({b.status}){' '}
                      {b.status === 'pending' && (
                        <>
                          <button onClick={() => decide(b.id, 'approved')}>Approve</button>{' '}
                          <button onClick={() => decide(b.id, 'rejected')}>Reject</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setSlotModal(null)}>Close</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'search' && (
        <div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or client ID" />
          {results.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {results.map(r => (
                <li key={r.id}>
                  <button onClick={() => selectVolunteer(r)}>{r.name} ({r.client_id})</button>
                </li>
              ))}
            </ul>
          )}
          {selectedVolunteer && (
            <div>
              <h3>History for {selectedVolunteer.name}</h3>
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
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>{h.slot_date}</td>
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
                          <button onClick={() => decide(h.id, 'rejected')}>Cancel</button>
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
            <label>Email: <input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Password: <input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
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
                <div><strong>Date:</strong> {p.slot_date}</div>
                <div><strong>Time:</strong> {formatTime(p.start_time)} - {formatTime(p.end_time)}</div>
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
    </div>
  );
}
