import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  type AlertColor,
} from '@mui/material';
import Announcement from '@mui/icons-material/Announcement';
import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import Page from '../../components/Page';
import SectionCard from '../../components/dashboard/SectionCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ClientVisitTrendChart from '../../components/dashboard/ClientVisitTrendChart';
import ClientVisitBreakdownChart from '../../components/dashboard/ClientVisitBreakdownChart';
import EventList from '../../components/EventList';
import { getEvents, type EventGroups } from '../../api/events';
import { getPantryMonthly } from '../../api/pantryAggregations';
import type { VisitStat } from '../../api/clientVisits';
import {
  getWarehouseOverall,
  getWarehouseOverallYears,
  type WarehouseOverall,
} from '../../api/warehouseOverall';
import { getTopDonors, type TopDonor } from '../../api/donors';
import { getTopReceivers, type TopReceiver } from '../../api/outgoingReceivers';
import { formatLocaleDate } from '../../utils/date';
import { getApiErrorMessage, type ApiError } from '../../api/client';

interface PantryMonthlyRow {
  month: number;
  orders: number;
  adults: number;
  children: number;
}

function monthName(month: number) {
  return formatLocaleDate(`${2000}-${String(month).padStart(2, '0')}-01`, {
    month: 'short',
  });
}

function fmtLbs(value?: number) {
  const safe = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return `${safe.toLocaleString(undefined, { maximumFractionDigits: 0 })} lbs`;
}

function toErrorMessage(error: unknown, fallback: string, forbidden: string) {
  const err = error as ApiError | undefined;
  if (err?.status === 403) {
    return forbidden;
  }
  return getApiErrorMessage(error, fallback);
}

const emptyEvents: EventGroups = { today: [], upcoming: [], past: [] };

export default function FoodBankTrends() {
  const theme = useTheme();
  const [visitStats, setVisitStats] = useState<VisitStat[]>([]);
  const [pantryLoading, setPantryLoading] = useState(true);
  const [pantryError, setPantryError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventGroups>(emptyEvents);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [years, setYears] = useState<number[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>();
  const [warehouseTotals, setWarehouseTotals] = useState<WarehouseOverall[]>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [donors, setDonors] = useState<TopDonor[]>([]);
  const [donorError, setDonorError] = useState<string | null>(null);
  const [receivers, setReceivers] = useState<TopReceiver[]>([]);
  const [receiverError, setReceiverError] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ open: false, message: '', severity: 'error' });

  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  };

  useEffect(() => {
    let active = true;
    async function loadPantry() {
      setPantryLoading(true);
      setPantryError(null);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      try {
        const [curr, prev] = await Promise.all([
          getPantryMonthly(currentYear, currentMonth),
          getPantryMonthly(currentYear - 1, currentMonth),
        ]);
        if (!active) return;
        const prevRows = Array.isArray(prev) ? (prev as PantryMonthlyRow[]) : [];
        const currRows = Array.isArray(curr) ? (curr as PantryMonthlyRow[]) : [];
        const combined = [
          ...prevRows.map(row => ({ ...row, year: currentYear - 1 })),
          ...currRows.map(row => ({ ...row, year: currentYear })),
        ];
        const minKey = currentYear * 12 + currentMonth - 11;
        const stats: VisitStat[] = combined
          .filter(row => row.year * 12 + row.month >= minKey)
          .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
          .map(row => ({
            month: `${row.year}-${String(row.month).padStart(2, '0')}`,
            clients: row.orders,
            adults: row.adults,
            children: row.children,
          }));
        setVisitStats(stats);
      } catch (error) {
        if (!active) return;
        const message = toErrorMessage(
          error,
          'Unable to load pantry trends.',
          'You do not have permission to view pantry trends.',
        );
        setPantryError(message);
        setVisitStats([]);
        showError(message);
      } finally {
        if (active) setPantryLoading(false);
      }
    }
    loadPantry();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setEventsLoading(true);
    setEventsError(null);
    getEvents()
      .then(result => {
        if (!active) return;
        setEvents(result ?? emptyEvents);
      })
      .catch(error => {
        if (!active) return;
        const message = toErrorMessage(
          error,
          'Unable to load events.',
          'You do not have permission to view events.',
        );
        setEvents(emptyEvents);
        setEventsError(message);
        showError(message);
      })
      .finally(() => {
        if (active) setEventsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setYearsLoading(true);
    setWarehouseError(null);
    getWarehouseOverallYears()
      .then(data => {
        if (!active) return;
        const sortedYears = Array.isArray(data) ? data : [];
        setYears(sortedYears);
        setSelectedYear(sortedYears[0]);
      })
      .catch(error => {
        if (!active) return;
        const message = toErrorMessage(
          error,
          'Unable to load warehouse years.',
          'You do not have permission to view warehouse trends.',
        );
        setYears([]);
        setSelectedYear(undefined);
        setWarehouseError(message);
        showError(message);
      })
      .finally(() => {
        if (active) setYearsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof selectedYear !== 'number') {
      setWarehouseTotals([]);
      setDonors([]);
      setReceivers([]);
      return;
    }
    let active = true;
    setWarehouseLoading(true);
    setWarehouseError(null);
    setDonorError(null);
    setReceiverError(null);
    Promise.allSettled([
      getWarehouseOverall(selectedYear),
      getTopDonors(selectedYear),
      getTopReceivers(selectedYear),
    ]).then(results => {
      if (!active) return;
      const [totalsRes, donorsRes, receiversRes] = results;
      if (totalsRes.status === 'fulfilled') {
        setWarehouseTotals(totalsRes.value ?? []);
      } else {
        const message = toErrorMessage(
          totalsRes.reason,
          'Unable to load warehouse trends.',
          'You do not have permission to view warehouse trends.',
        );
        setWarehouseTotals([]);
        setWarehouseError(message);
        showError(message);
      }
      if (donorsRes.status === 'fulfilled') {
        setDonors(donorsRes.value ?? []);
      } else {
        const message = toErrorMessage(
          donorsRes.reason,
          'Unable to load donor rankings.',
          'You do not have permission to view donor rankings.',
        );
        setDonors([]);
        setDonorError(message);
        showError(message);
      }
      if (receiversRes.status === 'fulfilled') {
        setReceivers(receiversRes.value ?? []);
      } else {
        const message = toErrorMessage(
          receiversRes.reason,
          'Unable to load receiver rankings.',
          'You do not have permission to view receiver rankings.',
        );
        setReceivers([]);
        setReceiverError(message);
        showError(message);
      }
      setWarehouseLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedYear]);

  const visibleEvents = useMemo(
    () => [...events.today, ...events.upcoming],
    [events],
  );

  const chartData = useMemo(
    () =>
      warehouseTotals.map(total => ({
        month: monthName(total.month),
        incoming:
          (total.donations ?? 0) +
          (total.surplus ?? 0) +
          (total.pigPound ?? 0),
        outgoing: total.outgoingDonations ?? 0,
        donations: total.donations ?? 0,
        surplus: total.surplus ?? 0,
        pigPound: total.pigPound ?? 0,
      })),
    [warehouseTotals],
  );

  const hasWarehouseData = chartData.length > 0;

  return (
    <Page title="Food Bank Trends">
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            <SectionCard title="Pantry & Community">
              <Box
                display="grid"
                gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }}
                gap={2}
              >
                <Card variant="outlined">
                  <CardHeader title="Monthly Visits" />
                  <CardContent sx={{ height: 320 }}>
                    {pantryLoading ? (
                      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <CircularProgress size={24} />
                      </Box>
                    ) : pantryError ? (
                      <Typography variant="body2" color="text.secondary">
                        {pantryError}
                      </Typography>
                    ) : visitStats.length ? (
                      <ClientVisitTrendChart data={visitStats} />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No data available.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardHeader title="Adults vs Children" />
                  <CardContent sx={{ height: 320 }}>
                    {pantryLoading ? (
                      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <CircularProgress size={24} />
                      </Box>
                    ) : pantryError ? (
                      <Typography variant="body2" color="text.secondary">
                        {pantryError}
                      </Typography>
                    ) : visitStats.length ? (
                      <ClientVisitBreakdownChart data={visitStats} />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No data available.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </SectionCard>

            <SectionCard title="Warehouse Overview">
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Annual warehouse totals
                  </Typography>
                  <FormControl sx={{ minWidth: 120 }} size="small">
                    <InputLabel id="warehouse-year-label">Year</InputLabel>
                    <Select
                      labelId="warehouse-year-label"
                      label="Year"
                      value={selectedYear ?? ''}
                      onChange={event => setSelectedYear(Number(event.target.value))}
                      disabled={yearsLoading || years.length === 0}
                    >
                      {years.map(year => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                <Box
                  display="grid"
                  gridTemplateColumns={{ xs: '1fr', lg: '2fr 1fr' }}
                  gap={2}
                >
                  <Card variant="outlined">
                    <CardHeader title="Monthly Trend" />
                    <CardContent sx={{ height: 300 }}>
                      {warehouseLoading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                          <CircularProgress size={24} />
                        </Box>
                      ) : warehouseError ? (
                        <Typography variant="body2" color="text.secondary">
                          {warehouseError}
                        </Typography>
                      ) : hasWarehouseData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="incoming"
                              name="Incoming"
                              stroke={theme.palette.success.main}
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="outgoing"
                              name="Outgoing"
                              stroke={theme.palette.error.main}
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No data available.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardHeader title="Composition" subheader="By month" />
                    <CardContent sx={{ height: 300 }}>
                      {warehouseLoading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                          <CircularProgress size={24} />
                        </Box>
                      ) : warehouseError ? (
                        <Typography variant="body2" color="text.secondary">
                          {warehouseError}
                        </Typography>
                      ) : hasWarehouseData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Legend />
                            <Bar
                              dataKey="donations"
                              name="Donations"
                              stackId="a"
                              fill={theme.palette.primary.main}
                            />
                            <Bar
                              dataKey="surplus"
                              name="Surplus"
                              stackId="a"
                              fill={theme.palette.warning.main}
                            />
                            <Bar
                              dataKey="pigPound"
                              name="Pig Pound"
                              stackId="a"
                              fill={theme.palette.info.main}
                            />
                            <Bar
                              dataKey="outgoing"
                              name="Outgoing"
                              stackId="a"
                              fill={theme.palette.error.main}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No data available.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>

                <Box
                  display="grid"
                  gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }}
                  gap={2}
                >
                  <Card variant="outlined">
                    <CardHeader
                      title="Top Donors"
                      subheader="This year by total lbs"
                      action={<Chip label={donors.length} />}
                    />
                    <CardContent>
                      {warehouseLoading ? (
                        <Box display="flex" justifyContent="center" py={2}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : donorError ? (
                        <Typography variant="body2" color="text.secondary">
                          {donorError}
                        </Typography>
                      ) : donors.length ? (
                        <Stack spacing={1}>
                          {donors.map((donor, index) => (
                            <Stack key={index} direction="row" justifyContent="space-between">
                              <Box>
                                <Typography variant="body2">
                                  {donor.firstName} {donor.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {donor.lastDonationISO
                                    ? `Last: ${formatLocaleDate(donor.lastDonationISO)}`
                                    : 'No recent donation'}
                                </Typography>
                              </Box>
                              <Typography variant="body2">{fmtLbs(donor.totalLbs)}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No data available.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardHeader
                      title="Top Receivers"
                      subheader="This year by total lbs"
                      action={<Chip label={receivers.length} />}
                    />
                    <CardContent>
                      {warehouseLoading ? (
                        <Box display="flex" justifyContent="center" py={2}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : receiverError ? (
                        <Typography variant="body2" color="text.secondary">
                          {receiverError}
                        </Typography>
                      ) : receivers.length ? (
                        <Stack spacing={1}>
                          {receivers.map((receiver, index) => (
                            <Stack key={index} direction="row" justifyContent="space-between">
                              <Box>
                                <Typography variant="body2">{receiver.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {receiver.lastPickupISO
                                    ? `Last: ${formatLocaleDate(receiver.lastPickupISO)}`
                                    : 'No recent pickup'}
                                </Typography>
                              </Box>
                              <Typography variant="body2">{fmtLbs(receiver.totalLbs)}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No data available.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="Notices & Events" icon={<Announcement color="primary" />}>
            {eventsLoading ? (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={24} />
              </Box>
            ) : eventsError ? (
              <Typography variant="body2" color="text.secondary">
                {eventsError}
              </Typography>
            ) : visibleEvents.length ? (
              <EventList events={visibleEvents} limit={5} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No upcoming events.
              </Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Page>
  );
}
