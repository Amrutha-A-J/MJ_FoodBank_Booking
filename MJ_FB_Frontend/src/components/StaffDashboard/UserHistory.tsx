import { useState, useEffect } from 'react';
import { searchUsers, getBookingHistory } from '../../api/api';

interface User {
  id: number;
  name: string;
  client_id: number;
}

interface Booking {
  id: number;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

export default function UserHistory({ token }: { token: string }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);

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
    if (!selected) return;
    const opts: { status?: string; past?: boolean; userId: number } = { userId: selected.id };
    if (filter === 'past') opts.past = true;
    else if (filter !== 'all') opts.status = filter;
    getBookingHistory(token, opts)
      .then(data => setBookings(data))
      .catch(err => console.error('Error loading history:', err));
  }, [selected, filter, token]);

  return (
    <div>
      <h2>User History</h2>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or client ID"
      />
      {results.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.map(u => (
            <li key={u.id}>
              <button
                onClick={() => {
                  setSelected(u);
                  setSearch(u.name);
                  setResults([]);
                }}
              >
                {u.name} ({u.client_id})
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div>
          <h3>History for {selected.name}</h3>
          <div>
            <label htmlFor="filterStaff">Filter:</label>{' '}
            <select
              id="filterStaff"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
              <option value="past">Past</option>
            </select>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {bookings.length === 0 && <li>No bookings.</li>}
            {bookings.map(b => (
              <li key={b.id} style={{ marginBottom: 8 }}>
                <strong>{b.date}</strong>{' '}
                {b.start_time && b.end_time ? `${b.start_time}-${b.end_time}` : ''} - {b.status}
                {b.reason && <em> ({b.reason})</em>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
