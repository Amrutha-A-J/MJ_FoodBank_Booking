import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
} from 'recharts';
import { format, isValid, parseISO } from 'date-fns';
import Page from '../../components/Page';
import DonorQuickLinks from '../../components/DonorQuickLinks';
import SectionCard from '../../components/dashboard/SectionCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import useMonetaryDonorInsights from '../../hooks/useMonetaryDonorInsights';
import type {
  MonetaryDonorInsightsResponse,
  MonetaryDonorTier,
} from '../../api/monetaryDonorInsights';

const TIERS: MonetaryDonorTier[] = [
  '1-100',
  '101-500',
  '501-1000',
  '1001-10000',
  '10001-30000',
];

function formatMonthLabel(month: string) {
  const date = parseISO(`${month}-01`);
  return isValid(date) ? format(date, 'MMM yyyy') : month;
}

function formatDateLabel(dateIso: string | null | undefined) {
  if (!dateIso) return 'No donations yet';
  const date = parseISO(dateIso.length === 7 ? `${dateIso}-01` : dateIso);
  return isValid(date) ? format(date, 'MMM d, yyyy') : 'No donations yet';
}

function MonetaryTrendChart({
  data,
  currency,
  numberFormatter,
}: {
  data: Array<
    MonetaryDonorInsightsResponse['monthly'][number] & {
      monthLabel: string;
    }
  >;
  currency: Intl.NumberFormat;
  numberFormatter: Intl.NumberFormat;
}) {
  const theme = useTheme();

  return (
    <ResponsiveContainer width="100%" height={300} data-testid="monetary-trend-chart">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="monthLabel" />
        <YAxis
          yAxisId="amount"
          tickFormatter={value => currency.format(value as number)}
          width={90}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          tickFormatter={value => numberFormatter.format(value as number)}
          width={70}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value: number, name) =>
            name === 'Total raised'
              ? currency.format(value)
              : numberFormatter.format(value)
          }
          labelFormatter={label => label as string}
        />
        <Legend />
        <Line
          yAxisId="amount"
          type="monotone"
          dataKey="totalAmount"
          name="Total raised"
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="donationCount"
          name="Donations"
          stroke={theme.palette.secondary.main}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function GivingTierChart({
  data,
  currentLabel,
  previousLabel,
  currency,
}: {
  data: Array<{ tier: MonetaryDonorTier; currentAmount: number; previousAmount: number }>;
  currentLabel: string;
  previousLabel: string;
  currency: Intl.NumberFormat;
}) {
  const theme = useTheme();
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="giving-tier-chart">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="tier" />
        <YAxis tickFormatter={value => currency.format(value as number)} width={90} />
        <Tooltip
          formatter={(value: number) => currency.format(value)}
          labelFormatter={label => `${label} CAD`}
        />
        <Legend />
        <Bar
          dataKey="currentAmount"
          name={currentLabel}
          fill={theme.palette.primary.main}
        />
        <Bar
          dataKey="previousAmount"
          name={previousLabel}
          fill={theme.palette.info.light}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DonorDashboard() {
  const { insights, isLoading, isRefetching, error } = useMonetaryDonorInsights();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    if (error) {
      setSnackbarOpen(true);
    }
  }, [error]);

  const currency = useMemo(
    () => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }),
    [],
  );
  const compactCurrency = useMemo(
    () =>
      new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
      }),
    [],
  );
  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-CA'), []);
  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-CA', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [],
  );

  const trendData = useMemo(
    () =>
      (insights?.monthly ?? []).map(month => ({
        ...month,
        monthLabel: formatMonthLabel(month.month),
      })),
    [insights?.monthly],
  );

  const givingTierData = useMemo(
    () =>
      !insights
        ? []
        : TIERS.map(tier => ({
            tier,
            currentAmount: insights.givingTiers.currentMonth.tiers[tier].totalAmount,
            previousAmount: insights.givingTiers.previousMonth.tiers[tier].totalAmount,
          })),
    [insights?.givingTiers],
  );

  const hasGivingTierData = givingTierData.some(
    entry => entry.currentAmount > 0 || entry.previousAmount > 0,
  );
  const hasTrendData = trendData.length > 0;
  const topDonors = insights?.topDonors ?? [];
  const firstTimeDonors = insights?.firstTimeDonors ?? [];
  const pantryImpact = insights?.pantryImpact;
  const hasPantryImpact = Boolean(
    pantryImpact &&
      (pantryImpact.families || pantryImpact.adults || pantryImpact.children || pantryImpact.pounds),
  );

  const errorMessage = error
    ? error.status === 403
      ? 'You do not have permission to view donor insights.'
      : 'Unable to load donor insights. Please try again.'
    : '';
  const showLoadingState = isLoading && !insights;
  const showFallback = !insights && !showLoadingState;

  return (
    <>
      <DonorQuickLinks />
      <Page title="Donor Dashboard">
        {isRefetching && insights ? (
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} aria-label="Refreshing donor insights" />
              <Typography variant="caption" color="text.secondary">
                Refreshing data…
              </Typography>
            </Stack>
          </Box>
        ) : null}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6} lg={4} data-testid="ytd-card">
            <SectionCard title="Year-to-date Giving">
              {showLoadingState ? (
                <Stack spacing={1} data-testid="ytd-loading">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} variant="text" height={28} />
                  ))}
                </Stack>
              ) : showFallback ? (
                <Typography color="text.secondary">
                  Unable to load donor insights.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total raised
                      </Typography>
                      <Typography variant="h6">
                        {currency.format(insights.ytd.totalAmount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Donations
                      </Typography>
                      <Typography variant="h6">
                        {numberFormatter.format(insights.ytd.donationCount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Donors
                      </Typography>
                      <Typography variant="h6">
                        {numberFormatter.format(insights.ytd.donorCount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Average gift
                      </Typography>
                      <Typography variant="h6">
                        {currency.format(insights.ytd.averageGift)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Gifts per donor
                      </Typography>
                      <Typography variant="h6">
                        {decimalFormatter.format(insights.ytd.averageDonationsPerDonor)}
                      </Typography>
                    </Grid>
                  </Grid>
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    Last donation: {formatDateLabel(insights.ytd.lastDonationISO)}
                  </Typography>
                </Stack>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={6} lg={4} data-testid="pantry-impact-card">
            <SectionCard title="Pantry Impact">
              {showLoadingState ? (
                <Stack spacing={1} data-testid="pantry-loading">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} variant="text" height={28} />
                  ))}
                </Stack>
              ) : showFallback ? (
                <Typography color="text.secondary">
                  Unable to load donor insights.
                </Typography>
              ) : hasPantryImpact ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Families supported
                    </Typography>
                    <Typography variant="h6">
                      {numberFormatter.format(pantryImpact.families)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Adults helped
                    </Typography>
                    <Typography variant="h6">
                      {numberFormatter.format(pantryImpact.adults)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Children helped
                    </Typography>
                    <Typography variant="h6">
                      {numberFormatter.format(pantryImpact.children)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Pounds distributed
                    </Typography>
                    <Typography variant="h6">
                      {numberFormatter.format(pantryImpact.pounds)}
                    </Typography>
                  </Grid>
                </Grid>
              ) : (
                <Typography color="text.secondary">
                  Impact statistics will appear after donations are recorded.
                </Typography>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={12} lg={4} data-testid="first-time-card">
            <SectionCard title="First-time Donors">
              {showLoadingState ? (
                <Stack spacing={1} data-testid="first-time-loading">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} variant="text" height={24} />
                  ))}
                </Stack>
              ) : showFallback ? (
                <Typography color="text.secondary">
                  Unable to load donor insights.
                </Typography>
              ) : firstTimeDonors.length > 0 ? (
                <List dense disablePadding>
                  {firstTimeDonors.map(donor => (
                    <ListItem key={donor.id} disableGutters>
                      <ListItemText
                        primary={`${donor.firstName} ${donor.lastName}`.trim()}
                        secondary={`${currency.format(donor.amount)} · First gift on ${formatDateLabel(
                          donor.firstDonationISO,
                        )}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  Welcome gifts will be highlighted here once new donors give.
                </Typography>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} lg={8} data-testid="trend-card">
            <SectionCard title="Giving Trends">
              {showLoadingState ? (
                <Skeleton variant="rounded" height={300} data-testid="trend-loading" />
              ) : showFallback ? (
                <Typography color="text.secondary">
                  Unable to load donor insights.
                </Typography>
              ) : hasTrendData ? (
                <MonetaryTrendChart
                  data={trendData}
                  currency={compactCurrency}
                  numberFormatter={numberFormatter}
                />
              ) : (
                <Typography color="text.secondary">
                  No donation history yet. Trends will appear after donations are recorded.
                </Typography>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} lg={4} data-testid="giving-tier-card">
            <SectionCard title="Giving Tiers">
              {showLoadingState ? (
                <Skeleton variant="rounded" height={300} data-testid="tiers-loading" />
              ) : showFallback ? (
                <Typography color="text.secondary">
                  Unable to load donor insights.
                </Typography>
              ) : hasGivingTierData ? (
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Comparing {formatMonthLabel(insights.givingTiers.currentMonth.month)} with{' '}
                    {formatMonthLabel(insights.givingTiers.previousMonth.month)}
                  </Typography>
                  <GivingTierChart
                    data={givingTierData}
                    currentLabel={formatMonthLabel(insights.givingTiers.currentMonth.month)}
                    previousLabel={formatMonthLabel(insights.givingTiers.previousMonth.month)}
                    currency={compactCurrency}
                  />
                </Stack>
              ) : (
                <Typography color="text.secondary">
                  Tier comparisons will appear after at least one month of giving data is
                  available.
                </Typography>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} lg={6} data-testid="top-donors-card">
            <SectionCard title="Top Donors">
              {showLoadingState ? (
                <Stack spacing={1} data-testid="top-donors-loading">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} variant="text" height={28} />
                  ))}
                </Stack>
              ) : showFallback ? (
                <Typography color="text.secondary">
                  Unable to load donor insights.
                </Typography>
              ) : topDonors.length > 0 ? (
                <List dense disablePadding>
                  {topDonors.map((donor, index) => (
                    <ListItem
                      key={donor.id}
                      disableGutters
                      divider={index < topDonors.length - 1}
                      sx={{ py: 1 }}
                    >
                      <ListItemText
                        primary={`${donor.firstName} ${donor.lastName}`.trim()}
                        secondary={`${currency.format(donor.windowAmount)} in window · Last gift ${formatDateLabel(
                          donor.lastDonationISO,
                        )}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  Once donations arrive, top supporters will appear here.
                </Typography>
              )}
            </SectionCard>
          </Grid>
        </Grid>
      </Page>
      <FeedbackSnackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        message={errorMessage}
        severity="error"
      />
    </>
  );
}

