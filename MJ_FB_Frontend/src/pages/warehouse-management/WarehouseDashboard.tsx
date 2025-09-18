import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUp from '@mui/icons-material/TrendingUp';
import WarningAmber from '@mui/icons-material/WarningAmber';
import Announcement from '@mui/icons-material/Announcement';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { formatLocaleDate, toDate } from '../../utils/date';
import { normalizeContactSearchValue, normalizeContactValue } from '../../utils/contact';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import VolunteerCoverageCard from '../../components/dashboard/VolunteerCoverageCard';
import EventList from '../../components/EventList';
import { getWarehouseOverall, getWarehouseOverallYears } from '../../api/warehouseOverall';
import {
  getTopDonors,
  type TopDonor,
  getDonors,
  type Donor,
} from '../../api/donors';
import { getTopReceivers, type TopReceiver } from '../../api/outgoingReceivers';
import { getEvents, type EventGroups } from '../../api/events';
import type { AlertColor } from '@mui/material';
import Page from '../../components/Page';
import WarehouseQuickLinks from '../../components/WarehouseQuickLinks';
import FormDialog from '../../components/FormDialog';
import WarehouseCompositionChart, {
  type WarehouseCompositionDatum,
} from '../../components/dashboard/WarehouseCompositionChart';

interface MonthlyTotal {
  year: number;
  month: number;
  donationsLbs: number;
  surplusLbs: number;
  pigPoundLbs: number;
  outgoingLbs: number;
}

type CompositionDatum = WarehouseCompositionDatum & {
  incoming: number;
};


function monthName(m: number) {
  return formatLocaleDate(`${2000}-${String(m).padStart(2, '0')}-01`, { month: 'short' });
}

function fmtLbs(n?: number) {
  const safe = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  return `${safe.toLocaleString(undefined, { maximumFractionDigits: 0 })} lbs`;
}

function kpiDelta(curr: number, prev?: number) {
  const pct = ((curr - (prev ?? 0)) / Math.max(prev ?? 0, 1)) * 100;
  return { pct, up: pct >= 0 };
}

function formatDonorDisplay(donor: {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
}) {
  const name = `${donor.firstName} ${donor.lastName}`.trim();
  const phone = normalizeContactValue(donor.phone);
  const identifier = `ID ${donor.id}`;
  const suffix = phone ? `${identifier} • ${phone}` : identifier;
  return `${name} (${suffix})`;
}

export default function WarehouseDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number>();
  const [search, setSearch] = useState('');
  const [donorOptions, setDonorOptions] = useState<Donor[]>([]);
  const [totals, setTotals] = useState<MonthlyTotal[]>([]);
  const [donors, setDonors] = useState<TopDonor[]>([]);
  const [receivers, setReceivers] = useState<TopReceiver[]>([]);
  const [events, setEvents] = useState<EventGroups>({ today: [], upcoming: [], past: [] });
  const [, setLoadingTotals] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity?: AlertColor;
  }>({ open: false, message: '', severity: 'success' });
  const [selectedComposition, setSelectedComposition] = useState<{
    month: string;
    donations: number;
    surplus: number;
    pigPound: number;
    outgoing: number;
  } | null>(null);

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
    async function loadYears() {
      try {
        const ys = await getWarehouseOverallYears();
        setYears(ys);
        setYear(ys[0]);
      } catch {
        const currentYear = toDate().getFullYear();
        const fallback = Array.from({ length: 5 }, (_, i) => currentYear - i);
        setYears(fallback);
        setYear(fallback[0]);
      }
    }
    loadYears();
  }, []);

  useEffect(() => {
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
    getEvents()
      .then(data =>
        setEvents(data ?? { today: [], upcoming: [], past: [] }),
      )
      .catch(() =>
        setEvents({ today: [], upcoming: [], past: [] }),
      );
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
    if (year !== undefined) {
      loadData(year);
    }
  }, [year]);

  const currentMonth = useMemo(() => {
    const thisMonth = toDate().getMonth() + 1;
    const monthsWithData = totals
      .filter(t => t.donationsLbs || t.surplusLbs || t.pigPoundLbs || t.outgoingLbs)
      .map(t => t.month);
    if (monthsWithData.includes(thisMonth)) return thisMonth;
    return monthsWithData.length ? Math.max(...monthsWithData) : thisMonth;
  }, [totals]);

  const currentTotals = totals.find(t => t.month === currentMonth);
  const prevTotals = totals.find(t => t.month === currentMonth - 1);

  const totalIncoming =
    (currentTotals?.donationsLbs ?? 0) +
    (currentTotals?.surplusLbs ?? 0) +
    (currentTotals?.pigPoundLbs ?? 0);
  const outgoing = currentTotals?.outgoingLbs ?? 0;
  const prevOutgoing = prevTotals?.outgoingLbs ?? 0;
  const anomalyRatio = totalIncoming ? outgoing / totalIncoming : 0;
  const showAnomaly = totalIncoming > 0 && anomalyRatio > 1.25;

  const chartData = useMemo<CompositionDatum[]>(
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

  const filteredDonors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return donors;

    return donors.filter(d => {
      const name = `${d.firstName} ${d.lastName}`.toLowerCase();
      const email = normalizeContactSearchValue(d.email);
      const phone = normalizeContactSearchValue(d.phone);

      return (
        d.id.toString().includes(term) ||
        name.includes(term) ||
        email.includes(term) ||
        phone.includes(term)
      );
    });
  }, [donors, search]);
  const filteredReceivers = useMemo(
    () => receivers.filter(r => r.name.toLowerCase().includes(search.toLowerCase())),
    [receivers, search],
  );

  const visibleEvents = useMemo(
    () => [...events.today, ...events.upcoming],
    [events],
  );

  function go(path: string) {
    navigate(path);
  }

  const handleCompositionClick = useCallback((data: { payload?: CompositionDatum } | undefined) => {
    if (!data?.payload) return;
    setSelectedComposition({
      month: data.payload.month,
      donations: data.payload.donations ?? 0,
      surplus: data.payload.surplus ?? 0,
      pigPound: data.payload.pigPound ?? 0,
      outgoing: data.payload.outgoing ?? 0,
    });
  }, []);


  const kpis = [
    { title: 'Incoming (Donations)', value: currentTotals?.donationsLbs ?? 0, prev: prevTotals?.donationsLbs ?? 0 },
    { title: 'Surplus Logged', value: currentTotals?.surplusLbs ?? 0, prev: prevTotals?.surplusLbs ?? 0 },
    { title: 'Pig Pound', value: currentTotals?.pigPoundLbs ?? 0, prev: prevTotals?.pigPoundLbs ?? 0 },
    { title: 'Outgoing Shipments', value: outgoing, prev: prevOutgoing },
  ];

  return (
    <>
      <WarehouseQuickLinks />
      <Page title="Warehouse Manager Dashboard">
      <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        mb={2}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            Annual warehouse overview
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl sx={{ minWidth: 80 }}>
            <InputLabel id="year-label">Year</InputLabel>
            <Select
              labelId="year-label"
              value={year ?? ''}
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
            options={donorOptions}
            getOptionLabel={o => formatDonorDisplay(o)}
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
        gridTemplateColumns={{ xs: '1fr', lg: 'minmax(0,3fr) minmax(280px,1fr)' }}
        alignItems="start"
        gap={2}
      >
        <Stack spacing={2} sx={{ width: '100%' }}>
          <Card variant="outlined">
            <CardHeader title="Monthly Trend" />
            <CardContent sx={{ height: 300 }}>
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
            </CardContent>
          </Card>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '1fr 2fr' }} gap={2}>
            <Card variant="outlined">
              <CardHeader title="Quick Actions" />
              <CardContent>
                <Stack spacing={1}>
                  <Button variant="contained" fullWidth onClick={() => go('/warehouse-management/donation-log')}>
                    Go to Donation Log
                  </Button>
                  <Button variant="contained" fullWidth onClick={() => go('/warehouse-management/track-surplus')}>
                    Track Surplus
                  </Button>
                  <Button variant="contained" fullWidth onClick={() => go('/warehouse-management/track-pigpound')}>
                    Log Pig Pound
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => go('/warehouse-management/track-outgoing-donations')}
                  >
                    Track Outgoing Donations
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          <Card variant="outlined">
            <CardHeader title="Composition (This Year)" />
            <CardContent sx={{ height: 300 }}>
              <WarehouseCompositionChart
                data={chartData}
                onBarClick={handleCompositionClick}
              />
            </CardContent>
          </Card>
          </Box>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: 'repeat(3, 1fr)' }} gap={2}>
            <Card variant="outlined">
              <CardHeader
                title="Top Donors"
                subheader="This year by total lbs"
                action={<Chip label={filteredDonors.length} />}
              />
              <CardContent>
                {filteredDonors.length ? (
                  <Stack spacing={1}>
                    {filteredDonors.map((d, i) => (
                      <Stack key={i} direction="row" justifyContent="space-between">
                        <Box>
                          <Typography variant="body2">
                            {d.firstName} {d.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Last: {formatLocaleDate(d.lastDonationISO)}
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
                action={<Chip label={filteredReceivers.length} />}
              />
              <CardContent>
                {filteredReceivers.length ? (
                  <Stack spacing={1}>
                    {filteredReceivers.map((r, i) => (
                      <Stack key={i} direction="row" justifyContent="space-between">
                        <Box>
                          <Typography variant="body2">{r.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Last: {formatLocaleDate(r.lastPickupISO)}
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
            <VolunteerCoverageCard masterRoleFilter={['Warehouse']} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Tip: Press Ctrl/Cmd+K in the search box to quickly filter donors/receivers.
          </Typography>
        </Stack>
        <Card
          variant="outlined"
          sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <CardHeader title="Notices & Events" avatar={<Announcement color="primary" />} />
          <CardContent sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <EventList events={visibleEvents} limit={5} />
          </CardContent>
        </Card>
      </Box>

      <FormDialog
        open={Boolean(selectedComposition)}
        onClose={() => setSelectedComposition(null)}
        maxWidth="xs"
      >
        <DialogTitle>
          Composition for {selectedComposition?.month} {year}
        </DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            <ListItem>
              <ListItemText primary="Donations" secondary={fmtLbs(selectedComposition?.donations)} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="Surplus" secondary={fmtLbs(selectedComposition?.surplus)} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="Pig Pound" secondary={fmtLbs(selectedComposition?.pigPound)} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="Outgoing" secondary={fmtLbs(selectedComposition?.outgoing)} />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedComposition(null)}>Close</Button>
        </DialogActions>
      </FormDialog>

      </Box>
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Page>
  </>
  );
}

