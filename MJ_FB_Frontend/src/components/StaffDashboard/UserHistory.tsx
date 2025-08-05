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
  slot_id: number;
  is_staff_booking: boolean;
  reason?: string;
}

interface Props {
  token: string;
  self?: boolean;
}

export default function UserHistory({ token, self = false }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    if (self) return;
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
  }, [search, token, self]);

  useEffect(() => {
    const opts: { status?: string; past?: boolean; userId?: number } = {};
    if (self) {
      // current user's history
    } else {
      if (!selected) return;
      opts.userId = selected.id;
    }
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
  }, [selected, filter, token, self]);

  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));
  const paginated = bookings.slice((page - 1) * pageSize, page * pageSize);

  const filterId = self ? 'filterUser' : 'filterStaff';

  return (
    <div>
      <h2>{self ? 'Booking History' : 'User History'}</h2>
      {!self && (
        <>
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
        </>
      )}
      {(self || selected) && (
        <div>
          {!self && selected && <h3>History for {selected.name}</h3>}
          <div>
            <label htmlFor={filterId}>Filter:</label>{' '}
            <select id={filterId} value={filter} onChange={e => setFilter(e.target.value)}>
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
                  const hasStart = b.date && b.start_time;
                  const hasEnd = b.date && b.end_time;
                  const startTime =
                    hasStart && !isNaN(new Date(`${b.date}T${b.start_time}`).getTime())
                      ? formatInTimeZone(
                          `${b.date}T${b.start_time}`,
                          TIMEZONE,
                          'h:mm a'
                        )
                      : 'N/A';
                  const endTime =
                    hasEnd && !isNaN(new Date(`${b.date}T${b.end_time}`).getTime())
                      ? formatInTimeZone(
                          `${b.date}T${b.end_time}`,
                          TIMEZONE,
                          'h:mm a'
                        )
                      : 'N/A';
                  const formattedDate =
                    b.date && !isNaN(new Date(b.date).getTime())
                      ? formatInTimeZone(`${b.date}`, TIMEZONE, 'MMM d, yyyy')
                      : 'N/A';
                  return (
                    <tr key={b.id}>
                      <td>{formattedDate}</td>
                      <td>
                        {startTime !== 'N/A' && endTime !== 'N/A'
                          ? `${startTime} - ${endTime}`
                          : 'N/A'}
                      </td>
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
