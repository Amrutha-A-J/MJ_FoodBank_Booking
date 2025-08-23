import { useState, useEffect, useRef } from 'react';
import {
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
  CircularProgress,
} from '@mui/material';
import Page from '../components/Page';
import { getDonorAggregations, type DonorAggregation } from '../api/donations';
import {
  getWarehouseOverall,
  rebuildWarehouseOverall,
  type WarehouseOverall,
} from '../api/warehouseOverall';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { exportTableToExcel } from '../utils/exportTableToExcel';

export default function Aggregations() {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<DonorAggregation[]>([]);
  const [loading, setLoading] = useState(false);
  const [overallRows, setOverallRows] = useState<WarehouseOverall[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [overallYear, setOverallYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleExport = () => {
    if (tableRef.current) {
      exportTableToExcel(tableRef.current, `donor_aggregations_${year}`);
    }
  };

  useEffect(() => {
    if (tab !== 0) return;
    setLoading(true);
    setRows([]);
    getDonorAggregations(year)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tab, year]);

  const donors = Array.from(new Set(rows.map(r => r.donor))).sort((a, b) =>
    a.localeCompare(b)
  );
  const months = Array.from(new Set(rows.map(r => r.month))).sort();

  useEffect(() => {
    if (tab !== 2) return;
    setOverallLoading(true);
    setOverallRows([]);
    getWarehouseOverall(overallYear)
      .then(setOverallRows)
      .catch(() => setOverallRows([]))
      .finally(() => setOverallLoading(false));
  }, [tab, overallYear]);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const overallData = monthNames.map((_name, i) => {
    const m = i + 1;
    const row = overallRows.find(r => r.month === m);
    return {
      month: m,
      donations: row?.donations || 0,
      surplus: row?.surplus || 0,
      pigPound: row?.pigPound || 0,
      outgoingDonations: row?.outgoingDonations || 0,
    };
  });

  const totals = overallData.reduce(
    (acc, r) => ({
      donations: acc.donations + r.donations,
      surplus: acc.surplus + r.surplus,
      pigPound: acc.pigPound + r.pigPound,
      outgoingDonations: acc.outgoingDonations + r.outgoingDonations,
    }),
    { donations: 0, surplus: 0, pigPound: 0, outgoingDonations: 0 },
  );

  const handleRebuildOverall = () => {
    setRebuilding(true);
    rebuildWarehouseOverall(overallYear)
      .then(() => {
        setSnackbar({ open: true, message: 'Totals recalculated', severity: 'success' });
        return getWarehouseOverall(overallYear);
      })
      .then(setOverallRows)
      .catch(err =>
        setSnackbar({ open: true, message: err.message || 'Failed to recalculate', severity: 'error' }),
      )
      .finally(() => setRebuilding(false));
  };

  return (
    <Page title="Aggregations">
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Donor Aggregations" />
        <Tab label="Retail Program" />
        <Tab label="Overall" />
      </Tabs>
      {tab === 0 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="year-label">Year</InputLabel>
              <Select
                labelId="year-label"
                label="Year"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              >
                {years.map(y => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button size="small" variant="contained" onClick={handleExport}>
              Export
            </Button>
          </Stack>
          <Table size="small" ref={tableRef}>
            <TableHead>
              <TableRow>
                <TableCell>Donor</TableCell>
                {months.map(m => (
                  <TableCell key={m} align="right">
                    {m}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={months.length + 1} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={months.length + 1} align="center">
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                donors.map(d => (
                  <TableRow key={d}>
                    <TableCell>{d}</TableCell>
                    {months.map(m => (
                      <TableCell key={m} align="right">
                        {rows.find(r => r.donor === d && r.month === m)?.total || 0}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </>
      )}
      {tab === 1 && null}
      {tab === 2 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="overall-year-label">Year</InputLabel>
              <Select
                labelId="overall-year-label"
                label="Year"
                value={overallYear}
                onChange={e => setOverallYear(Number(e.target.value))}
              >
                {years.map(y => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="contained"
              onClick={handleRebuildOverall}
              disabled={rebuilding}
            >
              {rebuilding ? <CircularProgress size={20} /> : 'Calculate Overall'}
            </Button>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell align="right">Donations</TableCell>
                <TableCell align="right">Surplus</TableCell>
                <TableCell align="right">Pig Pound</TableCell>
                <TableCell align="right">Outgoing Donations</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overallLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {overallData.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{monthNames[r.month - 1]}</TableCell>
                      <TableCell align="right">{r.donations}</TableCell>
                      <TableCell align="right">{r.surplus}</TableCell>
                      <TableCell align="right">{r.pigPound}</TableCell>
                      <TableCell align="right">{r.outgoingDonations}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell align="right">{totals.donations}</TableCell>
                    <TableCell align="right">{totals.surplus}</TableCell>
                    <TableCell align="right">{totals.pigPound}</TableCell>
                    <TableCell align="right">{totals.outgoingDonations}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
          <FeedbackSnackbar
            open={snackbar.open}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            message={snackbar.message}
            severity={snackbar.severity}
          />
        </>
      )}
    </Page>
  );
}
