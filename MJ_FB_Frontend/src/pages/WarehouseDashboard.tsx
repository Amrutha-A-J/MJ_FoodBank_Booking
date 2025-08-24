import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  TextField,
  Tooltip,
  Chip,
  Tabs,
  Tab,
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
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { API_BASE, apiFetch, handleResponse } from '../api/client';
import type { AlertColor } from '@mui/material';

interface MonthlyTotal {
  year: number;
  month: number;
  donationsKg: number;
  surplusKg: number;
  pigPoundKg: number;
  outgoingKg: number;
}

interface Donor {
  name: string;
  totalKg: number;
  lastDonationISO: string;
}

interface Receiver {
  name: string;
  totalKg: number;
  lastPickupISO: string;
}

function monthName(m: number) {
  return new Date(2000, m - 1).toLocaleString(undefined, { month: 'short' });
}

function fmtKg(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`;
}

function kpiDelta(curr: number, prev?: number) {
  const pct = ((curr - (prev ?? 0)) / Math.max(prev ?? 0, 1)) * 100;
  return { pct, up: pct >= 0 };
}

export default function WarehouseDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const years = [2024, 2025, 2026];
  const [year, setYear] = useState(() => {
    const y = new Date().getFullYear();
    return years.includes(y) ? y : years[0];
  });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);
  const [totals, setTotals] = useState<MonthlyTotal[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
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

  async function loadData(selectedYear: number) {
    setLoadingTotals(true);
    const [tRes, dRes, rRes] = await Promise.allSettled([
      apiFetch(`${API_BASE}/warehouse-overall?year=${selectedYear}`).then(handleResponse),
      apiFetch(`${API_BASE}/donors/top?year=${selectedYear}&limit=7`).then(handleResponse),
      apiFetch(`${API_BASE}/receivers/top?year=${selectedYear}&limit=7`).then(handleResponse),
    ]);
    if (tRes.status === 'fulfilled') setTotals(tRes.value ?? []);
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
    return totals.length ? Math.max(...totals.map(t => t.month)) : 1;
  }, [totals]);

  const currentTotals = totals.find(t => t.month === currentMonth);
  const prevTotals = totals.find(t => t.month === currentMonth - 1);

  const incoming =
    (currentTotals?.donationsKg ?? 0) +
    (currentTotals?.surplusKg ?? 0) +
    (currentTotals?.pigPoundKg ?? 0);
  const prevIncoming =
    (prevTotals?.donationsKg ?? 0) +
    (prevTotals?.surplusKg ?? 0) +
    (prevTotals?.pigPoundKg ?? 0);
  const outgoing = currentTotals?.outgoingKg ?? 0;
  const prevOutgoing = prevTotals?.outgoingKg ?? 0;
  const net = incoming - outgoing;
  const prevNet = prevIncoming - prevOutgoing;
  const anomalyRatio = incoming ? outgoing / incoming : 0;
  const showAnomaly = incoming > 0 && anomalyRatio > 1.25;

  const chartData = useMemo(
    () =>
      totals.map(t => ({
        month: monthName(t.month),
        incoming: t.donationsKg + t.surplusKg + t.pigPoundKg,
        outgoing: t.outgoingKg,
        net: t.donationsKg + t.surplusKg + t.pigPoundKg - t.outgoingKg,
        donations: t.donationsKg,
        surplus: t.surplusKg,
        pigPound: t.pigPoundKg,
      })),
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

  function go(path: string) {
    navigate(path);
  }

  async function handleRebuild() {
    setLoadingRebuild(true);
    try {
      await apiFetch(`${API_BASE}/warehouse-overall/rebuild?year=${year}`, { method: 'POST' }).then(handleResponse);
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
      const res = await apiFetch(`${API_BASE}/warehouse-overall/export?year=${year}`);
      if (!res.ok) await handleResponse(res);
      const blob = await res.blob();
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
    { title: 'Incoming (Donations)', value: currentTotals?.donationsKg ?? 0, prev: prevTotals?.donationsKg ?? 0 },
    { title: 'Surplus Logged', value: currentTotals?.surplusKg ?? 0, prev: prevTotals?.surplusKg ?? 0 },
    { title: 'Pig Pound', value: currentTotals?.pigPoundKg ?? 0, prev: prevTotals?.pigPoundKg ?? 0 },
    { title: 'Outgoing Shipments', value: outgoing, prev: prevOutgoing },
    {
      title: 'Net Flow',
      value: net,
      prev: prevNet,
      tooltip: 'Incoming (donations + surplus + pig pound) minus outgoing.',
    },
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
          <TextField
            size="small"
            placeholder="Find donor/receiver"
            value={search}
            onChange={e => setSearch(e.target.value)}
            inputRef={searchRef}
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
        gridTemplateColumns={{ xs: '1fr', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }}
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
                  {fmtKg(k.value)}
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
                <RTooltip formatter={(val: number) => fmtKg(val)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="incoming"
                  name="Incoming"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="outgoing"
                  name="Outgoing"
                  stroke={theme.palette.success.main}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net"
                  stroke={theme.palette.warning.main}
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
                <RTooltip formatter={(val: number) => fmtKg(val)} />
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
                  fill={theme.palette.error.main}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', lg: '1fr 1fr 1fr' }}
        gap={2}
        mb={2}
      >
        <Card variant="outlined">
          <CardHeader
            title="Top Donors"
            subheader="This year by total kg"
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
                    <Typography variant="body2">{fmtKg(d.totalKg)}</Typography>
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
            subheader="This year by total kg"
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
                    <Typography variant="body2">{fmtKg(r.totalKg)}</Typography>
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
      </Box>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Data Quality" />
        <Tab label="Admin & Indexes" />
      </Tabs>
      {tab === 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardHeader title="Potential Issues" />
          <CardContent>
            <ul>
              <li>
                Donor name conflicts detected (e.g., "Co-Op" vs "CO-OP").
                <Button size="small" variant="text" sx={{ ml: 1 }} onClick={() => console.log('resolve donors')}>
                  Resolve
                </Button>
              </li>
              <li>Outgoing weight &gt; incoming by 25% this month — verify logs.</li>
              <li>Surplus records missing count-to-kg conversion factor — check categories.</li>
            </ul>
          </CardContent>
        </Card>
      )}
      {tab === 1 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardHeader title="Warehouse Overall Controls" />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={1}>
              <Button
                size="small"
                variant="contained"
                startIcon={<Autorenew />}
                onClick={handleRebuild}
                disabled={loadingRebuild}
                aria-busy={loadingRebuild}
              >
                Rebuild Aggregates ({year})
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
                disabled={loadingExport}
                aria-busy={loadingExport}
              >
                Export to Excel
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Calls /warehouse-overall/rebuild and /warehouse-overall/export endpoints.
            </Typography>
          </CardContent>
        </Card>
      )}

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

