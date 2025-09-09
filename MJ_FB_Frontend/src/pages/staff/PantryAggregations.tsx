import { useState, useEffect, useRef } from 'react';
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
  rebuildPantryAggregations,
} from '../../api/pantryAggregations';
import { toDate } from '../../utils/date';
import { exportTableToExcel } from '../../utils/exportTableToExcel';

export default function PantryAggregations() {
  const currentYear = toDate().getFullYear();
  const fallbackYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [years, setYears] = useState<number[]>(fallbackYears);
  const [tab, setTab] = useState(0);

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

  const [weeklyYear, setWeeklyYear] = useState(fallbackYears[0]);
  const [weeklyMonth, setWeeklyMonth] = useState(1);
  const [week, setWeek] = useState(1);
  const [weeklyRows, setWeeklyRows] = useState<any[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const weeklyTableRef = useRef<HTMLTableElement>(null);

  const [monthlyYear, setMonthlyYear] = useState(fallbackYears[0]);
  const [month, setMonth] = useState(1);
  const [monthlyRows, setMonthlyRows] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const monthlyTableRef = useRef<HTMLTableElement>(null);

  const [yearlyYear, setYearlyYear] = useState(fallbackYears[0]);
  const [yearlyRows, setYearlyRows] = useState<any[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const yearlyTableRef = useRef<HTMLTableElement>(null);

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
    setWeeklyRows([]);
    getPantryWeekly(weeklyYear, weeklyMonth)
      .then(setWeeklyRows)
      .catch(() => setWeeklyRows([]))
      .finally(() => setWeeklyLoading(false));
  }, [weeklyYear, weeklyMonth, tab]);

  useEffect(() => {
    if (tab !== 1) return;
    setMonthlyLoading(true);
    setMonthlyRows([]);
    getPantryMonthly(monthlyYear, month)
      .then(setMonthlyRows)
      .catch(() => setMonthlyRows([]))
      .finally(() => setMonthlyLoading(false));
  }, [monthlyYear, month, tab]);

  useEffect(() => {
    if (tab !== 2) return;
    setYearlyLoading(true);
    setYearlyRows([]);
    getPantryYearly(yearlyYear)
      .then(setYearlyRows)
      .catch(() => setYearlyRows([]))
      .finally(() => setYearlyLoading(false));
  }, [yearlyYear, tab]);

  const handleExportWeekly = async () => {
    setExportLoading(true);
    try {
      await rebuildPantryAggregations();
      const blob = await exportPantryAggregations({
        period: 'weekly',
        year: weeklyYear,
        month: weeklyMonth,
        week,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${weeklyYear}_${monthNames[weeklyMonth - 1]}_week${week}_pantry_stats.xlsx`;
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
      await rebuildPantryAggregations();
      const blob = await exportPantryAggregations({ period: 'monthly', year: monthlyYear, month });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${monthlyYear}_${monthNames[month - 1]}_pantry_stats.xlsx`;
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
      a.download = `${yearlyYear}_pantry_yearly_stats.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportWeeklyTable = async () => {
    if (!weeklyTableRef.current) return;
    const success = await exportTableToExcel(
      weeklyTableRef.current,
      `${weeklyYear}_${monthNames[weeklyMonth - 1]}_weekly_list`,
    );
    setSnackbar({
      open: true,
      message: success ? 'Export ready' : 'Failed to export',
      severity: success ? 'success' : 'error',
    });
  };

  const handleExportMonthlyTable = async () => {
    if (!monthlyTableRef.current) return;
    const success = await exportTableToExcel(
      monthlyTableRef.current,
      `${monthlyYear}_${monthNames[month - 1]}_monthly_list`,
    );
    setSnackbar({
      open: true,
      message: success ? 'Export ready' : 'Failed to export',
      severity: success ? 'success' : 'error',
    });
  };

  const handleExportYearlyTable = async () => {
    if (!yearlyTableRef.current) return;
    const success = await exportTableToExcel(
      yearlyTableRef.current,
      `${yearlyYear}_yearly_list`,
    );
    setSnackbar({
      open: true,
      message: success ? 'Export ready' : 'Failed to export',
      severity: success ? 'success' : 'error',
    });
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
          <InputLabel id="weekly-month-label">Month</InputLabel>
          <Select
            labelId="weekly-month-label"
            label="Month"
            value={weeklyMonth}
            onChange={e => setWeeklyMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <MenuItem key={m} value={m}>
                {m}
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
            {Array.from({ length: 5 }, (_, i) => i + 1).map(w => (
              <MenuItem key={w} value={w}>
                {w}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleExportWeekly} disabled={exportLoading}>
          {exportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
        <Button variant="contained" onClick={handleExportWeeklyTable} disabled={exportLoading}>
          {exportLoading ? <CircularProgress size={20} /> : 'Export Table'}
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
            tableRef={weeklyTableRef}
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
        <Button variant="contained" onClick={handleExportMonthlyTable} disabled={exportLoading}>
          {exportLoading ? <CircularProgress size={20} /> : 'Export Table'}
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
            tableRef={monthlyTableRef}
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
        <Button variant="contained" onClick={handleExportYearlyTable} disabled={exportLoading}>
          {exportLoading ? <CircularProgress size={20} /> : 'Export Table'}
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
            tableRef={yearlyTableRef}
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
