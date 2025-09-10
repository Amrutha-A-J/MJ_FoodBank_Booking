import { useState, useEffect, useMemo } from 'react';
import Page from '../../components/Page';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { formatDate } from '../../utils/date';
import { formatTime } from '../../utils/time';
import {
  getVolunteerBookingsByDate,
  updateVolunteerBookingStatus,
  rescheduleVolunteerBookingByToken,
} from '../../api/volunteers';
import type { VolunteerBooking, VolunteerBookingStatus } from '../../types';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import RescheduleDialog from '../../components/VolunteerRescheduleDialog';

type Grouped = Map<string, Map<string, Map<string, VolunteerBooking[]>>>;

export default function VolunteerDailyBookings() {
  const [date, setDate] = useState(dayjs());
  const [bookings, setBookings] = useState<VolunteerBooking[]>([]);
  const [message, setMessage] = useState('');
  const [reschedule, setReschedule] = useState<VolunteerBooking | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = formatDate(date);
        const data = await getVolunteerBookingsByDate(d);
        setBookings(data);
      } catch {
        setBookings([]);
      }
    })();
  }, [date]);

  const grouped: Grouped = useMemo(() => {
    const map: Grouped = new Map();
    bookings.forEach(b => {
      const cat = b.category_name || 'Other';
      let catMap = map.get(cat);
      if (!catMap) {
        catMap = new Map();
        map.set(cat, catMap);
      }
      const role = b.role_name;
      let roleMap = catMap.get(role);
      if (!roleMap) {
        roleMap = new Map();
        catMap.set(role, roleMap);
      }
      const shiftKey = `${b.start_time}-${b.end_time}`;
      const list = roleMap.get(shiftKey) || [];
      list.push(b);
      roleMap.set(shiftKey, list);
    });
    return map;
  }, [bookings]);

  async function handleStatusChange(
    booking: VolunteerBooking,
    status: VolunteerBookingStatus,
  ) {
    try {
      await updateVolunteerBookingStatus(booking.id, status);
      setBookings(prev =>
        prev.map(b => (b.id === booking.id ? { ...b, status } : b)),
      );
      setMessage('Status updated');
    } catch (e: any) {
      setMessage(e.message || 'Update failed');
    }
  }

  async function handleRescheduleSubmit(newDate: string, roleId: number) {
    if (!reschedule) return;
    try {
      await rescheduleVolunteerBookingByToken(
        reschedule.reschedule_token || '',
        roleId,
        newDate,
      );
      setMessage('Booking rescheduled');
      setReschedule(null);
      const d = formatDate(date);
      const data = await getVolunteerBookingsByDate(d);
      setBookings(data);
    } catch (e: any) {
      setMessage(e.message || 'Reschedule failed');
    }
  }

  return (
    <Page title="Volunteer Daily Bookings">
      <LocalizationProvider dateAdapter={AdapterDayjs} dateLibInstance={dayjs}>
        <DatePicker
          value={date}
          onChange={d => d && setDate(d)}
          slotProps={{ textField: { fullWidth: true } }}
        />
      </LocalizationProvider>

      <Box mt={2}>
        {Array.from(grouped.entries()).map(([cat, roleMap]) => (
          <Box key={cat} mb={2}>
            <Typography variant="h5" gutterBottom>
              {cat}
            </Typography>
            {Array.from(roleMap.entries()).map(([role, shiftMap]) => (
              <Box key={role} ml={2} mb={2}>
                <Typography variant="h6">{role}</Typography>
                {Array.from(shiftMap.entries()).map(([shiftKey, list]) => {
                  const [start, end] = shiftKey.split('-');
                  return (
                    <Card key={shiftKey} sx={{ mt: 1 }}>
                      <CardContent>
                        <Typography gutterBottom>
                          {formatTime(start)} - {formatTime(end)}
                        </Typography>
                        <Stack spacing={1}>
                          {list.map(b => (
                            <Stack
                              key={b.id}
                              direction="row"
                              spacing={2}
                              alignItems="center"
                            >
                              <Typography sx={{ flexGrow: 1 }}>
                                {b.volunteer_name}
                              </Typography>
                              <FormControl sx={{ minWidth: 150 }} size="medium">
                                <InputLabel id={`status-${b.id}`}>Status</InputLabel>
                                <Select
                                  labelId={`status-${b.id}`}
                                  label="Status"
                                  value={b.status}
                                  onChange={e =>
                                    handleStatusChange(
                                      b,
                                      e.target.value as VolunteerBookingStatus,
                                    )
                                  }
                                >
                                  <MenuItem value="completed">Completed</MenuItem>
                                  <MenuItem value="no_show">No Show</MenuItem>
                                  <MenuItem value="cancelled">Cancelled</MenuItem>
                                </Select>
                              </FormControl>
                              {b.reschedule_token && (
                                <Button
                                  variant="outlined"
                                  onClick={() => setReschedule(b)}
                                >
                                  Reschedule
                                </Button>
                              )}
                            </Stack>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      <RescheduleDialog
        open={!!reschedule}
        onClose={() => setReschedule(null)}
        onSubmit={handleRescheduleSubmit}
      />
      <FeedbackSnackbar
        open={!!message}
        message={message}
        onClose={() => setMessage('')}
        severity="success"
      />
    </Page>
  );
}

