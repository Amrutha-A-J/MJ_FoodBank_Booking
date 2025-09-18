import { useState, useEffect, useCallback } from 'react';
import {
  getVolunteerRolesForVolunteer,
  createRecurringVolunteerBooking,
  getRecurringVolunteerBookings,
  getMyVolunteerBookings,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
} from '../../api/volunteers';
import type {
  VolunteerRole,
  VolunteerRecurringBooking,
  VolunteerBooking,
} from '../../types';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import VolunteerBottomNav from '../../components/VolunteerBottomNav';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import { formatDate } from '../../utils/date';
import { formatTime } from '../../utils/time';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VolunteerRecurringBookings() {
  const today = formatDate();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [series, setSeries] = useState<VolunteerRecurringBooking[]>([]);
  const [bookings, setBookings] = useState<VolunteerBooking[]>([]);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const [tab, setTab] = useState(0);
  const [endDateError, setEndDateError] = useState('');

  const roleMap = new Map(roles.map(r => [r.id, r]));

  const loadData = useCallback(async () => {
    try {
      const [roleData, seriesData, bookingData] = await Promise.all([
        getVolunteerRolesForVolunteer(startDate),
        getRecurringVolunteerBookings(),
        getMyVolunteerBookings(),
      ]);
      setRoles(roleData);
      setSeries(seriesData);
      setBookings(bookingData);
    } catch (err) {
      console.error(err);
      setSeverity('error');
      setMessage('Failed to load bookings');
    }
  }, [startDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const roleId = Number(selectedRole);
    if (!roleId) return;
    if (!endDate) {
      setEndDateError('Select an end date');
      return;
    }
    try {
      await createRecurringVolunteerBooking(
        roleId,
        startDate,
        frequency,
        frequency === 'weekly' ? weekdays : undefined,
        endDate,
      );
      setSeverity('success');
      setMessage('Recurring booking created');
      setSelectedRole('');
      setWeekdays([]);
      setEndDate('');
      setEndDateError('');
      await loadData();
    } catch (err: any) {
      setSeverity('error');
      setMessage(err.message || 'Failed to create booking');
    }
  }

  async function cancelOccurrence(id: number) {
    try {
      await cancelVolunteerBooking(id);
      setSeverity('success');
      setMessage('Booking cancelled');
      await loadData();
    } catch {
      setSeverity('error');
      setMessage('Failed to cancel booking');
    }
  }

  async function cancelSeries(id: number) {
    try {
      await cancelRecurringVolunteerBooking(id);
      setSeverity('success');
      setMessage('Series cancelled');
      await loadData();
    } catch {
      setSeverity('error');
      setMessage('Failed to cancel series');
    }
  }

  const groupedRoles = roles.reduce((acc: Map<number, { category: string; roles: VolunteerRole[] }>, r) => {
    const group = acc.get(r.category_id) || { category: r.category_name, roles: [] };
    group.roles.push(r);
    acc.set(r.category_id, group);
    return acc;
  }, new Map<number, { category: string; roles: VolunteerRole[] }>());

  return (
    <Page title="Recurring Bookings">
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Add a recurring shift" />
        <Tab label="Manage recurring shifts" />
      </Tabs>
      {tab === 0 && (
        <Box
          component="form"
          onSubmit={submit}
          noValidate
          sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}
        >
          <FormControl>
            <InputLabel id="role-label">Role</InputLabel>
            <Select labelId="role-label" value={selectedRole} label="Role" onChange={e => setSelectedRole(e.target.value as string)}>
              <MenuItem value="">Select role</MenuItem>
              {(
                Array.from(
                  groupedRoles.values(),
                ) as Array<{ category: string; roles: VolunteerRole[] }>
              ).flatMap(g => [
                <ListSubheader key={`${g.category}-header`}>{g.category}</ListSubheader>,
                ...g.roles.map((r: VolunteerRole) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name} ({formatTime(r.start_time)}–{formatTime(r.end_time)})
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
          <TextField
            label="Start date"
            type="date"
            
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl>
            <InputLabel id="freq-label">Frequency</InputLabel>
            <Select labelId="freq-label" value={frequency} label="Frequency" onChange={e => setFrequency(e.target.value as 'daily' | 'weekly')}>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
            </Select>
          </FormControl>
          {frequency === 'weekly' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {weekdayLabels.map((d, i) => (
                <FormControlLabel
                  key={d}
                  control={
                    <Checkbox
                      checked={weekdays.includes(i)}
                      onChange={() =>
                        setWeekdays(prev =>
                          prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i],
                        )
                      }
                    />
                  }
                  label={d}
                />
              ))}
            </Box>
          )}
          <TextField
            label="End date"
            type="date"

            value={endDate}
            onChange={e => {
              setEndDate(e.target.value);
              if (e.target.value) {
                setEndDateError('');
              }
            }}
            InputLabelProps={{ shrink: true }}
            required
            error={!!endDateError}
            helperText={endDateError}
          />
          <Button type="submit" variant="outlined" color="primary">
            Create
          </Button>
        </Box>
      )}
      {tab === 1 && (
        <Box>
          {series.length === 0 ? (
            <Typography>No recurring shift</Typography>
          ) : (
            series.map(s => {
              const role = roleMap.get(s.role_id);
              const occ = bookings.filter(
                b => b.recurring_id === s.id && b.date >= today,
              );
              return (
                <Box key={s.id} sx={{ mb: 3 }}>
                  <Typography variant="h6">
                    {role?.name} ({formatTime(role?.start_time || '')}–{formatTime(role?.end_time || '')})
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {formatDate(s.start_date)} - {s.end_date ? formatDate(s.end_date) : 'No end'} · {s.pattern}
                    {s.pattern === 'weekly' && s.days_of_week
                      ? ` (${s.days_of_week.map(d => weekdayLabels[d]).join(', ')})`
                      : ''}
                  </Typography>
                  <Button
                    onClick={() => cancelSeries(s.id)}
                    variant="outlined"
                    color="primary"
                    sx={{ mb: 1 }}
                  >
                    Cancel Series
                  </Button>
                  {occ.map(o => (
                    <Box key={o.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ flexGrow: 1 }}>
                        {formatDate(o.date)} ({formatTime(o.start_time)}–{formatTime(o.end_time)})
                      </Typography>
                      <Button
                        onClick={() => cancelOccurrence(o.id)}
                        variant="outlined"
                        color="primary"
                        
                      >
                        Cancel
                      </Button>
                    </Box>
                  ))}
                </Box>
              );
            })
          )}
        </Box>
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
      <VolunteerBottomNav />
    </Page>
  );
}

