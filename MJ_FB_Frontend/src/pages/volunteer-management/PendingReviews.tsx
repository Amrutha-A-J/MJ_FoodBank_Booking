import { useEffect, useState, useMemo } from 'react';
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
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import Page from '../../components/Page';
import PageCard from '../../components/layout/PageCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ManageVolunteerShiftDialog from '../../components/ManageVolunteerShiftDialog';
import {
  getVolunteerBookingsForReview,
  updateVolunteerBookingStatus,
} from '../../api/volunteers';
import type { VolunteerBookingDetail } from '../../types';
import { formatTime } from '../../utils/time';
import dayjs, { formatDate } from '../../utils/date';

export default function PendingReviews() {
  const [bookings, setBookings] = useState<VolunteerBookingDetail[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [dialog, setDialog] = useState<VolunteerBookingDetail | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const weekStart = useMemo(() => dayjs().startOf('week'), []);
  const today = dayjs();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')), [weekStart]);
  const [dayIdx, setDayIdx] = useState(today.day());
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'no_show'>('all');

  useEffect(() => {
    const startStr = weekStart.format('YYYY-MM-DD');
    const endStr = weekStart.add(6, 'day').format('YYYY-MM-DD');
    getVolunteerBookingsForReview(startStr, endStr)
      .then(setBookings)
      .catch(() => {});
  }, [weekStart]);

  useEffect(() => {
    setSelected([]);
    setStatusFilter('all');
  }, [dayIdx]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, VolunteerBookingDetail[]> = {};
    for (const b of bookings) {
      (map[b.date] ||= []).push(b);
    }
    return map;
  }, [bookings]);

  const currentDate = days[dayIdx];
  const dateStr = currentDate.format('YYYY-MM-DD');
  const isToday = dayIdx === today.day();
  const displayed = (bookingsByDate[dateStr] ?? []).filter(b =>
    isToday ? (statusFilter === 'all' || b.status === statusFilter) : b.status === 'no_show',
  );

  const allChecked = displayed.length > 0 && selected.length === displayed.length;

  function toggle(id: number) {
    setSelected(s => (s.includes(id) ? s.filter(i => i !== id) : [...s, id]));
  }

  function toggleAll() {
    setSelected(allChecked ? [] : displayed.map(b => b.id));
  }

  async function bulkUpdate(status: 'completed' | 'no_show') {
    try {
      await Promise.all(selected.map(id => updateVolunteerBookingStatus(id, status)));
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
          <Tabs
            value={dayIdx}
            onChange={(_e, v) => setDayIdx(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {days.map((d, i) => (
              <Tab key={i} label={d.format('ddd D')} />
            ))}
          </Tabs>
          {isToday && (
            <FormControl size="small" sx={{ maxWidth: 200 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={e => setStatusFilter(e.target.value as any)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="no_show">No Show</MenuItem>
              </Select>
            </FormControl>
          )}
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
                <TableCell>Status</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayed.map(b => (
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
                  <TableCell>{b.status}</TableCell>
                  <TableCell>
                    <Button onClick={() => setDialog(b)}>Review</Button>
                  </TableCell>
                </TableRow>
              ))}
              {displayed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography>No bookings</Typography>
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
