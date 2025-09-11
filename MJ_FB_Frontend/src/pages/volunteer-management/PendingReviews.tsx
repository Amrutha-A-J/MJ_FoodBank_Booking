import { useEffect, useState, useMemo } from 'react';
import {
  Checkbox,
  Button,
  Stack,
  Typography,
  Tabs,
  Tab,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import Page from '../../components/Page';
import PageCard from '../../components/layout/PageCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ManageVolunteerShiftDialog from '../../components/ManageVolunteerShiftDialog';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import {
  getVolunteerBookingsForReview,
  updateVolunteerBookingStatus,
} from '../../api/volunteers';
import { getApiErrorMessage } from '../../api/helpers';
import type { VolunteerBookingDetail } from '../../types';
import { formatTime } from '../../utils/time';
import dayjs from '../../utils/date';

interface BookingRow extends VolunteerBookingDetail {
  select?: unknown;
  actions?: unknown;
  time?: string;
}

export default function PendingReviews() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [dialog, setDialog] = useState<VolunteerBookingDetail | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const weekStart = useMemo(() => dayjs().startOf('week'), []);
  const today = dayjs();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')), [weekStart]);
  const [dayIdx, setDayIdx] = useState(today.day());
  type StatusFilter = 'all' | 'approved' | 'no_show';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const startStr = weekStart.format('YYYY-MM-DD');
    const endStr = weekStart.add(6, 'day').format('YYYY-MM-DD');
    getVolunteerBookingsForReview(startStr, endStr)
      .then(data => setBookings(data as unknown as VolunteerBookingDetail[]))
      .catch(() => {});
  }, [weekStart]);

  useEffect(() => {
    setSelected([]);
    setStatusFilter('all');
  }, [dayIdx]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, BookingRow[]> = {};
    for (const b of bookings) {
      (map[b.date] ||= []).push(b);
    }
    return map;
  }, [bookings]);

  const currentDate = days[dayIdx];
  const dateStr = currentDate.format('YYYY-MM-DD');
  const isToday = dayIdx === today.day();
  const displayed: BookingRow[] = (bookingsByDate[dateStr] ?? []).filter(b =>
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
    } catch (err) {
      setSeverity('error');
      setMessage(getApiErrorMessage(err, 'Unable to update shifts'));
    }
  }

  function handleUpdated(msg: string, sev: AlertColor) {
    setSeverity(sev);
    setMessage(msg);
    if (dialog) {
      setBookings(b => b.filter(v => v.id !== dialog.id));
    }
  }

  const columns: Column<BookingRow>[] = [
    {
      field: 'select',
      header: '',
      render: (b: BookingRow) => (
        <Checkbox
          checked={selected.includes(b.id)}
          onChange={() => toggle(b.id)}
        />
      ),
    },
    { field: 'volunteer_name', header: 'Volunteer' },
    { field: 'role_name', header: 'Role' },
    { field: 'date', header: 'Date' },
    {
      field: 'time',
      header: 'Time',
      render: (b: BookingRow) => (
        <>
          {formatTime(b.start_time ?? '')} - {formatTime(b.end_time ?? '')}
        </>
      ),
    },
    { field: 'status', header: 'Status' },
    {
      field: 'actions',
      header: 'Actions',
      render: (b: BookingRow) => (
        <Button onClick={() => setDialog(b)}>Review</Button>
      ),
    },
  ];

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
            <FormControl sx={{ maxWidth: 200 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={(e: SelectChangeEvent<StatusFilter>) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="no_show">No Show</MenuItem>
              </Select>
            </FormControl>
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={<Checkbox checked={allChecked} onChange={toggleAll} />}
              label="Select All"
            />
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
          {displayed.length > 0 ? (
            <ResponsiveTable
              columns={columns}
              rows={displayed}
              getRowKey={b => b.id}
            />
          ) : (
            <Typography>No bookings</Typography>
          )}
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
