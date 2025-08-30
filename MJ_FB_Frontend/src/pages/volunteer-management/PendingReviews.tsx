import { useEffect, useState } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import Page from '../../components/Page';
import PageCard from '../../components/layout/PageCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ManageVolunteerShiftDialog from '../../components/ManageVolunteerShiftDialog';
import {
  getUnmarkedVolunteerBookings,
  updateVolunteerBookingStatus,
} from '../../api/volunteers';
import type { VolunteerBookingDetail } from '../../types';
import { formatTime } from '../../utils/time';

export default function PendingReviews() {
  const [bookings, setBookings] = useState<VolunteerBookingDetail[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [dialog, setDialog] = useState<VolunteerBookingDetail | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  useEffect(() => {
    getUnmarkedVolunteerBookings()
      .then(setBookings)
      .catch(() => {});
  }, []);

  const allChecked = bookings.length > 0 && selected.length === bookings.length;

  function toggle(id: number) {
    setSelected(s =>
      s.includes(id) ? s.filter(i => i !== id) : [...s, id],
    );
  }

  function toggleAll() {
    setSelected(allChecked ? [] : bookings.map(b => b.id));
  }

  async function bulkUpdate(status: 'completed' | 'no_show') {
    try {
      await Promise.all(
        selected.map(id => updateVolunteerBookingStatus(id, status)),
      );
      setBookings(b => b.filter(v => !selected.includes(v.id)));
      setSelected([]);
      setSeverity('success');
      setMessage('Shifts updated');
    } catch {
      setSeverity('error');
      setMessage('Update failed');
    }
  }

  function handleUpdated(msg: string, sev: any) {
    setSeverity(sev);
    setMessage(msg);
    if (dialog) {
      setBookings(b => b.filter(v => v.id !== dialog.id));
    }
  }

  return (
    <Page title="Pending Reviews">
      <PageCard>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              disabled={selected.length === 0}
              onClick={() => bulkUpdate('completed')}
            >
              Mark Completed
            </Button>
            <Button
              variant="contained"
              disabled={selected.length === 0}
              onClick={() => bulkUpdate('no_show')}
            >
              Mark No Show
            </Button>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox checked={allChecked} onChange={toggleAll} />
                </TableCell>
                <TableCell>Volunteer</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map(b => (
                <TableRow key={b.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(b.id)}
                      onChange={() => toggle(b.id)}
                    />
                  </TableCell>
                  <TableCell>{b.volunteer_name}</TableCell>
                  <TableCell>{b.role_name}</TableCell>
                  <TableCell>{b.date}</TableCell>
                  <TableCell>
                    {formatTime(b.start_time)} - {formatTime(b.end_time)}
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => setDialog(b)}>Review</Button>
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography>No pending reviews</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
        <ManageVolunteerShiftDialog
          open={Boolean(dialog)}
          booking={dialog}
          onClose={() => setDialog(null)}
          onUpdated={(m, s) => {
            setDialog(null);
            handleUpdated(m, s);
          }}
        />
        <FeedbackSnackbar
          open={Boolean(message)}
          message={message}
          severity={severity}
          onClose={() => setMessage('')}
        />
      </PageCard>
    </Page>
  );
}
