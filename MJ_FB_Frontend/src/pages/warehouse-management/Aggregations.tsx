import { useState, useEffect, useRef, useMemo } from 'react';
import {
  TableContainer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
} from '@mui/material';
import Page from '../../components/Page';
import {
  getWarehouseOverall,
  getWarehouseOverallYears,
  exportWarehouseOverall,
  postManualWarehouseOverall,
  type WarehouseOverall,
  getWarehouseMonthlyHistory,
  exportWarehouseMonthlyHistory,
  type WarehouseMonthlyHistoryResponse,
} from '../../api/warehouseOverall';
import {
  getDonorAggregations,
  postManualDonorAggregation,
  type DonorAggregation,
} from '../../api/donations';
import { getDonors, type Donor } from '../../api/donors';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormDialog from '../../components/FormDialog';
import StyledTabs from '../../components/StyledTabs';
import { toDate } from '../../utils/date';
import { exportTableToExcel } from '../../utils/exportTableToExcel';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';

const RECENT_YEARS_LIMIT = 5;
const DONOR_TAB = 0;
const HISTORICAL_TAB = 2;

function resolveMonthlyTotal(entry?: WarehouseMonthlyHistoryResponse['entries'][number]) {
  if (!entry) return 0;
  if (typeof entry.total === 'number') return entry.total;
  const donations = typeof entry.donations === 'number' ? entry.donations : 0;
  const petFood = typeof entry.petFood === 'number' ? entry.petFood : 0;
  return donations + petFood;
}

export default function Aggregations() {
  const [overallRows, setOverallRows] = useState<WarehouseOverall[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const currentYear = toDate().getFullYear();
  const fallbackYears = Array.from({ length: RECENT_YEARS_LIMIT }, (_, i) => currentYear - i);
  const [years, setYears] = useState<number[]>(fallbackYears);
  const [overallYear, setOverallYear] = useState(fallbackYears[0]);
  const [donorYear, setDonorYear] = useState(fallbackYears[0]);
  const [showAllYears, setShowAllYears] = useState(false);
  const [tab, setTab] = useState(0);
  const [donorRows, setDonorRows] = useState<DonorAggregation[]>([]);
  const [donorLoading, setDonorLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [donorExportLoading, setDonorExportLoading] = useState(false);
  const donorTableRef = useRef<HTMLTableElement>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<WarehouseMonthlyHistoryResponse | null>(null);
  const [monthlyHistoryLoading, setMonthlyHistoryLoading] = useState(false);
  const [monthlyHistoryExportLoading, setMonthlyHistoryExportLoading] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [insertMonth, setInsertMonth] = useState('');
  const [insertDonations, setInsertDonations] = useState('');
  const [insertSurplus, setInsertSurplus] = useState('');
  const [insertPigPound, setInsertPigPound] = useState('');
  const [insertPetFood, setInsertPetFood] = useState('');
  const [insertOutgoing, setInsertOutgoing] = useState('');
  const [insertLoading, setInsertLoading] = useState(false);
  const [donorInsertOpen, setDonorInsertOpen] = useState(false);
  const [donorInsertMonth, setDonorInsertMonth] = useState('');
  const [donorInsertDonor, setDonorInsertDonor] = useState<Donor | null>(null);
  const [donorInsertTotal, setDonorInsertTotal] = useState('');
  const [donorInsertLoading, setDonorInsertLoading] = useState(false);
  const [donorOptions, setDonorOptions] = useState<Donor[]>([]);
  const [donorSearch, setDonorSearch] = useState('');
  const [donorInputValue, setDonorInputValue] = useState('');
  const [donorOptionsLoading, setDonorOptionsLoading] = useState(false);

  const sortedYears = useMemo(() => [...years].sort((a, b) => b - a), [years]);
  const recentYears = useMemo(() => sortedYears.slice(0, RECENT_YEARS_LIMIT), [sortedYears]);
  const olderYears = useMemo(() => sortedYears.slice(RECENT_YEARS_LIMIT), [sortedYears]);

  const donorYearOptions = useMemo(() => {
    const base = showAllYears ? sortedYears : recentYears;
    if (base.includes(donorYear)) return base;
    return [...base, donorYear].sort((a, b) => b - a);
  }, [donorYear, recentYears, showAllYears, sortedYears]);

  const overallYearOptions = useMemo(() => {
    const base = showAllYears ? sortedYears : recentYears;
    if (base.includes(overallYear)) return base;
    return [...base, overallYear].sort((a, b) => b - a);
  }, [overallYear, recentYears, showAllYears, sortedYears]);

  function formatDonorDisplay(donor: Donor) {
    const contact = [donor.email, donor.phone]
      .map(value => value?.trim())
      .filter((value): value is string => Boolean(value))
      .join(' • ');
    const name = donor.name.trim() || 'Unnamed donor';
    return contact ? `${name} (${contact})` : name;
  }

  useEffect(() => {
    if (!donorInsertOpen) return;
    let active = true;
    setDonorOptionsLoading(true);
    getDonors(donorSearch)
      .then(donors => {
        if (!active) return;
        setDonorOptions(donors.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (active) setDonorOptions([]);
      })
      .finally(() => {
        if (active) setDonorOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [donorInsertOpen, donorSearch]);
  useEffect(() => {
    async function loadYears() {
      try {
        const ys = await getWarehouseOverallYears();
        if (ys.length) {
          const sorted = [...ys].sort((a, b) => b - a);
          setYears(sorted);
          setOverallYear(sorted[0]);
          setDonorYear(sorted[0]);
        } else {
          setYears([...fallbackYears]);
          setOverallYear(fallbackYears[0]);
          setDonorYear(fallbackYears[0]);
        }
      } catch {
        setYears([...fallbackYears]);
        setOverallYear(fallbackYears[0]);
        setDonorYear(fallbackYears[0]);
      }
    }
    loadYears();
  }, []);

  async function loadOverall() {
    setOverallLoading(true);
    setOverallRows([]);
    try {
      const rows = await getWarehouseOverall(overallYear);
      setOverallRows(rows);
    } catch {
      setOverallRows([]);
    } finally {
      setOverallLoading(false);
    }
  }

  useEffect(() => {
    loadOverall();
  }, [overallYear]);

  useEffect(() => {
    if (tab !== DONOR_TAB) return;
    setDonorLoading(true);
    setDonorRows([]);
    getDonorAggregations(donorYear)
      .then(setDonorRows)
      .catch(() => {
        setSnackbar({ open: true, message: 'Failed to load donor aggregations', severity: 'error' });
        setDonorRows([]);
      })
      .finally(() => setDonorLoading(false));
  }, [donorYear, tab]);

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
      petFood: row?.petFood || 0,
      outgoingDonations: row?.outgoingDonations || 0,
    };
  });

  const totals = overallData.reduce(
    (acc, r) => ({
      donations: acc.donations + r.donations,
      surplus: acc.surplus + r.surplus,
      pigPound: acc.pigPound + r.pigPound,
      petFood: acc.petFood + r.petFood,
      outgoingDonations: acc.outgoingDonations + r.outgoingDonations,
    }),
    { donations: 0, surplus: 0, pigPound: 0, petFood: 0, outgoingDonations: 0 },
  );

  const poundsFormatter = useMemo(() => new Intl.NumberFormat('en-CA'), []);

  async function handleExportOverall() {
    setExportLoading(true);
    try {
      const blob = await exportWarehouseOverall(overallYear);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${overallYear}_warehouse_overall_stats.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Export ready', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  }

  async function handleExportDonors() {
    if (!donorTableRef.current) return;
    setDonorExportLoading(true);
    const success = await exportTableToExcel(
      donorTableRef.current,
      `${donorYear}_donor_aggregations`,
    );
    setSnackbar({
      open: true,
      message: success ? 'Export ready' : 'Failed to export',
      severity: success ? 'success' : 'error',
    });
    setDonorExportLoading(false);
  }

  useEffect(() => {
    if (tab !== HISTORICAL_TAB) return;
    setMonthlyHistoryLoading(true);
    setMonthlyHistory(null);
    getWarehouseMonthlyHistory()
      .then(data => {
        setMonthlyHistory(data);
      })
      .catch(() => {
        setSnackbar({
          open: true,
          message: 'Failed to load monthly history',
          severity: 'error',
        });
        setMonthlyHistory(null);
      })
      .finally(() => setMonthlyHistoryLoading(false));
  }, [tab]);

  async function handleExportMonthlyHistory() {
    setMonthlyHistoryExportLoading(true);
    try {
      const blob = await exportWarehouseMonthlyHistory();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'warehouse_monthly_history.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Export ready', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setMonthlyHistoryExportLoading(false);
    }
  }

  const monthlyHistoryDerived = useMemo(() => {
    if (!monthlyHistory) {
      return {
        years: [] as number[],
        entryMap: new Map<string, WarehouseMonthlyHistoryResponse['entries'][number]>(),
        monthTotals: Array(12).fill(0) as number[],
        yearTotals: {} as Record<number, number>,
        grandTotal: 0,
      };
    }

    const years = Array.isArray(monthlyHistory.years)
      ? monthlyHistory.years.filter((year): year is number => typeof year === 'number')
      : [];
    const entries = Array.isArray(monthlyHistory.entries)
      ? monthlyHistory.entries.filter(
          (entry): entry is WarehouseMonthlyHistoryResponse['entries'][number] =>
            Boolean(entry) && typeof entry.year === 'number' && typeof entry.month === 'number',
        )
      : [];

    const derivedYears = years.length
      ? years
      : Array.from(new Set(entries.map(entry => entry.year))).sort((a, b) => a - b);

    const entryMap = new Map<string, WarehouseMonthlyHistoryResponse['entries'][number]>();
    const monthTotals = Array(12).fill(0) as number[];
    const yearTotals: Record<number, number> = {};

    derivedYears.forEach(year => {
      yearTotals[year] = 0;
    });

    entries.forEach(entry => {
      const key = `${entry.year}-${entry.month}`;
      const total = resolveMonthlyTotal(entry);
      entryMap.set(key, entry);
      if (entry.month >= 1 && entry.month <= 12) {
        monthTotals[entry.month - 1] += total;
      }
      yearTotals[entry.year] = (yearTotals[entry.year] ?? 0) + total;
    });

    const grandTotal = Object.values(yearTotals).reduce((acc, total) => acc + total, 0);

    return {
      years: derivedYears,
      entryMap,
      monthTotals,
      yearTotals,
      grandTotal,
    };
  }, [monthlyHistory]);

  const donorContent = (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{
          mb: 2,
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <FormControl sx={{ minWidth: { xs: '100%', sm: 160 } }}>
          <InputLabel id="donor-year-label">Year</InputLabel>
          <Select
            labelId="donor-year-label"
            label="Year"
            value={donorYear}
            onChange={e => setDonorYear(Number(e.target.value))}
          >
            {donorYearOptions.map(y => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {olderYears.length > 0 && (
          <Button
            variant="text"
            onClick={() => setShowAllYears(prev => !prev)}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {showAllYears ? 'Hide older years' : 'Show older years'}
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleExportDonors}
          disabled={donorExportLoading}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {donorExportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            setDonorInsertMonth('');
            setDonorInsertDonor(null);
            setDonorInsertTotal('');
            setDonorOptions([]);
            setDonorInputValue('');
            setDonorSearch('');
            setDonorInsertOpen(true);
          }}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Insert Aggregate
        </Button>
      </Stack>
      <TableContainer sx={{ overflow: 'auto', maxHeight: 400 }}>
        {(() => {
          interface DonorRow {
            donor: string;
            total: number;
            [key: `m${number}`]: number;
          }

          const donorRowsData: DonorRow[] = donorRows.map(d => {
            const row: DonorRow = { donor: d.donor, total: d.total };
            monthNames.forEach((_, idx) => {
              row[`m${idx}`] = d.monthlyTotals[idx];
            });
            return row;
          });
          const monthTotals = Array(12).fill(0);
          donorRows.forEach(d =>
            d.monthlyTotals.forEach((v, i) => {
              monthTotals[i] += v;
            }),
          );
          const totalsRow: DonorRow = {
            donor: 'Total',
            total: monthTotals.reduce((a, b) => a + b, 0),
          };
          monthNames.forEach((_, idx) => {
            totalsRow[`m${idx}`] = monthTotals[idx];
          });

          const columns: Column<DonorRow>[] = [
            { field: 'donor', header: 'Donor' },
            ...monthNames.map((name, idx) => ({
              field: `m${idx}` as keyof DonorRow & string,
              header: name,
              render: (r: DonorRow) => r[`m${idx}`],
            })),
            { field: 'total', header: 'Total' },
          ];

          const rows = [...donorRowsData, totalsRow];

          return donorLoading ? (
            <Stack alignItems="center" py={2}>
              <CircularProgress size={24} />
            </Stack>
          ) : (
            <ResponsiveTable
              columns={columns}
              rows={rows}
              getRowKey={r => r.donor}
              tableRef={donorTableRef}
            />
          );
        })()}
      </TableContainer>
    </>
  );

  const overallContent = (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{
          mb: 2,
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <FormControl sx={{ minWidth: { xs: '100%', sm: 160 } }}>
          <InputLabel id="overall-year-label">Year</InputLabel>
          <Select
            labelId="overall-year-label"
            label="Year"
            value={overallYear}
            onChange={e => setOverallYear(Number(e.target.value))}
          >
            {overallYearOptions.map(y => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {olderYears.length > 0 && (
          <Button
            variant="text"
            onClick={() => setShowAllYears(prev => !prev)}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {showAllYears ? 'Hide older years' : 'Show older years'}
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleExportOverall}
          disabled={exportLoading}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {exportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            setInsertMonth('');
            setInsertDonations('');
            setInsertSurplus('');
            setInsertPigPound('');
            setInsertPetFood('');
            setInsertOutgoing('');
            setInsertOpen(true);
          }}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Insert Aggregate
        </Button>
      </Stack>
      <TableContainer sx={{ overflowX: 'auto' }}>
        {overallLoading ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          (() => {
            type OverallRow = WarehouseOverall & { monthName: string };
            const columns: Column<OverallRow>[] = [
              { field: 'monthName', header: 'Month' },
              { field: 'donations', header: 'Donations' },
              { field: 'surplus', header: 'Surplus' },
              { field: 'pigPound', header: 'Pig Pound' },
              { field: 'petFood', header: 'Pet Food' },
              { field: 'outgoingDonations', header: 'Outgoing Donations' },
            ];

            const rows: OverallRow[] = overallData.map(r => ({
              ...r,
              monthName: monthNames[r.month - 1],
            }));
            rows.push({
              month: 13,
              monthName: 'Total',
              donations: totals.donations,
              surplus: totals.surplus,
              pigPound: totals.pigPound,
              petFood: totals.petFood,
              outgoingDonations: totals.outgoingDonations,
            });

            return (
              <ResponsiveTable
                columns={columns}
                rows={rows}
                getRowKey={r => r.monthName}
              />
            );
          })()
        )}
      </TableContainer>
    </>
  );

  const historicalContent = (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{
          mb: 2,
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Button
          variant="contained"
          onClick={handleExportMonthlyHistory}
          disabled={monthlyHistoryExportLoading}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {monthlyHistoryExportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
      </Stack>
      <TableContainer sx={{ overflowX: 'auto' }}>
        {monthlyHistoryLoading ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          (() => {
            interface YearlyHistoryRow {
              yearLabel: string;
              total: number;
              isTotal?: boolean;
              [key: `m${number}`]: number | string | boolean | undefined;
            }

            const { years, entryMap, monthTotals, yearTotals, grandTotal } = monthlyHistoryDerived;

            const columns: Column<YearlyHistoryRow>[] = [
              { field: 'yearLabel', header: 'Year' },
              ...monthNames.map((name, idx) => ({
                field: `m${idx + 1}` as keyof YearlyHistoryRow & string,
                header: name,
                render: (row: YearlyHistoryRow) =>
                  `${poundsFormatter.format(Number(row[`m${idx + 1}`] ?? 0))} lbs`,
              })),
              {
                field: 'total',
                header: 'Total (lbs)',
                render: row => `${poundsFormatter.format(row.total)} lbs`,
              },
            ];

            const rows: YearlyHistoryRow[] = years.map(year => {
              const row: YearlyHistoryRow = {
                yearLabel: String(year),
                total: yearTotals[year] ?? 0,
              };
              monthNames.forEach((_, idx) => {
                const month = idx + 1;
                const entry = entryMap.get(`${year}-${month}`);
                row[`m${month}`] = resolveMonthlyTotal(entry);
              });
              return row;
            });

            const totalsRow: YearlyHistoryRow = {
              yearLabel: 'Total',
              total: grandTotal,
              isTotal: true,
            };
            monthNames.forEach((_, idx) => {
              const month = idx + 1;
              totalsRow[`m${month}`] = monthTotals[idx] ?? 0;
            });
            rows.push(totalsRow);

            return (
              <ResponsiveTable
                columns={columns}
                rows={rows}
                getRowKey={row => (row.isTotal ? 'total' : row.yearLabel)}
              />
            );
          })()
        )}
      </TableContainer>
    </>
  );

  const tabs = [
    { label: 'Donor Aggregations', content: donorContent },
    { label: 'Yearly Overall Aggregations', content: overallContent },
    { label: 'Historical Donations', content: historicalContent },
  ];

  return (
    <Page title="Warehouse Aggregations">
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} />
      <FormDialog open={donorInsertOpen} onClose={() => setDonorInsertOpen(false)}>
        <DialogTitle>Insert Aggregate</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Month"
              type="number"
              value={donorInsertMonth}
              onChange={e => setDonorInsertMonth(e.target.value)}
              size="medium"
            />
            <Autocomplete
              options={donorOptions}
              value={donorInsertDonor}
              onChange={(_, value) => setDonorInsertDonor(value)}
              inputValue={donorInputValue}
              onInputChange={(_, value, reason) => {
                setDonorInputValue(value);
                if (reason === 'input') {
                  setDonorSearch(value);
                }
              }}
              loading={donorOptionsLoading}
              getOptionLabel={formatDonorDisplay}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Donor"
                  size="medium"
                  helperText="Search by name, email, or phone"
                />
              )}
            />
            <TextField
              label="Total"
              type="number"
              value={donorInsertTotal}
              onChange={e => setDonorInsertTotal(e.target.value)}
              size="medium"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDonorInsertOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (donorInsertMonth === '' || !donorInsertDonor) return;
              const parsedMonth = Number(donorInsertMonth);
              if (Number.isNaN(parsedMonth)) return;
              setDonorInsertLoading(true);
              try {
                await postManualDonorAggregation({
                  year: donorYear,
                  month: parsedMonth,
                  donorId: donorInsertDonor.id,
                  total: Number(donorInsertTotal) || 0,
                });
                setSnackbar({ open: true, message: 'Aggregate saved', severity: 'success' });
                setDonorInsertOpen(false);
                setDonorInsertDonor(null);
                setDonorLoading(true);
                getDonorAggregations(donorYear)
                  .then(setDonorRows)
                  .catch(() => {
                    setSnackbar({
                      open: true,
                      message: 'Failed to load donor aggregations',
                      severity: 'error',
                    });
                    setDonorRows([]);
                  })
                  .finally(() => setDonorLoading(false));
              } catch {
                setSnackbar({ open: true, message: 'Failed to save', severity: 'error' });
              } finally {
                setDonorInsertLoading(false);
              }
            }}
            disabled={
              donorInsertLoading || donorInsertMonth === '' || !donorInsertDonor
            }
            sx={{ textTransform: 'none' }}
          >
            {donorInsertLoading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </FormDialog>
      <FormDialog open={insertOpen} onClose={() => setInsertOpen(false)}>
        <DialogTitle>Insert Aggregate</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Month"
              type="number"
              value={insertMonth}
              onChange={e => setInsertMonth(e.target.value)}
              size="medium"
            />
            <TextField
              label="Total Donations"
              type="number"
              value={insertDonations}
              onChange={e => setInsertDonations(e.target.value)}
              size="medium"
            />
            <TextField
              label="Surplus"
              type="number"
              value={insertSurplus}
              onChange={e => setInsertSurplus(e.target.value)}
              size="medium"
            />
            <TextField
              label="Pig Pound"
              type="number"
              value={insertPigPound}
              onChange={e => setInsertPigPound(e.target.value)}
              size="medium"
            />
            <TextField
              label="Pet Food"
              type="number"
              value={insertPetFood}
              onChange={e => setInsertPetFood(e.target.value)}
              size="medium"
            />
            <TextField
              label="Outgoing Donations"
              type="number"
              value={insertOutgoing}
              onChange={e => setInsertOutgoing(e.target.value)}
              size="medium"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsertOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (insertMonth === '') return;
              setInsertLoading(true);
              try {
                await postManualWarehouseOverall({
                  year: overallYear,
                  month: Number(insertMonth),
                  donations: Number(insertDonations) || 0,
                  surplus: Number(insertSurplus) || 0,
                  pigPound: Number(insertPigPound) || 0,
                  petFood: Number(insertPetFood) || 0,
                  outgoingDonations: Number(insertOutgoing) || 0,
                });
                setSnackbar({ open: true, message: 'Aggregate saved', severity: 'success' });
                setInsertOpen(false);
                loadOverall();
              } catch {
                setSnackbar({ open: true, message: 'Failed to save', severity: 'error' });
              } finally {
                setInsertLoading(false);
              }
            }}
            disabled={insertLoading || insertMonth === ''}
            sx={{ textTransform: 'none' }}
          >
            {insertLoading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </FormDialog>
        <FeedbackSnackbar
          open={snackbar.open}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
          severity={snackbar.severity}
        />
      </Page>
    );
  }
