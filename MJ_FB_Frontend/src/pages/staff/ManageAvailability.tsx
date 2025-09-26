import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Divider,
  Stack,
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
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Add from '@mui/icons-material/Add';
import EventBusy from '@mui/icons-material/EventBusy';
import Restaurant from '@mui/icons-material/Restaurant';
import Block from '@mui/icons-material/Block';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { AlertColor } from '@mui/material';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import StyledTabs, { type TabItem } from '../../components/StyledTabs';
import Page from '../../components/Page';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import { useAuth } from '../../hooks/useAuth';
import {
  getHolidays,
  addHoliday,
  removeHoliday,
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
import { getAllSlots } from '../../api/slots';
import { formatTime } from '../../utils/time';
import type { Slot, Holiday } from '../../types';
import { formatLocaleDate, toDate, formatReginaDate } from '../../utils/date';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekOrdinals = ['1st', '2nd', '3rd', '4th', '5th'];
const selectMenuProps = { PaperProps: { sx: { width: 'auto', minWidth: 200 } } };

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
  const { access } = useAuth();
  const hasPantryAccess = access.includes('admin') || access.includes('pantry');

  const [holidays, setHolidays] = useState<Holiday[]>([]);
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

  const [confirm, setConfirm] = useState<{
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [slots, breaksData, recurringBlocked, blockedOnce, holidaysData] = await Promise.all([
          getAllSlots(),
          getBreaks(),
          getRecurringBlockedSlots(),
          getBlockedSlots(),
          getHolidays(),
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
            id: Date.parse(b.date!) + b.slotId,
            date: toDate(b.date),
            slotId: b.slotId,
            reason: b.reason ?? '',
          })),
        ]);
        setHolidays(holidaysData);
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

  const handleAddHoliday = async () => {
    if (!holidayDate) return;
    try {
      const dateStr = formatReginaDate(holidayDate);
      await addHoliday(dateStr, holidayReason.trim());
      setHolidays(prev => [
        ...prev,
        { date: dateStr, reason: holidayReason.trim() },
      ]);
      setHolidayReason('');
      showSnackbar('Holiday added', 'success');
    } catch {
      showSnackbar('Failed to add holiday', 'error');
    }
  };

  const handleRemoveHoliday = (date: string) => {
    setConfirm({
      message: 'Remove holiday?',
      onConfirm: async () => {
        try {
          await removeHoliday(formatReginaDate(date));
          setHolidays(prev => prev.filter(h => h.date !== date));
          showSnackbar('Holiday removed', 'success');
        } catch {
          showSnackbar('Failed to remove holiday', 'error');
        } finally {
          setConfirm(null);
        }
      },
    });
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

  const handleRemoveBlocked = (id: number) => {
    const slot = blockedSlots.find(b => b.id === id);
    if (!slot) return;
    setConfirm({
      message: 'Remove blocked slot?',
      onConfirm: async () => {
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
        } finally {
          setConfirm(null);
        }
      },
    });
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

  const handleRemoveBreak = (id: number) => {
    const brk = breaks.find(b => b.id === id);
    if (!brk) return;
    setConfirm({
      message: 'Remove break?',
      onConfirm: async () => {
        try {
          await removeBreak(brk.day, brk.slotId);
          setBreaks(prev => prev.filter(b => b.id !== id));
          showSnackbar('Break removed', 'success');
        } catch {
          showSnackbar('Failed to remove break', 'error');
        } finally {
          setConfirm(null);
        }
      },
    });
  };
  const tabs: TabItem[] = [
    {
      label: (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <span>Holidays</span>
        </Stack>
      ),
      icon: <EventBusy />,
      content: (
        <Card sx={{ borderRadius: 3 }}>
          <CardHeader title="Add Holiday" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DatePicker
                  label="Date"
                  value={holidayDate}
                  onChange={val => setHolidayDate(val as Date | null)}
                  slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Reason"
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  fullWidth
                  size="medium"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  
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
                key={h.date}
                secondaryAction={
                  <IconButton aria-label="remove" onClick={() => handleRemoveHoliday(h.date)}>
                    <DeleteOutline />
                  </IconButton>
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
      label: (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <span>Blocked Slots</span>
        </Stack>
      ),
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
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth sx={{ minWidth: 200 }}>
                      <InputLabel id="blocked-day-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Day
                      </InputLabel>
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
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth sx={{ minWidth: 200 }}>
                      <InputLabel id="blocked-week-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Week
                      </InputLabel>
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
                  onChange={val => setBlockedDate(val as Date | null)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              )}
              <FormControl fullWidth>
                <InputLabel id="slot-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Slot
                </InputLabel>
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
                  <IconButton aria-label="remove" onClick={() => handleRemoveBlocked(b.id)}>
                    <DeleteOutline />
                  </IconButton>
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
      label: (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <span>Staff Breaks</span>
        </Stack>
      ),
      icon: <Restaurant />,
      content: (
        <Card sx={{ borderRadius: 3 }}>
          <CardHeader title="Staff Breaks" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth sx={{ minWidth: 200 }}>
                  <InputLabel id="break-day-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Day
                  </InputLabel>
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
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth sx={{ minWidth: 200 }}>
                  <InputLabel id="break-slot-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Slot
                  </InputLabel>
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
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Reason"
                  value={breakReason}
                  onChange={(e) => setBreakReason(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <Button
                  variant="contained"
                  
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
                  <IconButton aria-label="remove" onClick={() => handleRemoveBreak(b.id)}>
                    <DeleteOutline />
                  </IconButton>
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
      <Page
        title="Manage Availability"
        header={hasPantryAccess ? <PantryQuickLinks /> : undefined}
      >
        <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 6 }}>
          <StyledTabs tabs={tabs} />
          <FeedbackSnackbar
            open={snackbar.open}
            message={snackbar.message}
            severity={snackbar.severity}
            onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          />
          {confirm && (
            <ConfirmDialog
              message={confirm.message}
              onConfirm={async () => {
                await confirm.onConfirm();
              }}
              onCancel={() => setConfirm(null)}
            />
          )}
        </Box>
      </Page>
    </LocalizationProvider>
  );
}

