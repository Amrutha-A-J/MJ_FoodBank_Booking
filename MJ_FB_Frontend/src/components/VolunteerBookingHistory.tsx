import { useEffect, useState } from 'react';
import { getMyVolunteerBookings } from '../api/volunteers';
import type { VolunteerBooking } from '../types';
import { formatTime } from '../utils/time';
import Page from './Page';
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';

export default function VolunteerBookingHistory({ token }: { token: string }) {
  const [history, setHistory] = useState<VolunteerBooking[]>([]);

  useEffect(() => {
    getMyVolunteerBookings(token)
      .then(setHistory)
      .catch(() => {});
  }, [token]);

  return (
    <Page title="Booking History">
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map(h => (
              <TableRow key={h.id}>
                <TableCell>{h.role_name}</TableCell>
                <TableCell>{h.date}</TableCell>
                <TableCell>
                  {formatTime(h.start_time)} - {formatTime(h.end_time)}
                </TableCell>
                <TableCell>{h.status}</TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No bookings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Page>
  );
}

