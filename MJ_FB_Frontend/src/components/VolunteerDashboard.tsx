import { useState, useEffect } from 'react';
import { getMyVolunteerBookings } from '../api/api';
import type { VolunteerBooking } from '../types';
import { formatTime } from '../utils/time';
import VolunteerSchedule from './VolunteerSchedule';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';

export default function VolunteerDashboard({ token }: { token: string }) {
  const [tab, setTab] = useState<'schedule' | 'history'>('schedule');
  const [history, setHistory] = useState<VolunteerBooking[]>([]);

  useEffect(() => {
    if (tab === 'history') {
      getMyVolunteerBookings(token)
        .then(setHistory)
        .catch(() => {});
    }
  }, [tab, token]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Volunteer Dashboard
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Schedule" value="schedule" />
        <Tab label="Booking History" value="history" />
      </Tabs>

      {tab === 'schedule' && <VolunteerSchedule token={token} />}

      {tab === 'history' && (
        <TableContainer component={Paper}>
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
      )}
    </Box>
  );
}

