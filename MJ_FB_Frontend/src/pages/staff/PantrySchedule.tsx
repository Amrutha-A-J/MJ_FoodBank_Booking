import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
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
  Box,
  Button,
  type AlertColor,
  useTheme,
  useMediaQuery,
  TextField,
  Typography,
  Stack,
  Paper,
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

  const handleAssignClose = () => {
    setAssignSlot(null);
    setSearchTerm("");
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
      setSnackbar({ message: msg, severity: "error" });
    }
  }

  async function addClientAndAssign() {
    if (!assignSlot) return;
    try {
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
      setSnackbar({ message: msg, severity: "error" });
    }
  }

  async function assignNewClient() {
    if (!assignSlot || !newClientName.trim()) return;
    try {
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
      setSnackbar({ message: msg, severity: "error" });
    }
  }

  const dateStr = formatDate(currentDate);
  const reginaDate = toZonedTime(currentDate, reginaTimeZone);
  const dayName = formatDate(currentDate, "dddd");
  const holidayObj = holidays.find((h) => h.date === dateStr);
  const isHoliday = !!holidayObj;
  const isWeekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
  const isClosed = isHoliday || isWeekend;

  const statusLabel = isClosed
    ? isHoliday
      ? `Closed for holiday${holidayObj?.reason ? ` · ${holidayObj.reason}` : ""}`
      : "Closed today"
    : "Open today";

  const statusColor: "default" | "success" = isClosed ? "default" : "success";

  const bookingsBySlot = useMemo(() => {
    return bookings.reduce<Record<string, Booking[]>>((acc, booking) => {
      const slotKey = String(booking.slot_id);
      if (!acc[slotKey]) {
        acc[slotKey] = [];
      }
      acc[slotKey].push(booking);
      return acc;
    }, {});
  }, [bookings]);

  const maxSlots = Math.max(
    0,
    ...slots.map((s) => {
      const bookingCount = bookingsBySlot[s.id]?.length ?? 0;
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
    const slotBookings = bookingsBySlot[slot.id] ?? [];
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
      <Paper
        variant="outlined"
        elevation={0}
        sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, mb: 2 }}
      >
        <Stack spacing={{ xs: 2, md: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            sx={{ flexWrap: "wrap", rowGap: 1 }}
          >
            <Typography
              component="h3"
              variant="h5"
              sx={{
                fontWeight: theme.typography.fontWeightBold,
                textAlign: { xs: "center", md: "left" },
              }}
            >
              {dateStr} - {dayName}
              {isHoliday
                ? ` (Holiday${
                    holidayObj?.reason ? ": " + holidayObj.reason : ""
                  })`
                : isWeekend
                  ? " (Weekend)"
                  : ""}
            </Typography>
            <Chip
              label={statusLabel}
              color={statusColor}
              sx={{ fontWeight: 500, alignSelf: { xs: "center", md: "flex-end" } }}
            />
          </Stack>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Button
              onClick={() => changeDay(-1)}
              variant="outlined"
              color="primary"
              size="large"
              fullWidth
              sx={{ flexBasis: { xs: "100%", md: "25%" }, flexGrow: 1 }}
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                setCurrentDate(
                  fromZonedTime(`${formatDate()}T00:00:00`, reginaTimeZone),
                )
              }
              variant="outlined"
              color="primary"
              size="large"
              fullWidth
              sx={{ flexBasis: { xs: "100%", md: "25%" }, flexGrow: 1 }}
            >
              Today
            </Button>
            <Box
              sx={{
                flexBasis: { xs: "100%", md: "25%" },
                flexGrow: 1,
                minWidth: { md: 220 },
              }}
            >
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
                        fromZonedTime(
                          `${formatDate(d)}T00:00:00`,
                          reginaTimeZone,
                        ),
                      );
                    }
                  }}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                    },
                  }}
                />
              </LocalizationProvider>
            </Box>
            <Button
              onClick={() => changeDay(1)}
              variant="outlined"
              color="primary"
              size="large"
              fullWidth
              sx={{ flexBasis: { xs: "100%", md: "25%" }, flexGrow: 1 }}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      </Paper>
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
          <Paper
            variant="outlined"
            elevation={0}
            sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, mb: 2 }}
          >
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Legend
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{ flexWrap: "wrap", rowGap: 1 }}
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
            </Stack>
          </Paper>
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
                  disableGutters
                  sx={{
                    mb: 0.5,
                    px: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      columnGap: 1,
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {u.name} ({u.client_id})
                      </Typography>
                      {(u.email || u.phone) && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {[u.email, u.phone].filter(Boolean).join(" · ")}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      onClick={() => assignExistingUser(u)}
                      variant="outlined"
                      color="primary"
                      sx={{
                        flexShrink: 0,
                        alignSelf: "center",
                        justifySelf: "end",
                      }}
                    >
                      Assign
                    </Button>
                  </Box>
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
