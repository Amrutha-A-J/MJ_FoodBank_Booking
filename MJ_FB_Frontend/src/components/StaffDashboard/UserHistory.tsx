import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBookingHistory } from '../../api/api';
import { formatInTimeZone } from 'date-fns-tz';
import { Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import RescheduleDialog from '../RescheduleDialog';
import EntitySearch from '../EntitySearch';

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
  reschedule_token: string;
}

export default function UserHistory({
  token,
  initialUser,
}: {
  token: string;
  initialUser?: User;
}) {
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<User | null>(initialUser || null);
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);

  const pageSize = 10;

  const loadBookings = useCallback(() => {
    if (!selected) return Promise.resolve();
    const opts: { status?: string; past?: boolean; userId?: number } = {};
    if (!initialUser) opts.userId = selected.id;
    if (filter === 'past') opts.past = true;
    else if (filter !== 'all') opts.status = filter;
    return getBookingHistory(token, opts)
      .then(data => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setBookings(sorted);
        setPage(1);
      })
      .catch(err => console.error('Error loading history:', err));
  }, [selected, filter, token, initialUser]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (initialUser) return;
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    const clientId = searchParams.get('clientId');
    if (id && name && clientId) {
      setSelected({ id: Number(id), name, client_id: Number(clientId) });
    }
  }, [searchParams, initialUser]);

  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));
  const paginated = bookings.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <h2>{initialUser ? 'Booking History' : 'User History'}</h2>
      {!initialUser && (
        <EntitySearch
          token={token}
          type="user"
          placeholder="Search by name or client ID"
          onSelect={u => setSelected(u as User)}
        />
      )}
      {selected && (
        <div>
          {selected.name && <h3>History for {selected.name}</h3>}
          <FormControl size="small" sx={{ minWidth: 160, mb: 1 }}>
            <InputLabel id="filter-label">Filter</InputLabel>
            <Select
              labelId="filter-label"
              value={filter}
              label="Filter"
              onChange={e => setFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="past">Past</MenuItem>
            </Select>
          </FormControl>
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={5}>No bookings.</td>
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
                      <td>
                        {['approved', 'submitted'].includes(b.status.toLowerCase()) && (
                          <Button
                            onClick={() => setRescheduleBooking(b)}
                            variant="outlined"
                            color="primary"
                          >
                            Reschedule
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <Button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                variant="outlined"
                color="primary"
              >
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                variant="outlined"
                color="primary"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
      {rescheduleBooking && (
        <RescheduleDialog
          open={!!rescheduleBooking}
          token={token}
          rescheduleToken={rescheduleBooking.reschedule_token}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={() => {
            loadBookings();
          }}
        />
      )}
    </div>
  );
}
