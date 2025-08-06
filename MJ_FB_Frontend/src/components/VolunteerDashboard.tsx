import { useState, useEffect } from 'react';
import {
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  getMyVolunteerBookings,
} from '../api/api';
import type { VolunteerRole, VolunteerBooking } from '../types';
import { formatTime } from '../utils/time';

export default function VolunteerDashboard({ token }: { token: string }) {
  const [rolesData, setRolesData] = useState<VolunteerRole[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | ''>('');
  const [modalRole, setModalRole] = useState<VolunteerRole | null>(null);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'slots' | 'history'>('slots');
  const [history, setHistory] = useState<VolunteerBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    getVolunteerRolesForVolunteer(token, selectedDate)
      .then(data => {
        setRolesData(data);
        const map = new Map<number, string>();
        data.forEach((r: VolunteerRole) => map.set(r.id, r.name));
        const arr = Array.from(map, ([id, name]) => ({ id, name }));
        setRoles(arr);
        if (arr.length > 0) setSelectedRole(arr[0].id);
      })
      .catch(() => {});
  }, [token, selectedDate]);

  useEffect(() => {
    if (tab === 'history') {
      getMyVolunteerBookings(token)
        .then(setHistory)
        .catch(() => {});
    }
  }, [tab, token]);

  const filteredRoles = rolesData.filter(r => selectedRole === '' || r.id === selectedRole);

  async function submitBooking() {
    if (!modalRole) return;
    try {
      await requestVolunteerBooking(token, modalRole.id, selectedDate);
      setMessage('Request submitted!');
      setModalRole(null);
      const updated = await getVolunteerRolesForVolunteer(token, selectedDate);
      setRolesData(updated);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <h2>Volunteer Dashboard</h2>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setTab('slots')} disabled={tab === 'slots'}>
          Available Slots
        </button>
        <button onClick={() => setTab('history')} disabled={tab === 'history'} style={{ marginLeft: 8 }}>
          Booking History
        </button>
      </div>

      {tab === 'slots' && (
        <div>
          {roles.length > 0 ? (
            <>
              <label htmlFor="dateSelect">Date: </label>
              <input
                type="date"
                id="dateSelect"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
              <label htmlFor="roleSelect" style={{ marginLeft: 8 }}>
                Role:{' '}
              </label>
              <select
                id="roleSelect"
                value={selectedRole}
                onChange={e => setSelectedRole(Number(e.target.value))}
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>Date</th>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>Time</th>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>Available</th>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map(r => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #ccc', padding: 8 }}>{r.date}</td>
                      <td style={{ border: '1px solid #ccc', padding: 8 }}>
                        {formatTime(r.start_time)} - {formatTime(r.end_time)}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: 8 }}>
                        {r.available}/{r.max_volunteers}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>
                        {r.available > 0 ? (
                          <button onClick={() => setModalRole(r)}>Request</button>
                        ) : (
                          'Full'
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRoles.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 8 }}>
                        No slots.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <p>No trained roles assigned.</p>
          )}
          {message && <p style={{ color: 'green' }}>{message}</p>}
        </div>
      )}

      {tab === 'history' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Role</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Time</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id}>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{h.role_name}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{h.date}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>
                  {formatTime(h.start_time)} - {formatTime(h.end_time)}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{h.status}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 8 }}>
                  No bookings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {modalRole && (
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
              Request booking for {modalRole.date} {formatTime(modalRole.start_time)} -{' '}
              {formatTime(modalRole.end_time)}?
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button onClick={submitBooking}>Submit</button>
              <button onClick={() => setModalRole(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

