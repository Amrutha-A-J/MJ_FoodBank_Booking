import { useEffect, useState } from 'react';
import {
  Box,
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
import StyledTabs, { type TabItem } from '../../components/StyledTabs';
import Page from '../../components/Page';
import {
  getAllSlots,
  addBlockedSlot,
  addRecurringBlockedSlot,
  removeBlockedSlot,
  removeRecurringBlockedSlot,
  getBlockedSlots,
  addBreak,
  removeBreak,
  getBreaks,
  getRecurringBlockedSlots,
} from '../../api/bookings';
import { formatTime } from '../../utils/time';
import type { Slot } from '../../types';
import { formatLocaleDate, toDate, formatReginaDate } from '../../utils/date';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekOrdinals = ['1st', '2nd', '3rd', '4th', '5th'];
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
  const [holidayDate, setHolidayDate] = useState<Date | null>(toDate());
  const [holidayReason, setHolidayReason] = useState('');

  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotItem[]>([]);
  const [blockedDate, setBlockedDate] = useState<Date | null>(toDate());
  const [blockedSlotId, setBlockedSlotId] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [blockedDay, setBlockedDay] = useState('');
  const [blockedWeek, setBlockedWeek] = useState('');

  const [breaks, setBreaks] = useState<BreakItem[]>([]);
  const [breakDay, setBreakDay] = useState('');
  const [breakSlotId, setBreakSlotId] = useState('');
  const [breakReason, setBreakReason] = useState('');

  const [slotOptions, setSlotOptions] = useState<Slot[]>([]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message: string, severity: AlertColor) => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [slots, breaksData, recurringBlocked, blockedOnce] = await Promise.all([
          getAllSlots(),
          getBreaks(),
          getRecurringBlockedSlots(),
          getBlockedSlots(),
        ]);
        setSlotOptions(slots);
        setBreaks(
          breaksData.map(b => ({
            id: Number(`${b.dayOfWeek}${b.slotId}`),
            day: b.dayOfWeek,
            slotId: b.slotId,
            reason: b.reason ?? '',
          })),
        );
        setBlockedSlots([
          ...recurringBlocked.map(b => ({
            id: b.id,
            day: b.dayOfWeek,
            week: b.weekOfMonth,
            slotId: b.slotId,
            reason: b.reason ?? '',
          })),
          ...blockedOnce.map(b => ({
            id: Date.parse(b.date) + b.slotId,
            date: toDate(b.date),
            slotId: b.slotId,
            reason: b.reason ?? '',
          })),
        ]);
      } catch {
        showSnackbar('Failed to load availability data', 'error');
      }
    }
    loadData();
  }, []);

  const slotLabel = (id: number) => {
    const slot = slotOptions.find(s => Number(s.id) === id);
    return slot ? `${formatTime(slot.startTime)}-${formatTime(slot.endTime)}` : id;
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

  const handleAddBlocked = async () => {
    try {
      if (isRecurring) {
        if (!blockedDay || !blockedWeek || !blockedSlotId) return;
        await addRecurringBlockedSlot(
          Number(blockedDay),
          Number(blockedWeek),
          Number(blockedSlotId),
          blockedReason.trim(),
        );
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
        await addBlockedSlot(
          formatReginaDate(blockedDate),
          Number(blockedSlotId),
          blockedReason.trim(),
        );
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
    } catch {
      showSnackbar('Failed to block slot', 'error');
    }
  };

  const handleRemoveBlocked = async (id: number) => {
    const slot = blockedSlots.find(b => b.id === id);
    if (!slot) return;
    try {
      if (slot.date) {
        await removeBlockedSlot(
          formatReginaDate(slot.date),
          slot.slotId,
        );
      } else {
        await removeRecurringBlockedSlot(slot.id);
      }
      setBlockedSlots(prev => prev.filter(b => b.id !== id));
      showSnackbar('Blocked slot removed', 'success');
    } catch {
      showSnackbar('Failed to remove blocked slot', 'error');
    }
  };

  const handleAddBreak = async () => {
    if (!breakDay || !breakSlotId) return;
    try {
      await addBreak(
        Number(breakDay),
        Number(breakSlotId),
        breakReason.trim(),
      );
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
    } catch {
      showSnackbar('Failed to add break', 'error');
    }
  };

  const handleRemoveBreak = async (id: number) => {
    const brk = breaks.find(b => b.id === id);
    if (!brk) return;
    try {
      await removeBreak(brk.day, brk.slotId);
      setBreaks(prev => prev.filter(b => b.id !== id));
      showSnackbar('Break removed', 'success');
    } catch {
      showSnackbar('Failed to remove break', 'error');
    }
  };
  const tabs: TabItem[] = [
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
                <ListItemText primary={formatLocaleDate(h.date)} />
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
                  {slotOptions.map(s => (
                    <MenuItem key={s.id} value={s.id}>
                      {slotLabel(Number(s.id))}
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
                      ? formatLocaleDate(b.date)
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
                        {slotLabel(Number(s.id))}
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
      <Page title="Manage Availability">
        <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 6 }}>
          <StyledTabs tabs={tabs} />
          <FeedbackSnackbar
            open={snackbar.open}
            message={snackbar.message}
            severity={snackbar.severity}
            onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          />
        </Box>
      </Page>
    </LocalizationProvider>
  );
}

