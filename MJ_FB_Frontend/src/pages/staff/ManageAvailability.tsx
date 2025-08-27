import { useState } from 'react';
import {
  Box,
  Paper,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Divider,
  Stack,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { DeleteOutline, Add, EventBusy, Restaurant, Block } from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { AlertColor } from '@mui/material';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import SectionTabs from '../../components/SectionTabs';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekOrdinals = ['1st', '2nd', '3rd', '4th', '5th'];
const slotOptions = [
  { id: 1, label: '9:00–10:00' },
  { id: 2, label: '10:00–11:00' },
  { id: 3, label: '11:00–12:00' },
];
const selectMenuProps = { PaperProps: { sx: { width: 'auto', minWidth: 200 } } };

interface HolidayItem {
  id: number;
  date: Date;
  reason: string;
}

interface BlockedSlotItem {
  id: number;
  date?: Date;
  day?: number;
  week?: number;
  slotId: number;
  reason: string;
}

interface BreakItem {
  id: number;
  day: number;
  slotId: number;
  reason: string;
}

export default function ManageAvailability() {
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidayDate, setHolidayDate] = useState<Date | null>(new Date());
  const [holidayReason, setHolidayReason] = useState('');

  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotItem[]>([]);
  const [blockedDate, setBlockedDate] = useState<Date | null>(new Date());
  const [blockedSlotId, setBlockedSlotId] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [blockedDay, setBlockedDay] = useState('');
  const [blockedWeek, setBlockedWeek] = useState('');

  const [breaks, setBreaks] = useState<BreakItem[]>([]);
  const [breakDay, setBreakDay] = useState('');
  const [breakSlotId, setBreakSlotId] = useState('');
  const [breakReason, setBreakReason] = useState('');

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message: string, severity: AlertColor) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddHoliday = () => {
    if (!holidayDate) return;
    setHolidays(prev => [
      ...prev,
      { id: Date.now(), date: holidayDate, reason: holidayReason.trim() },
    ]);
    setHolidayReason('');
    showSnackbar('Holiday added', 'success');
  };

  const handleRemoveHoliday = (id: number) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
    showSnackbar('Holiday removed', 'error');
  };

  const handleAddBlocked = () => {
    if (isRecurring) {
      if (!blockedDay || !blockedWeek || !blockedSlotId) return;
      setBlockedSlots(prev => [
        ...prev,
        {
          id: Date.now(),
          day: Number(blockedDay),
          week: Number(blockedWeek),
          slotId: Number(blockedSlotId),
          reason: blockedReason.trim(),
        },
      ]);
    } else {
      if (!blockedDate || !blockedSlotId) return;
      setBlockedSlots(prev => [
        ...prev,
        {
          id: Date.now(),
          date: blockedDate,
          slotId: Number(blockedSlotId),
          reason: blockedReason.trim(),
        },
      ]);
    }
    setBlockedReason('');
    showSnackbar('Slot blocked', 'success');
  };

  const handleRemoveBlocked = (id: number) => {
    setBlockedSlots(prev => prev.filter(b => b.id !== id));
    showSnackbar('Blocked slot removed', 'error');
  };

  const handleAddBreak = () => {
    if (!breakDay || !breakSlotId) return;
    setBreaks(prev => [
      ...prev,
      {
        id: Date.now(),
        day: Number(breakDay),
        slotId: Number(breakSlotId),
        reason: breakReason.trim(),
      },
    ]);
    setBreakReason('');
    showSnackbar('Break added', 'success');
  };

  const handleRemoveBreak = (id: number) => {
    setBreaks(prev => prev.filter(b => b.id !== id));
    showSnackbar('Break removed', 'error');
  };

  const slotLabel = (id: number) => slotOptions.find(s => s.id === id)?.label || id;

  const tabs = [
    {
      label: 'Holidays',
      icon: <EventBusy />,
      content: (
        <Card sx={{ borderRadius: 3 }}>
          <CardHeader title="Add Holiday" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Date"
                  value={holidayDate}
                  onChange={setHolidayDate}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Reason"
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddHoliday}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
          <List>
            {holidays.map(h => (
              <ListItem
                key={h.id}
                secondaryAction={
                  <Tooltip title="Remove">
                    <IconButton aria-label="remove" onClick={() => handleRemoveHoliday(h.id)}>
                      <DeleteOutline />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText primary={h.date.toLocaleDateString()} />
                {h.reason && <Chip label={h.reason} sx={{ ml: 1 }} />}
              </ListItem>
            ))}
            {holidays.length === 0 && (
              <ListItem>
                <ListItemText primary="No holidays" />
              </ListItem>
            )}
          </List>
        </Card>
      ),
    },
    {
      label: 'Blocked Slots',
      icon: <Block />,
      content: (
        <Card sx={{ borderRadius: 3 }}>
          <CardHeader title="Block Slot" />
          <CardContent>
            <Stack spacing={2}>
              <FormControlLabel
                control={<Checkbox checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />}
                label="Recurring"
              />
              {isRecurring ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth sx={{ minWidth: 200 }}>
                      <InputLabel id="blocked-day-label">Day</InputLabel>
                      <Select
                        labelId="blocked-day-label"
                        value={blockedDay}
                        label="Day"
                        onChange={(e) => setBlockedDay(e.target.value)}
                        MenuProps={selectMenuProps}
                      >
                        {days.map((d, i) => (
                          <MenuItem key={d} value={i}>
                            {d}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth sx={{ minWidth: 200 }}>
                      <InputLabel id="blocked-week-label">Week</InputLabel>
                      <Select
                        labelId="blocked-week-label"
                        value={blockedWeek}
                        label="Week"
                        onChange={(e) => setBlockedWeek(e.target.value)}
                        MenuProps={selectMenuProps}
                      >
                        {weekOrdinals.map((w, i) => (
                          <MenuItem key={w} value={i + 1}>
                            {w}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              ) : (
                <DatePicker
                  label="Date"
                  value={blockedDate}
                  onChange={setBlockedDate}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              )}
              <FormControl fullWidth>
                <InputLabel id="slot-label">Slot</InputLabel>
                <Select
                  labelId="slot-label"
                  value={blockedSlotId}
                  label="Slot"
                  onChange={(e) => setBlockedSlotId(e.target.value)}
                  MenuProps={selectMenuProps}
                >
                  {slotOptions.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Reason"
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={handleAddBlocked}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add
              </Button>
            </Stack>
          </CardContent>
          <Divider />
          <List>
            {blockedSlots.map(b => (
              <ListItem
                key={b.id}
                secondaryAction={
                  <Tooltip title="Remove">
                    <IconButton aria-label="remove" onClick={() => handleRemoveBlocked(b.id)}>
                      <DeleteOutline />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText
                  primary={
                    b.date
                      ? b.date.toLocaleDateString()
                      : `${weekOrdinals[(b.week || 1) - 1]} ${days[b.day || 0]}`
                  }
                  secondary={slotLabel(b.slotId)}
                />
                {b.reason && <Chip label={b.reason} sx={{ ml: 1 }} />}
              </ListItem>
            ))}
            {blockedSlots.length === 0 && (
              <ListItem>
                <ListItemText primary="No blocked slots" />
              </ListItem>
            )}
          </List>
        </Card>
      ),
    },
    {
      label: 'Staff Breaks',
      icon: <Restaurant />,
      content: (
        <Card sx={{ borderRadius: 3 }}>
          <CardHeader title="Staff Breaks" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth sx={{ minWidth: 200 }}>
                  <InputLabel id="break-day-label">Day</InputLabel>
                  <Select
                    labelId="break-day-label"
                    value={breakDay}
                    label="Day"
                    onChange={(e) => setBreakDay(e.target.value)}
                    MenuProps={selectMenuProps}
                  >
                    {days.map((d, i) => (
                      <MenuItem key={d} value={i}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth sx={{ minWidth: 200 }}>
                  <InputLabel id="break-slot-label">Slot</InputLabel>
                  <Select
                    labelId="break-slot-label"
                    value={breakSlotId}
                    label="Slot"
                    onChange={(e) => setBreakSlotId(e.target.value)}
                    MenuProps={selectMenuProps}
                  >
                    {slotOptions.map(s => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Reason"
                  value={breakReason}
                  onChange={(e) => setBreakReason(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddBreak}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
          <List>
            {breaks.map(b => (
              <ListItem
                key={b.id}
                secondaryAction={
                  <Tooltip title="Remove">
                    <IconButton aria-label="remove" onClick={() => handleRemoveBreak(b.id)}>
                      <DeleteOutline />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText primary={`${days[b.day]} - ${slotLabel(b.slotId)}`} />
                {b.reason && <Chip label={b.reason} sx={{ ml: 1 }} />}
              </ListItem>
            ))}
            {breaks.length === 0 && (
              <ListItem>
                <ListItemText primary="No breaks" />
              </ListItem>
            )}
          </List>
        </Card>
      ),
    },
  ];
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Manage Availability
        </Typography>
        <Paper sx={{ p: 2 }}>
          <SectionTabs ariaLabel="availability tabs" tabs={tabs} />
        </Paper>
        <FeedbackSnackbar
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        />
      </Box>
    </LocalizationProvider>
  );
}

