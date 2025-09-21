import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import Savings from '@mui/icons-material/Savings';
import ShowChart from '@mui/icons-material/ShowChart';
import Leaderboard from '@mui/icons-material/Leaderboard';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import VolunteerActivism from '@mui/icons-material/VolunteerActivism';
import { format, parse } from 'date-fns';
import Page from '../../components/Page';
import DonorQuickLinks from '../../components/DonorQuickLinks';
import SectionCard from '../../components/dashboard/SectionCard';
import MonetaryDonationTrendChart from '../../components/dashboard/MonetaryDonationTrendChart';
import MonetaryGivingTierChart, {
  type MonetaryGivingTierDatum,
} from '../../components/dashboard/MonetaryGivingTierChart';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import useMonetaryDonorInsights from '../../hooks/useMonetaryDonorInsights';
import type { ApiError } from '../../api/client';
import type { MonetaryDonorMonthBucket } from '../../api/monetaryDonors';
import getApiErrorMessage from '../../utils/getApiErrorMessage';
import { formatLocaleDate } from '../../utils/date';

const tierLabels: Record<MonetaryDonorMonthBucket, string> = {
  '1-100': '$1–$100',
  '101-500': '$101–$500',
  '501-1000': '$501–$1,000',
  '1001-10000': '$1,001–$10,000',
  '10001-30000': '$10,001–$30,000',
};

function formatMonthLabel(month: string) {
  const parsed = parse(month, 'yyyy-MM', new Date());
  if (Number.isNaN(parsed.getTime())) {
    return month;
  }
  return format(parsed, 'MMM yyyy');
}

function buildTierData(
  current: Record<MonetaryDonorMonthBucket, { donorCount: number; totalAmount: number }>,
  previous?: Record<MonetaryDonorMonthBucket, { donorCount: number; totalAmount: number }>,
): MonetaryGivingTierDatum[] {
  return (Object.keys(current) as MonetaryDonorMonthBucket[]).map(tier => {
    const currentTier = current[tier];
    const previousCount = previous?.[tier]?.donorCount ?? 0;
    return {
      tierLabel: tierLabels[tier],
      donorCount: currentTier.donorCount,
      amount: currentTier.totalAmount,
      deltaFromPreviousMonth: currentTier.donorCount - previousCount,
    };
  });
}

function renderStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" key={label}>
      {icon}
      <Stack spacing={0.25}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6">{value}</Typography>
      </Stack>
    </Stack>
  );
}

export default function DonorDashboard() {
  const { data, isLoading, isFetching, isError, error } = useMonetaryDonorInsights();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (!isError) return;
    const apiError = error as ApiError | undefined;
    const message =
      apiError?.status === 403
        ? 'You do not have access to donor insights. Ask an administrator to grant donor management access.'
        : getApiErrorMessage(apiError, 'Failed to load donor insights.');
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  }, [error, isError]);

  const currency = useMemo(
    () => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }),
    [],
  );

  const trendData = useMemo(
    () =>
      (data?.monthly ?? []).map(summary => ({
        month: summary.month,
        amount: summary.totalAmount,
        donationCount: summary.donationCount,
        donorCount: summary.donorCount,
        averageGift: summary.averageGift,
      })),
    [data?.monthly],
  );

  const tierData = useMemo(() => {
    if (!data?.givingTiers) return [] as MonetaryGivingTierDatum[];
    return buildTierData(data.givingTiers.currentMonth.tiers, data.givingTiers.previousMonth?.tiers);
  }, [data?.givingTiers]);

  const hasTierData = tierData.some(item => item.donorCount > 0 || item.amount > 0);
  const topDonors = data?.topDonors ?? [];
  const firstTimeDonors = data?.firstTimeDonors ?? [];
  const pantryImpact = data?.pantryImpact;
  const hasPantryImpact =
    !!pantryImpact &&
    [pantryImpact.families, pantryImpact.adults, pantryImpact.children, pantryImpact.pounds].some(value => value > 0);

  const windowLabel = data?.window
    ? `${formatMonthLabel(data.window.startMonth)} – ${formatMonthLabel(data.window.endMonth)} (${data.window.months} month${
        data.window.months === 1 ? '' : 's'
      })`
    : '';

  const ytdStats = data
    ? [
        {
          label: 'Total received',
          value: currency.format(data.ytd.totalAmount),
          icon: <Savings color="primary" />,
        },
        {
          label: 'Donations recorded',
          value: data.ytd.donationCount.toLocaleString('en-CA'),
          icon: <EmojiEvents color="primary" />,
        },
        {
          label: 'Donors engaged',
          value: data.ytd.donorCount.toLocaleString('en-CA'),
          icon: <Leaderboard color="primary" />,
        },
        {
          label: 'Average gift',
          value: currency.format(data.ytd.averageGift),
          icon: <ShowChart color="primary" />,
        },
        {
          label: 'Gifts per donor',
          value: data.ytd.averageDonationsPerDonor.toFixed(1),
          icon: <AutoAwesome color="primary" />,
        },
        {
          label: 'Last gift received',
          value: data.ytd.lastDonationISO
            ? formatLocaleDate(data.ytd.lastDonationISO, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : 'No gifts recorded yet',
          icon: <VolunteerActivism color="primary" />,
        },
      ]
    : [];

  return (
    <>
      <DonorQuickLinks />
      <Page title="Donor Dashboard">
        <FeedbackSnackbar
          open={snackbarOpen}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
          severity="error"
        />
        {isFetching && !isLoading && data ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ mb: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Updating donor insights…
            </Typography>
          </Stack>
        ) : null}

        {isLoading ? (
          <Grid container spacing={2} data-testid="donor-dashboard-loading">
            {Array.from({ length: 5 }).map((_, index) => (
              <Grid
                key={index}
                size={{ xs: 12, md: index === 0 ? 12 : 6 }}
              >
                <SectionCard title={<Skeleton variant="text" width={180} />}>
                  <Stack spacing={2}>
                    <Skeleton variant="rectangular" height={120} />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Stack>
                </SectionCard>
              </Grid>
            ))}
          </Grid>
        ) : isError && !data ? (
          <Stack spacing={1.5} data-testid="donor-dashboard-error">
            <Typography variant="body1">{snackbarMessage}</Typography>
            <Typography variant="body2" color="text.secondary">
              Try refreshing the page or come back later.
            </Typography>
          </Stack>
        ) : data ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <SectionCard
                title={
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={0.5}
                    sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
                  >
                    <Typography variant="subtitle1" component="span" sx={{ fontWeight: 600 }}>
                      Year-to-date overview
                    </Typography>
                    {windowLabel ? (
                      <Typography variant="body2" color="text.secondary">
                        {windowLabel}
                      </Typography>
                    ) : null}
                  </Stack>
                }
                icon={<Savings color="primary" />}
              >
                <Grid container spacing={2}>
                  {ytdStats.map(stat => (
                    <Grid key={stat.label} size={{ xs: 12, md: 4 }}>
                      {renderStat(stat)}
                    </Grid>
                  ))}
                </Grid>
              </SectionCard>
            </Grid>

            <Grid size={{ xs: 12, lg: 8 }}>
              <SectionCard title="Giving trends" icon={<ShowChart color="primary" />}>
                {trendData.length ? (
                  <Box sx={{ height: 320 }}>
                    <MonetaryDonationTrendChart data={trendData} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No giving trends to display yet. Record donations to see momentum over time.
                  </Typography>
                )}
              </SectionCard>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <SectionCard title="Giving tiers" icon={<Leaderboard color="primary" />}>
                {hasTierData ? (
                  <Box sx={{ height: 320 }}>
                    <MonetaryGivingTierChart data={tierData} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Tier data will appear once donors start giving this month.
                  </Typography>
                )}
              </SectionCard>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="Top donors" icon={<EmojiEvents color="primary" />}>
                {topDonors.length ? (
                  <List disablePadding>
                    {topDonors.map((donor, index) => (
                      <Fragment key={donor.id}>
                        <ListItem alignItems="flex-start" sx={{ py: 1.25 }}>
                          <ListItemText
                            primary={`${donor.firstName} ${donor.lastName}`.trim() || 'Unnamed donor'}
                            secondary={
                              donor.lastDonationISO
                                ? `Last gift ${formatLocaleDate(donor.lastDonationISO, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}`
                                : 'No recent gift on file'
                            }
                          />
                          <Typography variant="subtitle1" component="div">
                            {currency.format(donor.windowAmount)}
                          </Typography>
                        </ListItem>
                        {index < topDonors.length - 1 ? <Divider component="li" /> : null}
                      </Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No top donors for this period yet. Donations will appear here as they come in.
                  </Typography>
                )}
              </SectionCard>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="First-time donor highlights" icon={<AutoAwesome color="primary" />}>
                {firstTimeDonors.length ? (
                  <List disablePadding>
                    {firstTimeDonors.map((donor, index) => (
                      <Fragment key={donor.id}>
                        <ListItem alignItems="flex-start" sx={{ py: 1.25 }}>
                          <ListItemText
                            primary={`${donor.firstName} ${donor.lastName}`.trim() || 'Unnamed donor'}
                            secondary={`First gift on ${formatLocaleDate(donor.firstDonationISO, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}`}
                          />
                          <Typography variant="subtitle1" component="div">
                            {currency.format(donor.amount)}
                          </Typography>
                        </ListItem>
                        {index < firstTimeDonors.length - 1 ? <Divider component="li" /> : null}
                      </Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    We’ll highlight first-time donors once new supporters give during this window.
                  </Typography>
                )}
              </SectionCard>
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <SectionCard title="Pantry impact" icon={<VolunteerActivism color="primary" />}>
                {hasPantryImpact ? (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <Stack spacing={0.25}>
                        <Typography variant="body2" color="text.secondary">
                          Families supported
                        </Typography>
                        <Typography variant="h6">{pantryImpact.families.toLocaleString('en-CA')}</Typography>
                      </Stack>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" color="text.secondary">
                          Adults reached
                        </Typography>
                        <Typography variant="h6">{pantryImpact.adults.toLocaleString('en-CA')}</Typography>
                      </Stack>
                    </Stack>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <Stack spacing={0.25}>
                        <Typography variant="body2" color="text.secondary">
                          Children supported
                        </Typography>
                        <Typography variant="h6">{pantryImpact.children.toLocaleString('en-CA')}</Typography>
                      </Stack>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" color="text.secondary">
                          Pounds of food
                        </Typography>
                        <Typography variant="h6">{pantryImpact.pounds.toLocaleString('en-CA')} lbs</Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Pantry impact metrics will populate once donations fund pantry programs.
                  </Typography>
                )}
              </SectionCard>
            </Grid>
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Donor insights are not available yet. Check back after donations are recorded.
          </Typography>
        )}
      </Page>
    </>
  );
}

