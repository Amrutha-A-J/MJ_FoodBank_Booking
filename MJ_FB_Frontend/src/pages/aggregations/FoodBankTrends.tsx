import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
  type AlertColor,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import Announcement from '@mui/icons-material/Announcement';
import Page from '../../components/Page';
import SectionCard from '../../components/dashboard/SectionCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ClientVisitTrendChart from '../../components/dashboard/ClientVisitTrendChart';
import ClientVisitBreakdownChart from '../../components/dashboard/ClientVisitBreakdownChart';
import MonetaryDonationTrendChart from '../../components/dashboard/MonetaryDonationTrendChart';
import MonetaryGivingTierChart from '../../components/dashboard/MonetaryGivingTierChart';
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
import FormDialog from '../../components/FormDialog';
import WarehouseCompositionChart, {
  type WarehouseCompositionDatum,
} from '../../components/dashboard/WarehouseCompositionChart';
import WarehouseTrendChart, {
  type WarehouseTrendDatum,
} from '../../components/dashboard/WarehouseTrendChart';
import { useAuth } from '../../hooks/useAuth';
import useMonetaryDonorInsights from '../../hooks/useMonetaryDonorInsights';
import type { MonetaryDonorMonthlySummary } from '../../api/monetaryDonors';
import type { MonetaryDonorMonthBucket } from '../../api/monetaryDonors';

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

function formatVisitMonthLabel(month: string) {
  return formatLocaleDate(`${month}-01`, {
    month: 'long',
    year: 'numeric',
  });
}

function toErrorMessage(error: unknown, fallback: string, forbidden: string) {
  const err = error as ApiError | undefined;
  if (err?.status === 403) {
    return forbidden;
  }
  return getApiErrorMessage(error, fallback);
}

const emptyEvents: EventGroups = { today: [], upcoming: [], past: [] };

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

const givingTierLabels: Record<MonetaryDonorMonthBucket, string> = {
  '1-100': '$1–$100',
  '101-500': '$101–$500',
  '501-1000': '$501–$1,000',
  '1001-10000': '$1,001–$10,000',
  '10001-30000': '$10,001–$30,000',
};

type TrendCategory = 'pantry' | 'donation' | 'warehouse';

const trendOptions: Array<{ value: TrendCategory; label: string }> = [
  { value: 'pantry', label: 'Pantry trends' },
  { value: 'donation', label: 'Donation trends' },
  { value: 'warehouse', label: 'Warehouse trends' },
];

export default function FoodBankTrends() {
  const { role } = useAuth();
  const canViewMonetaryInsights = role === 'staff' || role === 'admin';

  const [selectedTrend, setSelectedTrend] = useState<TrendCategory>('pantry');

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [visitStats, setVisitStats] = useState<VisitStat[]>([]);
  const [pantryLoading, setPantryLoading] = useState(true);
  const [pantryError, setPantryError] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitStat | null>(null);

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
  const [selectedComposition, setSelectedComposition] = useState<{
    month: string;
    donations: number;
    surplus: number;
    pigPound: number;
    petFood: number;
    outgoing: number;
  } | null>(null);
  const [selectedWarehousePoint, setSelectedWarehousePoint] = useState<WarehouseTrendDatum | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ open: false, message: '', severity: 'error' });

  const [selectedDonationMonth, setSelectedDonationMonth] =
    useState<MonetaryDonorMonthlySummary | null>(null);

  const donorInsights = useMonetaryDonorInsights({
    months: 12,
    endMonth: currentMonthKey,
    enabled: canViewMonetaryInsights,
  });

  const donorInsightsPermissionMessage = 'You do not have permission to view monetary donor insights.';

  const donorInsightsErrorMessage = donorInsights.isError
    ? toErrorMessage(
        donorInsights.error,
        'Unable to load monetary donor insights.',
        donorInsightsPermissionMessage,
      )
    : null;

  const donorInsightsForbidden = (donorInsights.error as ApiError | undefined)?.status === 403;

  const donationTrendData = useMemo(
    () =>
      (donorInsights.data?.monthly ?? []).map(month => ({
        month: month.month,
        amount: month.totalAmount,
        donationCount: month.donationCount,
        donorCount: month.donorCount,
        averageGift: month.averageGift,
      })),
    [donorInsights.data?.monthly],
  );

  const givingTierData = useMemo(() => {
    const current = donorInsights.data?.givingTiers.currentMonth;
    if (!current) return [];
    const previous = donorInsights.data?.givingTiers.previousMonth;

    return (Object.entries(current.tiers) as Array<[
      MonetaryDonorMonthBucket,
      { donorCount: number; totalAmount: number },
    ]>).map(([bucket, values]) => {
      const prevValues = previous?.tiers[bucket];
      const delta = prevValues ? values.donorCount - prevValues.donorCount : undefined;
      return {
        tierLabel: givingTierLabels[bucket],
        donorCount: values.donorCount,
        amount: values.totalAmount,
        deltaFromPreviousMonth: delta === undefined ? undefined : delta,
      };
    });
  }, [donorInsights.data?.givingTiers]);

  const hasGivingTierData = useMemo(
    () => givingTierData.some(datum => datum.donorCount > 0 || datum.amount > 0),
    [givingTierData],
  );

  const givingTierSubtitle = useMemo(() => {
    const currentMonth = donorInsights.data?.givingTiers.currentMonth.month;
    if (!currentMonth) return undefined;
    const currentLabel = formatVisitMonthLabel(currentMonth);
    const previousMonth = donorInsights.data?.givingTiers.previousMonth?.month;
    if (!previousMonth) return currentLabel;
    return `${currentLabel} vs ${formatVisitMonthLabel(previousMonth)}`;
  }, [donorInsights.data?.givingTiers]);

  const ytdSummary = donorInsights.data?.ytd;

  useEffect(() => {
    if (!canViewMonetaryInsights) {
      setSelectedDonationMonth(null);
      return;
    }

    const monthly = donorInsights.data?.monthly ?? [];
    if (monthly.length) {
      setSelectedDonationMonth(monthly[monthly.length - 1]);
    } else {
      setSelectedDonationMonth(null);
    }
  }, [donorInsights.data?.monthly, canViewMonetaryInsights]);

  const handleDonationPointSelect = useCallback(
    (datum: { month?: string } | undefined) => {
      if (!datum?.month) return;
      const match = donorInsights.data?.monthly?.find(month => month.month === datum.month);
      if (match) {
        setSelectedDonationMonth(match);
      }
    },
    [donorInsights.data?.monthly],
  );

  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  };

  useEffect(() => {
    if (!canViewMonetaryInsights) return;
    if (donorInsightsForbidden) return;
    if (donorInsightsErrorMessage) {
      showError(donorInsightsErrorMessage);
    }
  }, [
    donorInsightsErrorMessage,
    donorInsightsForbidden,
    canViewMonetaryInsights,
  ]);

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
        const filtered = combined.filter(
          row => row.year < currentYear || row.month <= currentMonth,
        );
        const minKey = currentYear * 12 + currentMonth - 11;
        const stats: VisitStat[] = filtered
          .filter(row => row.year * 12 + row.month >= minKey)
          .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
          .map(row => ({
            month: `${row.year}-${String(row.month).padStart(2, '0')}`,
            clients: row.orders,
            adults: row.adults,
            children: row.children,
          }));
        setVisitStats(stats);
        setSelectedVisit(stats[stats.length - 1] ?? null);
      } catch (error) {
        if (!active) return;
        const message = toErrorMessage(
          error,
          'Unable to load pantry trends.',
          'You do not have permission to view pantry trends.',
        );
        setPantryError(message);
        setVisitStats([]);
        setSelectedVisit(null);
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

  type CompositionChartDatum = WarehouseCompositionDatum & WarehouseTrendDatum;

  const chartData = useMemo<CompositionChartDatum[]>(
    () =>
      warehouseTotals.map(total => ({
        month: monthName(total.month),
        incoming:
          (total.donations ?? 0) +
          (total.surplus ?? 0) +
          (total.pigPound ?? 0) +
          (total.petFood ?? 0),
        outgoing: total.outgoingDonations ?? 0,
        donations: total.donations ?? 0,
        surplus: total.surplus ?? 0,
        pigPound: total.pigPound ?? 0,
        petFood: total.petFood ?? 0,
      })),
    [warehouseTotals],
  );

  useEffect(() => {
    setSelectedWarehousePoint(prev => {
      if (!prev) return null;
      const match = chartData.find(d => d.month === prev.month);
      return match
        ? {
            month: match.month,
            incoming: match.incoming,
            outgoing: match.outgoing,
            petFood: match.petFood,
          }
        : null;
    });
  }, [chartData]);

  const handleCompositionClick = useCallback(
    (data: { payload?: WarehouseCompositionDatum } | undefined) => {
      if (!data?.payload) return;
      setSelectedComposition({
        month: data.payload.month,
        donations: data.payload.donations ?? 0,
        surplus: data.payload.surplus ?? 0,
        pigPound: data.payload.pigPound ?? 0,
        petFood: data.payload.petFood ?? 0,
        outgoing: data.payload.outgoing ?? 0,
      });
    },
    [],
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
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <FormControl size="small" sx={{ maxWidth: 220 }}>
              <InputLabel id="trend-category-label">Trend view</InputLabel>
              <Select
                labelId="trend-category-label"
                label="Trend view"
                value={selectedTrend}
                onChange={event => setSelectedTrend(event.target.value as TrendCategory)}
              >
                {trendOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack spacing={3}>
              {selectedTrend === 'pantry' ? (
                <SectionCard title="Pantry & Community">
                  <Box
                    display="grid"
                    gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }}
                    gap={2}
                  >
                    <Card variant="outlined">
                      <CardHeader title="Monthly Visits" />
                      <CardContent
                        sx={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}
                      >
                        {pantryLoading ? (
                          <Box
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            height="100%"
                          >
                            <CircularProgress size={24} />
                          </Box>
                        ) : pantryError ? (
                          <Typography variant="body2" color="text.secondary">
                            {pantryError}
                          </Typography>
                        ) : visitStats.length ? (
                          <>
                            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                              <ClientVisitTrendChart data={visitStats} onPointSelect={setSelectedVisit} />
                            </Box>
                            {selectedVisit ? (
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                sx={{ mt: 2 }}
                              >
                                <Typography variant="subtitle2">
                                  {formatVisitMonthLabel(selectedVisit.month)}
                                </Typography>
                                <Chip
                                  label={`Total visits: ${selectedVisit.clients.toLocaleString()}`}
                                  color="error"
                                  variant="outlined"
                                />
                              </Stack>
                            ) : null}
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No data available.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardHeader title="Adults vs Children" />
                      <CardContent
                        sx={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}
                      >
                        {pantryLoading ? (
                          <Box
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            height="100%"
                          >
                            <CircularProgress size={24} />
                          </Box>
                        ) : pantryError ? (
                          <Typography variant="body2" color="text.secondary">
                            {pantryError}
                          </Typography>
                        ) : visitStats.length ? (
                          <>
                            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                              <ClientVisitBreakdownChart
                                data={visitStats}
                                onPointSelect={setSelectedVisit}
                              />
                            </Box>
                            {selectedVisit ? (
                              <Stack spacing={1.5} sx={{ mt: 2 }}>
                                <Typography variant="subtitle2">
                                  {formatVisitMonthLabel(selectedVisit.month)}
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                  <Chip
                                    label={`Adults: ${selectedVisit.adults.toLocaleString()}`}
                                    color="success"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={`Children: ${selectedVisit.children.toLocaleString()}`}
                                    color="info"
                                    variant="outlined"
                                  />
                                </Stack>
                              </Stack>
                            ) : null}
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No data available.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                </SectionCard>
              ) : null}

              {selectedTrend === 'donation' ? (
                <SectionCard title="Monetary Donations">
                  {!canViewMonetaryInsights || donorInsightsForbidden ? (
                    <Typography variant="body2" color="text.secondary">
                      {donorInsightsPermissionMessage}
                    </Typography>
                  ) : donorInsights.isLoading ? (
                    <Box display="flex" justifyContent="center" py={2}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : donorInsightsErrorMessage ? (
                    <Typography variant="body2" color="text.secondary">
                      {donorInsightsErrorMessage}
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {ytdSummary ? (
                        <Stack spacing={1}>
                          <Typography variant="subtitle2">Year to date</Typography>
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            alignItems={{ xs: 'flex-start', md: 'center' }}
                          >
                            <Chip
                              data-testid="donation-ytd-total"
                              label={`YTD total: ${currencyFormatter.format(ytdSummary.totalAmount)}`}
                              color="primary"
                              variant="outlined"
                            />
                            <Chip
                              data-testid="donation-ytd-average"
                              label={`Avg gift: ${currencyFormatter.format(ytdSummary.averageGift)}`}
                              color="success"
                              variant="outlined"
                            />
                            <Chip
                              label={`Donations: ${ytdSummary.donationCount.toLocaleString()}`}
                              color="info"
                              variant="outlined"
                            />
                            <Chip
                              label={`Donors: ${ytdSummary.donorCount.toLocaleString()}`}
                              color="warning"
                              variant="outlined"
                            />
                          </Stack>
                        </Stack>
                      ) : null}
                      <Card variant="outlined">
                        <CardHeader
                          title="Donation Trend (12 months)"
                          subheader="Click a point to view monthly totals."
                          action={
                            donorInsights.isFetching && !donorInsights.isLoading ? (
                              <CircularProgress size={20} />
                            ) : undefined
                          }
                        />
                        <CardContent
                          sx={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}
                        >
                          {donationTrendData.length ? (
                            <>
                              <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                <MonetaryDonationTrendChart
                                  data={donationTrendData}
                                  onPointSelect={handleDonationPointSelect}
                                />
                              </Box>
                              {selectedDonationMonth ? (
                                <Stack
                                  direction={{ xs: 'column', sm: 'row' }}
                                  spacing={1.5}
                                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                                  sx={{ mt: 2 }}
                                >
                                  <Typography variant="subtitle2" data-testid="donation-trend-month">
                                    {formatVisitMonthLabel(selectedDonationMonth.month)}
                                  </Typography>
                                  <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                    flexWrap="wrap"
                                    useFlexGap
                                  >
                                    <Chip
                                      label={`Amount: ${currencyFormatter.format(selectedDonationMonth.totalAmount)}`}
                                      color="primary"
                                      variant="outlined"
                                      data-testid="donation-trend-amount"
                                    />
                                    <Chip
                                      label={`Donations: ${selectedDonationMonth.donationCount.toLocaleString()}`}
                                      color="info"
                                      variant="outlined"
                                    />
                                    <Chip
                                      label={`Donors: ${selectedDonationMonth.donorCount.toLocaleString()}`}
                                      color="warning"
                                      variant="outlined"
                                    />
                                    <Chip
                                      label={`Avg gift: ${currencyFormatter.format(selectedDonationMonth.averageGift)}`}
                                      color="success"
                                      variant="outlined"
                                    />
                                  </Stack>
                                </Stack>
                              ) : null}
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No data available.
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                      {hasGivingTierData ? (
                        <Card variant="outlined">
                          <CardHeader title="Giving Tiers" subheader={givingTierSubtitle} />
                          <CardContent sx={{ minHeight: 320 }}>
                            <MonetaryGivingTierChart data={givingTierData} />
                          </CardContent>
                        </Card>
                      ) : null}
                    </Stack>
                  )}
                </SectionCard>
              ) : null}

              {selectedTrend === 'warehouse' ? (
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

                    <Stack spacing={2}>
                      <Card variant="outlined">
                        <CardHeader title="Monthly Trend" />
                        <CardContent
                          sx={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}
                        >
                          {warehouseLoading ? (
                            <Box
                              display="flex"
                              justifyContent="center"
                              alignItems="center"
                              height="100%"
                            >
                              <CircularProgress size={24} />
                            </Box>
                          ) : warehouseError ? (
                            <Typography variant="body2" color="text.secondary">
                              {warehouseError}
                            </Typography>
                          ) : hasWarehouseData ? (
                            <>
                              <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                <WarehouseTrendChart
                                  data={chartData}
                                  onPointSelect={datum =>
                                    setSelectedWarehousePoint({
                                      month: datum.month,
                                      incoming: datum.incoming,
                                      outgoing: datum.outgoing,
                                      petFood: datum.petFood,
                                    })
                                  }
                                />
                              </Box>
                              {selectedWarehousePoint ? (
                                <Stack
                                  direction={{ xs: 'column', sm: 'row' }}
                                  spacing={1.5}
                                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                                  sx={{ mt: 2 }}
                                >
                                  <Typography variant="subtitle2">
                                    {selectedWarehousePoint.month}
                                    {selectedYear ? ` ${selectedYear}` : ''}
                                  </Typography>
                                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <Chip
                                      label={`Incoming: ${fmtLbs(selectedWarehousePoint.incoming)}`}
                                      color="success"
                                      variant="outlined"
                                      data-testid="warehouse-trend-incoming"
                                    />
                                    <Chip
                                      label={`Outgoing: ${fmtLbs(selectedWarehousePoint.outgoing)}`}
                                      color="error"
                                      variant="outlined"
                                      data-testid="warehouse-trend-outgoing"
                                    />
                                    <Chip
                                      label={`Pet Food: ${fmtLbs(selectedWarehousePoint.petFood)}`}
                                      color="secondary"
                                      variant="outlined"
                                      data-testid="warehouse-trend-pet-food"
                                    />
                                  </Stack>
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                  Click a point to view totals for that month.
                                </Typography>
                              )}
                            </>
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
                            <Box
                              display="flex"
                              justifyContent="center"
                              alignItems="center"
                              height="100%"
                            >
                              <CircularProgress size={24} />
                            </Box>
                          ) : warehouseError ? (
                            <Typography variant="body2" color="text.secondary">
                              {warehouseError}
                            </Typography>
                          ) : hasWarehouseData ? (
                            <WarehouseCompositionChart
                              data={chartData}
                              onBarClick={handleCompositionClick}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No data available.
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Stack>

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
                                      {donor.name}
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
              ) : null}
            </Stack>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
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

      <FormDialog
        open={Boolean(selectedComposition)}
        onClose={() => setSelectedComposition(null)}
        maxWidth="xs"
      >
        <DialogTitle>
          Composition for {selectedComposition?.month}
          {selectedYear ? ` ${selectedYear}` : ''}
        </DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            <ListItem>
              <ListItemText
                primary="Donations"
                secondary={fmtLbs(selectedComposition?.donations)}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Surplus"
                secondary={fmtLbs(selectedComposition?.surplus)}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Pig Pound"
                secondary={fmtLbs(selectedComposition?.pigPound)}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Pet Food"
                secondary={fmtLbs(selectedComposition?.petFood)}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Outgoing"
                secondary={fmtLbs(selectedComposition?.outgoing)}
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedComposition(null)}>Close</Button>
        </DialogActions>
      </FormDialog>
    </Page>
  );
}
