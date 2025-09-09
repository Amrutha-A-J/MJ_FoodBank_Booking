import { useState, useEffect } from 'react';
import {
  TableContainer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
  CircularProgress,
} from '@mui/material';
import Page from '../../components/Page';
import StyledTabs from '../../components/StyledTabs';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import {
  getPantryWeekly,
  getPantryMonthly,
  getPantryYearly,
  getPantryYears,
  exportPantryAggregations,
} from '../../api/pantryAggregations';
import { toDate } from '../../utils/date';

export default function PantryAggregations() {
  const currentYear = toDate().getFullYear();
  const fallbackYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [years, setYears] = useState<number[]>(fallbackYears);
  const [tab, setTab] = useState(0);

  const [weeklyYear, setWeeklyYear] = useState(fallbackYears[0]);
  const [week, setWeek] = useState(1);
  const [weeklyRows, setWeeklyRows] = useState<any[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const [monthlyYear, setMonthlyYear] = useState(fallbackYears[0]);
  const [month, setMonth] = useState(1);
  const [monthlyRows, setMonthlyRows] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [yearlyYear, setYearlyYear] = useState(fallbackYears[0]);
  const [yearlyRows, setYearlyRows] = useState<any[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    getPantryYears()
      .then(ys => {
        if (ys.length) {
          setYears(ys);
          setWeeklyYear(ys[0]);
          setMonthlyYear(ys[0]);
          setYearlyYear(ys[0]);
        }
      })
      .catch(() => {
        setYears(fallbackYears);
        setWeeklyYear(fallbackYears[0]);
        setMonthlyYear(fallbackYears[0]);
        setYearlyYear(fallbackYears[0]);
      });
  }, []);

  useEffect(() => {
    if (tab !== 0) return;
    setWeeklyLoading(true);
    getPantryWeekly(weeklyYear, week)
      .then(setWeeklyRows)
      .catch(() => setWeeklyRows([]))
      .finally(() => setWeeklyLoading(false));
  }, [weeklyYear, week, tab]);

  useEffect(() => {
    if (tab !== 1) return;
    setMonthlyLoading(true);
    getPantryMonthly(monthlyYear, month)
      .then(setMonthlyRows)
      .catch(() => setMonthlyRows([]))
      .finally(() => setMonthlyLoading(false));
  }, [monthlyYear, month, tab]);

  useEffect(() => {
    if (tab !== 2) return;
    setYearlyLoading(true);
    getPantryYearly(yearlyYear)
      .then(setYearlyRows)
      .catch(() => setYearlyRows([]))
      .finally(() => setYearlyLoading(false));
  }, [yearlyYear, tab]);

  const handleExportWeekly = async () => {
    setExportLoading(true);
    try {
      const blob = await exportPantryAggregations({ period: 'weekly', year: weeklyYear, week });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pantry-weekly-${weeklyYear}-w${week}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportMonthly = async () => {
    setExportLoading(true);
    try {
      const blob = await exportPantryAggregations({ period: 'monthly', year: monthlyYear, month });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pantry-monthly-${monthlyYear}-${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportYearly = async () => {
    setExportLoading(true);
    try {
      const blob = await exportPantryAggregations({ period: 'yearly', year: yearlyYear });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pantry-yearly-${yearlyYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const weeklyContent = (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="weekly-year-label">Year</InputLabel>
          <Select
            labelId="weekly-year-label"
            label="Year"
            value={weeklyYear}
            onChange={e => setWeeklyYear(Number(e.target.value))}
          >
            {years.map(y => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="weekly-week-label">Week</InputLabel>
          <Select
            labelId="weekly-week-label"
            label="Week"
            value={week}
            onChange={e => setWeek(Number(e.target.value))}
          >
            {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
              <MenuItem key={w} value={w}>
                {w}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleExportWeekly} disabled={exportLoading}>
          {exportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
      </Stack>
      <TableContainer sx={{ overflowX: 'auto' }}>
        {weeklyLoading ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <ResponsiveTable
            columns={
              weeklyRows.length
                ? (Object.keys(weeklyRows[0]).map(key => ({ field: key, header: key })) as Column<any>[])
                : []
            }
            rows={weeklyRows}
            getRowKey={(_r, i) => String(i)}
          />
        )}
      </TableContainer>
    </>
  );

  const monthlyContent = (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="monthly-year-label">Year</InputLabel>
          <Select
            labelId="monthly-year-label"
            label="Year"
            value={monthlyYear}
            onChange={e => setMonthlyYear(Number(e.target.value))}
          >
            {years.map(y => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="monthly-month-label">Month</InputLabel>
          <Select
            labelId="monthly-month-label"
            label="Month"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleExportMonthly} disabled={exportLoading}>
          {exportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
      </Stack>
      <TableContainer sx={{ overflowX: 'auto' }}>
        {monthlyLoading ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <ResponsiveTable
            columns={
              monthlyRows.length
                ? (Object.keys(monthlyRows[0]).map(key => ({ field: key, header: key })) as Column<any>[])
                : []
            }
            rows={monthlyRows}
            getRowKey={(_r, i) => String(i)}
          />
        )}
      </TableContainer>
    </>
  );

  const yearlyContent = (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="yearly-year-label">Year</InputLabel>
          <Select
            labelId="yearly-year-label"
            label="Year"
            value={yearlyYear}
            onChange={e => setYearlyYear(Number(e.target.value))}
          >
            {years.map(y => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleExportYearly} disabled={exportLoading}>
          {exportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
      </Stack>
      <TableContainer sx={{ overflowX: 'auto' }}>
        {yearlyLoading ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <ResponsiveTable
            columns={
              yearlyRows.length
                ? (Object.keys(yearlyRows[0]).map(key => ({ field: key, header: key })) as Column<any>[])
                : []
            }
            rows={yearlyRows}
            getRowKey={(_r, i) => String(i)}
          />
        )}
      </TableContainer>
    </>
  );

  const tabs = [
    { label: 'Weekly', content: weeklyContent },
    { label: 'Monthly', content: monthlyContent },
    { label: 'Yearly', content: yearlyContent },
  ];

  return (
    <>
      <PantryQuickLinks />
      <Page title="Aggregations">
        <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} />
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
