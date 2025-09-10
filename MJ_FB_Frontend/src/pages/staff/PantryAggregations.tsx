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
  getPantryMonths,
  getPantryWeeks,
  exportPantryAggregations,
  rebuildPantryAggregations,
} from '../../api/pantryAggregations';
import dayjs, { formatDate } from '../../utils/date';
import { getWeekRanges, getWeekForDate } from '../../utils/pantryWeek';

export default function PantryAggregations() {
  const [years, setYears] = useState<number[]>([]);
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

  const [weeklyYear, setWeeklyYear] = useState<number | ''>('');
  const [weeklyMonths, setWeeklyMonths] = useState<number[]>([]);
  const [weeklyMonth, setWeeklyMonth] = useState<number | ''>('');
  const [weeklyWeeks, setWeeklyWeeks] = useState<number[]>([]);
  const [week, setWeek] = useState<number | ''>('');
  const [weekRanges, setWeekRanges] = useState<{ week: number; label: string }[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<any[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const [monthlyYear, setMonthlyYear] = useState<number | ''>('');
  const [monthlyMonths, setMonthlyMonths] = useState<number[]>([]);
  const [month, setMonth] = useState<number | ''>('');
  const [monthlyRows, setMonthlyRows] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [yearlyYear, setYearlyYear] = useState<number | ''>('');
  const [yearlyRows, setYearlyRows] = useState<any[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (weeklyYear === '' || weeklyMonth === '') {
      setWeekRanges([]);
      setWeek('');
      return;
    }
    const ranges = getWeekRanges(weeklyYear, Number(weeklyMonth) - 1)
      .map(r => {
        let start = dayjs(r.startDate);
        let end = dayjs(r.endDate);

        while (start.day() !== 1 && start.isBefore(end)) {
          start = start.add(1, 'day');
        }
        while (end.day() !== 5 && end.isAfter(start)) {
          end = end.subtract(1, 'day');
        }

        if (start.isAfter(end)) return null;

        const label = start.isSame(end, 'day')
          ? formatDate(start)
          : `${formatDate(start)} - ${formatDate(end)}`;

        return { week: r.week, label };
      })
      .filter(
        (r): r is { week: number; label: string } =>
          r !== null && weeklyWeeks.includes(r.week),
      );

    const today = dayjs();
    const current = getWeekForDate(today);
    const defaultWeek =
      weeklyYear === today.year() &&
      Number(weeklyMonth) - 1 === current.month &&
      weeklyWeeks.includes(current.week)
        ? current.week
        : ranges[0]?.week ?? '';

    setWeekRanges(ranges);
    setWeek(defaultWeek);
  }, [weeklyYear, weeklyMonth, weeklyWeeks]);

  useEffect(() => {
    getPantryYears()
      .then(ys => {
        setYears(ys);
        if (ys.length) {
          const currentYear = dayjs().year();
          const defaultYear = ys.includes(currentYear) ? currentYear : ys[0];
          setWeeklyYear(defaultYear);
          setMonthlyYear(defaultYear);
          setYearlyYear(defaultYear);
        }
      })
      .catch(() => {
        setYears([]);
      });
  }, []);

  useEffect(() => {
    if (weeklyYear === '') {
      setWeeklyMonths([]);
      setWeeklyMonth('');
      return;
    }
    getPantryMonths(weeklyYear)
      .then(ms => {
        setWeeklyMonths(ms);
        const currentMonth = dayjs().month() + 1;
        setWeeklyMonth(ms.includes(currentMonth) ? currentMonth : ms[0] ?? '');
      })
      .catch(() => {
        setWeeklyMonths([]);
        setWeeklyMonth('');
      });
  }, [weeklyYear]);

  useEffect(() => {
    if (monthlyYear === '') {
      setMonthlyMonths([]);
      setMonth('');
      return;
    }
    getPantryMonths(monthlyYear)
      .then(ms => {
        setMonthlyMonths(ms);
        const currentMonth = dayjs().month() + 1;
        setMonth(ms.includes(currentMonth) ? currentMonth : ms[0] ?? '');
      })
      .catch(() => {
        setMonthlyMonths([]);
        setMonth('');
      });
  }, [monthlyYear]);

  useEffect(() => {
    if (weeklyYear === '' || weeklyMonth === '') {
      setWeeklyWeeks([]);
      return;
    }
    getPantryWeeks(weeklyYear, weeklyMonth)
      .then(ws => setWeeklyWeeks(ws))
      .catch(() => setWeeklyWeeks([]));
  }, [weeklyYear, weeklyMonth]);

  useEffect(() => {
    if (tab !== 0 || weeklyYear === '' || weeklyMonth === '') return;
    setWeeklyLoading(true);
    getPantryWeekly(weeklyYear, weeklyMonth)
      .then(setWeeklyRows)
      .catch(() => setWeeklyRows([]))
      .finally(() => setWeeklyLoading(false));
  }, [weeklyYear, weeklyMonth, tab]);

  useEffect(() => {
    if (tab !== 1 || monthlyYear === '' || month === '') return;
    setMonthlyLoading(true);
    getPantryMonthly(monthlyYear, month)
      .then(setMonthlyRows)
      .catch(() => setMonthlyRows([]))
      .finally(() => setMonthlyLoading(false));
  }, [monthlyYear, month, tab]);

  useEffect(() => {
    if (tab !== 2 || yearlyYear === '') return;
    setYearlyLoading(true);
    getPantryYearly(yearlyYear)
      .then(setYearlyRows)
      .catch(() => setYearlyRows([]))
      .finally(() => setYearlyLoading(false));
  }, [yearlyYear, tab]);

  const handleExportWeekly = async () => {
    if (weeklyYear === '' || weeklyMonth === '' || week === '') return;
    setExportLoading(true);
    try {
      await rebuildPantryAggregations();
      const { blob, fileName } = await exportPantryAggregations({
        period: 'weekly',
        year: weeklyYear,
        month: weeklyMonth,
        week: week,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportMonthly = async () => {
    if (monthlyYear === '' || month === '') return;
    setExportLoading(true);
    try {
      await rebuildPantryAggregations();
      const { blob, fileName } = await exportPantryAggregations({
        period: 'monthly',
        year: monthlyYear,
        month,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportYearly = async () => {
    if (yearlyYear === '') return;
    setExportLoading(true);
    try {
      await rebuildPantryAggregations();
      const { blob, fileName } = await exportPantryAggregations({
        period: 'yearly',
        year: yearlyYear,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="medium" fullWidth sx={{ minWidth: { sm: 80 } }}>
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
        <FormControl size="medium" fullWidth sx={{ minWidth: { sm: 90 } }}>
          <InputLabel id="weekly-month-label">Month</InputLabel>
          <Select
            labelId="weekly-month-label"
            label="Month"
            value={weeklyMonth}
            onChange={e => setWeeklyMonth(Number(e.target.value))}
            disabled={!weeklyMonths.length}
          >
            {weeklyMonths.map(m => (
              <MenuItem key={m} value={m}>
                {monthNames[m - 1]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="medium" fullWidth sx={{ minWidth: { sm: 90 } }}>
          <InputLabel id="weekly-week-label">Week</InputLabel>
          <Select
            labelId="weekly-week-label"
            label="Week"
            value={week}
            onChange={e =>
              setWeek(e.target.value === '' ? '' : Number(e.target.value))
            }
            disabled={!weekRanges.length}
          >
            {weekRanges.map(range => (
              <MenuItem key={range.week} value={range.week}>
                {range.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleExportWeekly}
          disabled={exportLoading || !weekRanges.length}
          fullWidth
          sx={{ width: { sm: 'auto' } }}
        >
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
          />
        )}
      </TableContainer>
    </>
  );

  const monthlyContent = (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="medium" fullWidth sx={{ minWidth: { sm: 80 } }}>
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
        <FormControl size="medium" fullWidth sx={{ minWidth: { sm: 90 } }}>
          <InputLabel id="monthly-month-label">Month</InputLabel>
          <Select
            labelId="monthly-month-label"
            label="Month"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            disabled={!monthlyMonths.length}
          >
            {monthlyMonths.map(m => (
              <MenuItem key={m} value={m}>
                {monthNames[m - 1]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleExportMonthly}
          disabled={exportLoading || !month}
          fullWidth
          sx={{ width: { sm: 'auto' } }}
        >
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
          />
        )}
      </TableContainer>
    </>
  );

  const yearlyContent = (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="medium" fullWidth sx={{ minWidth: { sm: 80 } }}>
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
        <Button
          variant="contained"
          onClick={handleExportYearly}
          disabled={exportLoading || !yearlyYear}
          fullWidth
          sx={{ width: { sm: 'auto' } }}
        >
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
