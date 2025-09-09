import { useEffect, useRef, useState } from 'react';
import {
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TableContainer,
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

interface AggRow {
  [key: string]: any;
}

export default function PantryAggregations() {
  const currentYear = toDate().getFullYear();
  const fallbackYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [years, setYears] = useState<number[]>(fallbackYears);
  const [weeklyYear, setWeeklyYear] = useState(fallbackYears[0]);
  const [weeklyWeek, setWeeklyWeek] = useState(1);
  const [monthlyYear, setMonthlyYear] = useState(fallbackYears[0]);
  const [monthlyMonth, setMonthlyMonth] = useState(1);
  const [yearlyYear, setYearlyYear] = useState(fallbackYears[0]);
  const [weeklyRows, setWeeklyRows] = useState<AggRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<AggRow[]>([]);
  const [yearlyRows, setYearlyRows] = useState<AggRow[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [weeklyExportLoading, setWeeklyExportLoading] = useState(false);
  const [monthlyExportLoading, setMonthlyExportLoading] = useState(false);
  const [yearlyExportLoading, setYearlyExportLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const weeklyTableRef = useRef<HTMLTableElement>(null);
  const monthlyTableRef = useRef<HTMLTableElement>(null);
  const yearlyTableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    async function loadYears() {
      try {
        const ys = await getPantryYears();
        if (ys.length) {
          setYears(ys);
          setWeeklyYear(ys[0]);
          setMonthlyYear(ys[0]);
          setYearlyYear(ys[0]);
        }
      } catch {
        setYears(fallbackYears);
      }
    }
    loadYears();
  }, []);

  useEffect(() => {
    setWeeklyLoading(true);
    getPantryWeekly(weeklyYear, weeklyWeek)
      .then(setWeeklyRows)
      .catch(() => setWeeklyRows([]))
      .finally(() => setWeeklyLoading(false));
  }, [weeklyYear, weeklyWeek]);

  useEffect(() => {
    setMonthlyLoading(true);
    getPantryMonthly(monthlyYear, monthlyMonth)
      .then(setMonthlyRows)
      .catch(() => setMonthlyRows([]))
      .finally(() => setMonthlyLoading(false));
  }, [monthlyYear, monthlyMonth]);

  useEffect(() => {
    setYearlyLoading(true);
    getPantryYearly(yearlyYear)
      .then(setYearlyRows)
      .catch(() => setYearlyRows([]))
      .finally(() => setYearlyLoading(false));
  }, [yearlyYear]);

  const weekOptions = Array.from({ length: 52 }, (_, i) => i + 1);
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

  function renderTable(rows: AggRow[], loading: boolean, ref: React.RefObject<HTMLTableElement>) {
    const columns: Column<AggRow>[] = Object.keys(rows[0] || {}).map(key => ({
      field: key,
      header: key,
    }));
    return (
      <TableContainer sx={{ overflowX: 'auto' }}>
        {loading ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <ResponsiveTable columns={columns} rows={rows} tableRef={ref} />
        )}
      </TableContainer>
    );
  }

  async function handleExport(type: 'weekly' | 'monthly' | 'yearly') {
    try {
      if (type === 'weekly') setWeeklyExportLoading(true);
      else if (type === 'monthly') setMonthlyExportLoading(true);
      else setYearlyExportLoading(true);

      const params =
        type === 'weekly'
          ? { year: weeklyYear, week: weeklyWeek }
          : type === 'monthly'
          ? { year: monthlyYear, month: monthlyMonth }
          : { year: yearlyYear };
      const blob = await exportPantryAggregations(type, params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${params.year}_pantry_${type}_aggregations.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Export ready', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setWeeklyExportLoading(false);
      setMonthlyExportLoading(false);
      setYearlyExportLoading(false);
    }
  }

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
            value={weeklyWeek}
            onChange={e => setWeeklyWeek(Number(e.target.value))}
          >
            {weekOptions.map(w => (
              <MenuItem key={w} value={w}>
                {w}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={() => handleExport('weekly')}
          disabled={weeklyExportLoading}
        >
          {weeklyExportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
      </Stack>
      {renderTable(weeklyRows, weeklyLoading, weeklyTableRef)}
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
            value={monthlyMonth}
            onChange={e => setMonthlyMonth(Number(e.target.value))}
          >
            {monthNames.map((m, idx) => (
              <MenuItem key={idx + 1} value={idx + 1}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={() => handleExport('monthly')}
          disabled={monthlyExportLoading}
        >
          {monthlyExportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
      </Stack>
      {renderTable(monthlyRows, monthlyLoading, monthlyTableRef)}
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
        <Button
          variant="contained"
          onClick={() => handleExport('yearly')}
          disabled={yearlyExportLoading}
        >
          {yearlyExportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
      </Stack>
      {renderTable(yearlyRows, yearlyLoading, yearlyTableRef)}
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
      <Page title="Pantry Aggregations">
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

