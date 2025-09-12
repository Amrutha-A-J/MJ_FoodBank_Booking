import { useState, useEffect, useRef } from 'react';
import {
  TableContainer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import Page from '../../components/Page';
import {
  getWarehouseOverall,
  getWarehouseOverallYears,
  exportWarehouseOverall,
  postManualWarehouseOverall,
  type WarehouseOverall,
} from '../../api/warehouseOverall';
import { getDonorAggregations, type DonorAggregation } from '../../api/donations';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import StyledTabs from '../../components/StyledTabs';
import { toDate } from '../../utils/date';
import { exportTableToExcel } from '../../utils/exportTableToExcel';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import { useTranslation } from 'react-i18next';

export default function Aggregations() {
  const [overallRows, setOverallRows] = useState<WarehouseOverall[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const currentYear = toDate().getFullYear();
  const fallbackYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [years, setYears] = useState<number[]>(fallbackYears);
  const [overallYear, setOverallYear] = useState(fallbackYears[0]);
  const [donorYear, setDonorYear] = useState(fallbackYears[0]);
  const [tab, setTab] = useState(0);
  const [donorRows, setDonorRows] = useState<DonorAggregation[]>([]);
  const [donorLoading, setDonorLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [donorExportLoading, setDonorExportLoading] = useState(false);
  const donorTableRef = useRef<HTMLTableElement>(null);
  const [insertOpen, setInsertOpen] = useState(false);
  const [insertMonth, setInsertMonth] = useState('');
  const [insertDonations, setInsertDonations] = useState('');
  const [insertSurplus, setInsertSurplus] = useState('');
  const [insertPigPound, setInsertPigPound] = useState('');
  const [insertOutgoing, setInsertOutgoing] = useState('');
  const [insertLoading, setInsertLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    async function loadYears() {
      try {
        const ys = await getWarehouseOverallYears();
        if (ys.length) {
          setYears(ys);
          setOverallYear(ys[0]);
          setDonorYear(ys[0]);
        } else {
          setYears(fallbackYears);
          setOverallYear(fallbackYears[0]);
          setDonorYear(fallbackYears[0]);
        }
      } catch {
        setYears(fallbackYears);
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
    if (tab !== 0) return;
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

  const donorContent = (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="donor-year-label">Year</InputLabel>
          <Select
            labelId="donor-year-label"
            label="Year"
            value={donorYear}
            onChange={e => setDonorYear(Number(e.target.value))}
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
          onClick={handleExportDonors}
          disabled={donorExportLoading}
        >
          {donorExportLoading ? <CircularProgress size={20} /> : 'Export'}
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
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
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

          variant="contained"
          onClick={handleExportOverall}
          disabled={exportLoading}
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
            setInsertOutgoing('');
            setInsertOpen(true);
          }}
        >
          {t('insert_aggregate')}
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

  const tabs = [
    { label: 'Donor Aggregations', content: donorContent },
    { label: 'Yearly Overall Aggregations', content: overallContent },
  ];

    return (
      <Page title="Warehouse Aggregations">
        <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} />
        <Dialog open={insertOpen} onClose={() => setInsertOpen(false)}>
          <DialogTitle>{t('insert_aggregate')}</DialogTitle>
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
                label="Donations"
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
        </Dialog>
        <FeedbackSnackbar
          open={snackbar.open}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
          severity={snackbar.severity}
        />
      </Page>
    );
  }
