import { useState, useEffect } from 'react';
import { searchUsers, getBookingHistory } from '../../api/api';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'America/Regina';

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
  created_at: string;
  reason?: string;
}

export default function UserHistory({ token }: { token: string }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);

  const pageSize = 10;

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
      .then(data => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setBookings(sorted);
        setPage(1);
      })
      .catch(err => console.error('Error loading history:', err));
  }, [selected, filter, token]);

  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));
  const paginated = bookings.slice((page - 1) * pageSize, page * pageSize);

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
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={4}>No bookings.</td>
                  </tr>
                )}
                {paginated.map(b => {
                  const startTime = formatInTimeZone(
                    `${b.date}T${b.start_time}`,
                    TIMEZONE,
                    'h:mm a'
                  );
                  const endTime = formatInTimeZone(
                    `${b.date}T${b.end_time}`,
                    TIMEZONE,
                    'h:mm a'
                  );
                  return (
                    <tr key={b.id}>
                      <td>{formatInTimeZone(`${b.date}`, TIMEZONE, 'MMM d, yyyy')}</td>
                      <td>{`${startTime} - ${endTime}`}</td>
                      <td>{b.status}</td>
                      <td>{b.reason || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
