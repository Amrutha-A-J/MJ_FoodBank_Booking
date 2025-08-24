import { useState, useEffect } from 'react';
import {
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
import {
  getWarehouseOverall,
  rebuildWarehouseOverall,
  type WarehouseOverall,
} from '../api/warehouseOverall';
import FeedbackSnackbar from '../components/FeedbackSnackbar';

export default function Aggregations() {
  const [overallRows, setOverallRows] = useState<WarehouseOverall[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const currentYear = new Date().getFullYear();
  const [overallYear, setOverallYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    setOverallLoading(true);
    setOverallRows([]);
    getWarehouseOverall(overallYear)
      .then(setOverallRows)
      .catch(() => setOverallRows([]))
      .finally(() => setOverallLoading(false));
  }, [overallYear]);

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
      .catch(() => {
        setSnackbar({ open: true, message: 'Failed to recalculate totals', severity: 'error' });
      })
      .finally(() => setRebuilding(false));
  };

  return (
    <Page title="Aggregations">
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
    </Page>
  );
}
