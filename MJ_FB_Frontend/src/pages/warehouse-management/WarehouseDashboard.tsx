import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Download,
  Autorenew,
  InfoOutlined,
  TrendingUp,
  WarningAmber,
  Announcement,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import VolunteerCoverageCard from '../../components/dashboard/VolunteerCoverageCard';
import EventList from '../../components/EventList';
import {
  getWarehouseOverall,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
} from '../../api/warehouseOverall';
import {
  getTopDonors,
  type TopDonor,
  getDonors,
  type Donor,
} from '../../api/donors';
import { getTopReceivers, type TopReceiver } from '../../api/outgoingReceivers';
import { getEvents, type EventGroups } from '../../api/events';
import type { AlertColor } from '@mui/material';

interface MonthlyTotal {
  year: number;
  month: number;
  donationsLbs: number;
  surplusLbs: number;
  pigPoundLbs: number;
  outgoingLbs: number;
}


function monthName(m: number) {
  return new Date(2000, m - 1).toLocaleString(undefined, { month: 'short' });
}

function fmtLbs(n?: number) {
  const safe = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  return `${safe.toLocaleString(undefined, { maximumFractionDigits: 0 })} lbs`;
}

function kpiDelta(curr: number, prev?: number) {
  const pct = ((curr - (prev ?? 0)) / Math.max(prev ?? 0, 1)) * 100;
  return { pct, up: pct >= 0 };
}

export default function WarehouseDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token, id } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);
  const years = [2024, 2025, 2026];
  const [year, setYear] = useState(() => {
    const y = new Date().getFullYear();
    return years.includes(y) ? y : years[0];
  });
  const [search, setSearch] = useState('');
  const [donorOptions, setDonorOptions] = useState<Donor[]>([]);
  const [totals, setTotals] = useState<MonthlyTotal[]>([]);
  const [donors, setDonors] = useState<TopDonor[]>([]);
  const [receivers, setReceivers] = useState<TopReceiver[]>([]);
  const [events, setEvents] = useState<EventGroups>({ today: [], upcoming: [], past: [] });
  const [loadingTotals, setLoadingTotals] = useState(false);
  const [loadingRebuild, setLoadingRebuild] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity?: AlertColor;
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (search.length < 2) {
      setDonorOptions([]);
      return;
    }
    let active = true;
    getDonors(search)
      .then(d => {
        if (active) setDonorOptions(d);
      })
      .catch(() => {
        if (active) setDonorOptions([]);
      });
    return () => {
      active = false;
    };
  }, [search]);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {});
  }, []);

  async function loadData(selectedYear: number) {
    setLoadingTotals(true);
    const [tRes, dRes, rRes] = await Promise.allSettled([
      getWarehouseOverall(selectedYear),
      getTopDonors(selectedYear),
      getTopReceivers(selectedYear),
    ]);
    if (tRes.status === 'fulfilled')
      setTotals(
        tRes.value.map(t => ({
          year: selectedYear,
          month: t.month,
          donationsLbs: t.donations,
          surplusLbs: t.surplus,
          pigPoundLbs: t.pigPound,
          outgoingLbs: t.outgoingDonations,
        })),
      );
    else
      setSnackbar({ open: true, message: tRes.reason?.message || 'Failed to load totals', severity: 'error' });
    if (dRes.status === 'fulfilled') setDonors(dRes.value ?? []);
    else
      setSnackbar({ open: true, message: dRes.reason?.message || 'Failed to load donors', severity: 'error' });
    if (rRes.status === 'fulfilled') setReceivers(rRes.value ?? []);
    else
      setSnackbar({ open: true, message: rRes.reason?.message || 'Failed to load receivers', severity: 'error' });
    setLoadingTotals(false);
  }

  useEffect(() => {
    loadData(year);
  }, [year]);

  const currentMonth = useMemo(() => {
    const thisMonth = new Date().getMonth() + 1;
    const monthsWithData = totals
      .filter(t => t.donationsLbs || t.surplusLbs || t.pigPoundLbs || t.outgoingLbs)
      .map(t => t.month);
    if (monthsWithData.includes(thisMonth)) return thisMonth;
    return monthsWithData.length ? Math.max(...monthsWithData) : thisMonth;
  }, [totals]);

  const currentTotals = totals.find(t => t.month === currentMonth);
  const prevTotals = totals.find(t => t.month === currentMonth - 1);

  const incoming = currentTotals?.donationsLbs ?? 0;
  const prevIncoming = prevTotals?.donationsLbs ?? 0;
  const totalIncoming =
    (currentTotals?.donationsLbs ?? 0) +
    (currentTotals?.surplusLbs ?? 0) +
    (currentTotals?.pigPoundLbs ?? 0);
  const outgoing = currentTotals?.outgoingLbs ?? 0;
  const prevOutgoing = prevTotals?.outgoingLbs ?? 0;
  const anomalyRatio = totalIncoming ? outgoing / totalIncoming : 0;
  const showAnomaly = totalIncoming > 0 && anomalyRatio > 1.25;

  const chartData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const t = totals.find(tt => tt.month === m);
        const incoming = t?.donationsLbs ?? 0;
        const outgoing = t?.outgoingLbs ?? 0;
        return {
          month: monthName(m),
          incoming,
          outgoing,
          donations: incoming,
          surplus: t?.surplusLbs ?? 0,
          pigPound: t?.pigPoundLbs ?? 0,
        };
      }),
    [totals],
  );

  const filteredDonors = useMemo(
    () => donors.filter(d => d.name.toLowerCase().includes(search.toLowerCase())),
    [donors, search],
  );
  const filteredReceivers = useMemo(
    () => receivers.filter(r => r.name.toLowerCase().includes(search.toLowerCase())),
    [receivers, search],
  );

  const visibleEvents = useMemo(
    () =>
      [...events.today, ...events.upcoming].filter(
        ev => !ev.staffIds || ev.staffIds.includes(id ?? -1),
      ),
    [events, id],
  );

  function go(path: string) {
    navigate(path);
  }

  async function handleRebuild() {
    setLoadingRebuild(true);
    try {
      await rebuildWarehouseOverall(year);
      setSnackbar({ open: true, message: 'Rebuilt aggregates' });
      loadData(year);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Rebuild failed', severity: 'error' });
    } finally {
      setLoadingRebuild(false);
    }
  }

  async function handleExport() {
    setLoadingExport(true);
    try {
      const blob = await exportWarehouseOverall(year);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `warehouse_overall_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    } finally {
      setLoadingExport(false);
    }
  }

  const kpis = [
    { title: 'Incoming (Donations)', value: currentTotals?.donationsLbs ?? 0, prev: prevTotals?.donationsLbs ?? 0 },
    { title: 'Surplus Logged', value: currentTotals?.surplusLbs ?? 0, prev: prevTotals?.surplusLbs ?? 0 },
    { title: 'Pig Pound', value: currentTotals?.pigPoundLbs ?? 0, prev: prevTotals?.pigPoundLbs ?? 0 },
    { title: 'Outgoing Shipments', value: outgoing, prev: prevOutgoing },
  ];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        mb={2}
      >
        <Box>
          <Typography variant="h5">Warehouse Manager Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Annual warehouse overview
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel id="year-label">Year</InputLabel>
            <Select
              labelId="year-label"
              value={year}
              label="Year"
              onChange={e => setYear(Number(e.target.value))}
            >
              {years.map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            size="small"
            options={donorOptions}
            getOptionLabel={o => o.name}
            inputValue={search}
            onInputChange={(_e, v) => setSearch(v)}
            onChange={(_e, v) => {
              if (v) navigate(`/warehouse-management/donors/${v.id}`);
            }}
            renderInput={params => (
              <TextField
                {...params}
                placeholder="Find donor/receiver"
                inputRef={searchRef}
              />
            )}
            sx={{ minWidth: 200 }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<Autorenew />}
            onClick={handleRebuild}
            disabled={loadingRebuild}
            aria-busy={loadingRebuild}
          >
            Rebuild Year
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={loadingExport}
            aria-busy={loadingExport}
          >
            Export Excel
          </Button>
        </Stack>
      </Stack>

      {showAnomaly && (
        <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
          Outgoing significantly exceeds incoming this month (ratio {anomalyRatio.toFixed(2)}x). Verify logs.
        </Alert>
      )}

      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }}
        gap={2}
        mb={2}
      >
        {kpis.map(k => {
          const { pct, up } = kpiDelta(k.value, k.prev);
          return (
            <Card key={k.title} variant="outlined">
              <CardHeader
                title={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>{k.title}</span>
                    <Tooltip title={k.tooltip || ''}>
                      <InfoOutlined fontSize="small" color="action" />
                    </Tooltip>
                  </Stack>
                }
              />
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {fmtLbs(k.value)}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TrendingUp
                    fontSize="small"
                    sx={{ color: up ? 'success.main' : 'error.main' }}
                  />
                  <Typography variant="caption" color={up ? 'success.main' : 'error.main'}>
                    {pct.toFixed(1)}% vs prev month
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', lg: '2fr 1fr' }}
        gap={2}
        mb={2}
      >
        <Card variant="outlined">
          <CardHeader title="Monthly Trend" />
          <CardContent sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RTooltip formatter={(val: number) => fmtLbs(val)} />
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
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardHeader title="Composition (This Year)" />
          <CardContent sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RTooltip formatter={(val: number) => fmtLbs(val)} />
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
          </CardContent>
        </Card>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', lg: '1fr 1fr 1fr 1fr' }}
        gap={2}
        mb={2}
      >
        <Card variant="outlined">
          <CardHeader
            title="Top Donors"
            subheader="This year by total lbs"
            action={<Chip label={filteredDonors.length} size="small" />}
          />
          <CardContent>
            {filteredDonors.length ? (
              <Stack spacing={1}>
                {filteredDonors.map((d, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2">{d.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last: {new Date(d.lastDonationISO).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{fmtLbs(d.totalLbs)}</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No data
              </Typography>
            )}
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardHeader
            title="Top Receivers"
            subheader="This year by total lbs"
            action={<Chip label={filteredReceivers.length} size="small" />}
          />
          <CardContent>
            {filteredReceivers.length ? (
              <Stack spacing={1}>
                {filteredReceivers.map((r, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2">{r.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last: {new Date(r.lastPickupISO).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{fmtLbs(r.totalLbs)}</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No data
              </Typography>
            )}
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardHeader title="Quick Actions" />
          <CardContent>
            <Stack spacing={1}>
              <Button size="small" variant="contained" fullWidth onClick={() => go('/warehouse-management/donation-log')}>
                Go to Donation Log
              </Button>
              <Button size="small" variant="contained" fullWidth onClick={() => go('/warehouse-management/track-surplus')}>
                Track Surplus
              </Button>
              <Button size="small" variant="contained" fullWidth onClick={() => go('/warehouse-management/track-pigpound')}>
                Log Pig Pound
              </Button>
              <Button size="small" variant="contained" fullWidth onClick={() => go('/warehouse-management/track-outgoing-donations')}>
                Track Outgoing Donations
              </Button>
            </Stack>
          </CardContent>
        </Card>
        <VolunteerCoverageCard token={token} masterRoleFilter={['Warehouse']} />
      </Box>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader title="Notices & Events" avatar={<Announcement color="primary" />} />
        <CardContent>
          <EventList events={visibleEvents} limit={5} />
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary">
        Tip: Press Ctrl/Cmd+K in the search box to quickly filter donors/receivers.
      </Typography>

      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Box>
  );
}

