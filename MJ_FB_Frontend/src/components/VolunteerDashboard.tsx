import { useState, useEffect } from 'react';
import {
  getVolunteerSlots,
  requestVolunteerBooking,
  getMyVolunteerBookings,
} from '../api/api';
import type { VolunteerSlot, VolunteerBooking } from '../types';
import { formatTime } from '../utils/time';

export default function VolunteerDashboard({ token }: { token: string }) {
  const [slots, setSlots] = useState<VolunteerSlot[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | ''>('');
  const [modalSlot, setModalSlot] = useState<VolunteerSlot | null>(null);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'slots' | 'history'>('slots');
  const [history, setHistory] = useState<VolunteerBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    getVolunteerSlots(token, selectedDate)
      .then(data => {
        setSlots(data);
        const map = new Map<number, string>();
        data.forEach((s: VolunteerSlot) => map.set(s.role_id, s.role_name));
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

  const filteredSlots = slots.filter(s => selectedRole === '' || s.role_id === selectedRole);

  async function submitBooking() {
    if (!modalSlot) return;
    try {
      await requestVolunteerBooking(token, modalSlot.id, selectedDate);
      setMessage('Request submitted!');
      setModalSlot(null);
      const updated = await getVolunteerSlots(token, selectedDate);
      setSlots(updated);
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
                  {filteredSlots.map(s => (
                    <tr key={s.id}>
                      <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.date}</td>
                      <td style={{ border: '1px solid #ccc', padding: 8 }}>
                        {formatTime(s.start_time)} - {formatTime(s.end_time)}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: 8 }}>
                        {s.available}/{s.max_volunteers}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>
                        {s.available > 0 ? (
                          <button onClick={() => setModalSlot(s)}>Request</button>
                        ) : (
                          'Full'
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredSlots.length === 0 && (
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

      {modalSlot && (
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
              Request booking for {modalSlot.date} {formatTime(modalSlot.start_time)} -{' '}
              {formatTime(modalSlot.end_time)}?
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button onClick={submitBooking}>Submit</button>
              <button onClick={() => setModalSlot(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

