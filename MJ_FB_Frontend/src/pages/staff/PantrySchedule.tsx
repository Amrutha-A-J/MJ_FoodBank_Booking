import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  getSlots,
  getBookings,
  getHolidays,
  createBookingForUser,
  createBookingForNewClient,
} from "../../api/bookings";
import { searchUsers, addClientById, type UserSearchResult } from "../../api/users";
import type { Slot, Holiday, Booking } from "../../types";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { formatTime } from "../../utils/time";
import { formatDate, addDays, reginaStartOfDay } from "../../utils/date";
import VolunteerScheduleTable from "../../components/VolunteerScheduleTable";
import ScheduleCards from "../../components/ScheduleCards";
import FeedbackSnackbar from "../../components/FeedbackSnackbar";
import {
  Button,
  type AlertColor,
  useTheme,
  useMediaQuery,
  TextField,
  Typography,
  Stack,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import ManageBookingDialog from "../../components/ManageBookingDialog";
import PantryQuickLinks from "../../components/PantryQuickLinks";
import Page from "../../components/Page";
import FormDialog from "../../components/FormDialog";
import {
  LocalizationProvider,
  DatePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "../../utils/date";

const reginaTimeZone = "America/Regina";

export default function PantrySchedule({
  clientIds,
  searchUsersFn,
}: {
  clientIds?: number[];
  searchUsersFn?: (search: string) => Promise<UserSearchResult[]>;
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    const todayStr = formatDate();
    return fromZonedTime(`${todayStr}T00:00:00`, reginaTimeZone);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [assignSlot, setAssignSlot] = useState<Slot | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: AlertColor;
    action?: ReactNode;
  } | null>(null);
  const [manageBooking, setManageBooking] = useState<Booking | null>(null);
  const [assignMessage, setAssignMessage] = useState("");

  const handleAssignClose = () => {
    setAssignSlot(null);
    setSearchTerm("");
    setAssignMessage("");
    setIsNewClient(false);
    setNewClientName("");
  };

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const neutralCellBg =
    theme.palette.mode === "dark"
      ? theme.palette.grey[800]
      : theme.palette.grey[200];
  const statusColors: Record<string, string> = {
    approved: "rgb(228,241,228)",
    no_show: "rgb(255, 200, 200)",
    visited: "rgb(111,146,113)",
  };

  const loadData = useCallback(async () => {
    const dateStr = formatDate(currentDate);
    const reginaDate = toZonedTime(currentDate, reginaTimeZone);
    const weekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
    const holiday = holidays.some((h) => h.date === dateStr);
    if (weekend || holiday) {
      setSlots([]);
      setBookings([]);
      return;
    }
    try {
      const [slotsData, bookingsData] = await Promise.all([
        getSlots(dateStr, true),
        getBookings({ date: dateStr, clientIds }),
      ]);
      setSlots(slotsData);
      const bookingsArray = Array.isArray(bookingsData)
        ? bookingsData
        : [bookingsData];
      const filtered = bookingsArray.filter(
        (b: Booking) => b.status.toLowerCase() !== "cancelled",
      );
      setBookings(filtered);
    } catch (err) {
      console.error(err);
    }
  }, [currentDate, holidays, clientIds]);

  useEffect(() => {
    getHolidays()
      .then(setHolidays)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (formatDate(currentDate) !== formatDate()) return;
    const reloadIfVisible = () => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    };
    const interval = setInterval(reloadIfVisible, 60_000);
    document.addEventListener("visibilitychange", reloadIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", reloadIfVisible);
    };
  }, [currentDate, loadData]);

  useEffect(() => {
    if (assignSlot && searchTerm.length >= 3) {
      const delay = setTimeout(() => {
        (searchUsersFn || searchUsers)(searchTerm)
          .then((data) => setUserResults(data.slice(0, 5)))
          .catch(() => setUserResults([]));
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setUserResults([]);
    }
  }, [searchTerm, assignSlot]);

  function changeDay(delta: number) {
    setCurrentDate((d) =>
      reginaStartOfDay(addDays(d, delta)).toDate()
    );
  }


  async function assignExistingUser(user: UserSearchResult) {
    if (!assignSlot) return;
    try {
      setAssignMessage("");
      await createBookingForUser(
        user.client_id,
        parseInt(assignSlot.id),
        formatDate(currentDate),
        true,
      );
      setAssignSlot(null);
      setSearchTerm("");
      await loadData();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to assign user";
      setAssignMessage(msg);
    }
  }

  async function addClientAndAssign() {
    if (!assignSlot) return;
    try {
      setAssignMessage("");
      await addClientById(searchTerm);
      const results = await (searchUsersFn || searchUsers)(searchTerm);
      setUserResults(results.slice(0, 5));
      if (results[0]) {
        await assignExistingUser(results[0]);
      } else {
        throw new Error("Client not found after adding");
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to add client";
      setAssignMessage(msg);
    }
  }

  async function assignNewClient() {
    if (!assignSlot || !newClientName.trim()) return;
    try {
      setAssignMessage("");
      await createBookingForNewClient(
        newClientName.trim(),
        parseInt(assignSlot.id),
        formatDate(currentDate),
      );
      setAssignSlot(null);
      setNewClientName("");
      setIsNewClient(false);
      await loadData();
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Failed to assign new client";
      setAssignMessage(msg);
    }
  }

  const dateStr = formatDate(currentDate);
  const reginaDate = toZonedTime(currentDate, reginaTimeZone);
  const dayName = formatDate(currentDate, "dddd");
  const holidayObj = holidays.find((h) => h.date === dateStr);
  const isHoliday = !!holidayObj;
  const isWeekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
  const isClosed = isHoliday || isWeekend;

  const maxSlots = Math.max(
    0,
    ...slots.map((s) => {
      const bookingCount = bookings.filter(
        (b) => b.slot_id === parseInt(s.id),
      ).length;
      return Math.max(s.maxCapacity ?? 0, bookingCount);
    }),
  );

  const displaySlots: Slot[] = [...slots];
  if (
    !isClosed &&
    !displaySlots.some(
      (s) => s.startTime === "12:00:00" || s.startTime === "12:30:00",
    )
  ) {
    displaySlots.push({
      id: "lunch-break",
      startTime: "12:00:00",
      endTime: "13:00:00",
      status: "break",
      reason: "Lunch",
    });
  }
  displaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const rows = displaySlots.map((slot) => {
    if (slot.status === "break") {
      return {
        time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
        cells: [
          {
            content: `Break${slot.reason ? ` - ${slot.reason}` : ""}`,
            colSpan: maxSlots,
            backgroundColor: neutralCellBg,
          },
        ],
      };
    }
    if (slot.status === "blocked") {
      return {
        time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
        cells: [
          {
            content: `Blocked${slot.reason ? ` - ${slot.reason}` : ""}`,
            colSpan: maxSlots,
            backgroundColor: neutralCellBg,
          },
        ],
      };
    }
    const slotBookings = bookings.filter(
      (b) => b.slot_id === parseInt(slot.id),
    );
    return {
      time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
      cells: Array.from({ length: maxSlots }).map((_, i) => {
        const booking = slotBookings[i];
        const withinCapacity = i < (slot.maxCapacity ?? 0);
        const overCapacity = !!booking && !withinCapacity;
        let content;
        let onClick;
        let backgroundColor: string | undefined;
        if (booking) {
          const isNew = booking.newClientId || booking.client_id === null;
          const text = isNew
            ? `[NEW CLIENT] ${booking.user_name}`
            : `${booking.user_name} (${booking.client_id})`;
          if (overCapacity) {
            content = <span>{text}</span>;
            backgroundColor = theme.palette.warning.light;
          } else {
            content = text;
            backgroundColor = statusColors[booking.status];
          }
          if (booking.status === "approved") {
            onClick = () => setManageBooking(booking);
          }
        } else if (withinCapacity && !isClosed) {
          content = "";
          onClick = () => {
            setAssignSlot(slot);
            setAssignMessage("");
          };
        } else if (!withinCapacity) {
          content = (
            <Typography variant="caption" color="text.secondary">
              Over capacity
            </Typography>
          );
        } else {
          content = "";
        }
        return {
          content,
          backgroundColor,
          onClick,
        };
      }),
    };
  });

  return (
    <Page title="Pantry Schedule" header={<PantryQuickLinks />}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Button
          onClick={() => changeDay(-1)}
          variant="outlined"
          color="primary"
        >
          Previous
        </Button>
        <Typography
          component="h3"
          variant="h5"
          sx={{ fontWeight: theme.typography.fontWeightBold }}
        >
          {dateStr} - {dayName}
          {isHoliday
            ? ` (Holiday${holidayObj?.reason ? ": " + holidayObj.reason : ""})`
            : isWeekend
              ? " (Weekend)"
              : ""}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            onClick={() =>
              setCurrentDate(
                fromZonedTime(`${formatDate()}T00:00:00`, reginaTimeZone),
              )
            }
            variant="outlined"
            
            color="primary"
          >
            Today
          </Button>
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            dateLibInstance={dayjs}
          >
            <DatePicker
              value={dayjs(currentDate)}
              format="YYYY-MM-DD"
              onChange={(d) => {
                if (d) {
                  setCurrentDate(
                    fromZonedTime(`${formatDate(d)}T00:00:00`, reginaTimeZone),
                  );
                }
              }}
              slotProps={{ textField: { size: "small" } }}
            />
          </LocalizationProvider>
          <Button
            onClick={() => changeDay(1)}
            variant="outlined"
            color="primary"
          >
            Next
          </Button>
        </Stack>
      </Stack>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ""}
        severity={snackbar?.severity}
        action={snackbar?.action}
      />
      {isClosed ? (
        <Typography align="center">
          Moose Jaw food bank is closed for {dayName}
        </Typography>
      ) : (
        <>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ mb: 1 }}
          >
            {[
              { label: "Approved", color: statusColors.approved },
              { label: "No Show", color: statusColors.no_show },
              { label: "Visited", color: statusColors.visited },
              {
                label: "Capacity Exceeded",
                color: theme.palette.warning.light,
              },
            ].map((item) => (
              <Chip
                key={item.label}
                label={item.label}
                
                sx={{
                  bgcolor: item.color,
                  color: theme.palette.getContrastText(item.color),
                }}
              />
            ))}
          </Stack>
          {isSmallScreen ? (
            <ScheduleCards maxSlots={maxSlots} rows={rows} />
          ) : (
            <VolunteerScheduleTable maxSlots={maxSlots} rows={rows} />
          )}
        </>
      )}

      {assignSlot && (
        <FormDialog
          open={!!assignSlot}
          onClose={handleAssignClose}
          maxWidth="xs"
          sx={{ zIndex: (t) => t.zIndex.modal }}
          PaperProps={{ sx: { p: 2, borderRadius: 2 } }}
        >
          <DialogTitle>Assign User</DialogTitle>
          <DialogContent>
            <TextField
              label="Search users by name/email/phone/client ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              margin="dense"
            />
            <List sx={{ maxHeight: 150, overflowY: "auto" }}>
              {userResults.map((u) => (
                <ListItem
                  key={u.client_id}
                  sx={{ mb: 0.5 }}
                  secondaryAction={
                    <Button
                      onClick={() => assignExistingUser(u)}
                      variant="outlined"
                      color="primary"
                      
                      sx={{ ml: 0.5 }}
                    >
                      Assign
                    </Button>
                  }
                >
                  <ListItemText primary={`${u.name} (${u.client_id})`} />
                </ListItem>
              ))}
              {searchTerm.length >= 3 && userResults.length === 0 && (
                <>
                  <ListItem>
                    <ListItemText primary="No search results." />
                  </ListItem>
                  <ListItem>
                    <Button
                      
                      variant="text"
                      onClick={addClientAndAssign}
                    >
                      Add existing client to the app
                    </Button>
                  </ListItem>
                </>
              )}
            </List>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isNewClient}
                  onChange={(e) => setIsNewClient(e.target.checked)}
                  
                />
              }
              label="New client"
              sx={{ mt: 1 }}
            />
            {isNewClient && (
              <TextField
                label="Name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                fullWidth
                margin="dense"
              />
            )}
            <FeedbackSnackbar
              open={!!assignMessage}
              onClose={() => setAssignMessage("")}
              message={assignMessage}
              severity="error"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAssignClose} variant="outlined" color="primary">
              Close
            </Button>
            {isNewClient && (
              <Button
                onClick={assignNewClient}
                variant="contained"
                color="primary"
                
                disabled={!newClientName.trim()}
              >
                Assign new client
              </Button>
            )}
          </DialogActions>
        </FormDialog>
      )}

      {manageBooking && (
        <ManageBookingDialog
          open={!!manageBooking}
          booking={manageBooking}
          onClose={() => setManageBooking(null)}
          onUpdated={(message, severity) => {
            setSnackbar({ message, severity });
            loadData();
          }}
        />
      )}
    </Page>
  );
}
