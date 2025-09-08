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
} from '@mui/material';
import Page from '../../components/Page';
import {
  getWarehouseOverall,
  getWarehouseOverallYears,
  exportWarehouseOverall,
  type WarehouseOverall,
} from '../../api/warehouseOverall';
import { getDonorAggregations, type DonorAggregation } from '../../api/donations';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import WarehouseQuickLinks from '../../components/WarehouseQuickLinks';
import StyledTabs from '../../components/StyledTabs';
import { toDate } from '../../utils/date';
import { exportTableToExcel } from '../../utils/exportTableToExcel';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';

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

  useEffect(() => {
    setOverallLoading(true);
    setOverallRows([]);
    getWarehouseOverall(overallYear)
      .then(setOverallRows)
      .catch(() => setOverallRows([]))
      .finally(() => setOverallLoading(false));
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
        <FormControl size="small" sx={{ minWidth: 120 }}>
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
          size="small"
          variant="contained"
          onClick={handleExportDonors}
          disabled={donorExportLoading}
        >
          {donorExportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
      </Stack>
      <TableContainer sx={{ overflow: 'auto', maxHeight: 400 }}>
        {(() => {
          const donorRowsData = donorRows.map(d => {
            const row: any = { donor: d.donor, total: d.total };
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
          const totalsRow: any = { donor: 'Total', total: monthTotals.reduce((a, b) => a + b, 0) };
          monthNames.forEach((_, idx) => {
            totalsRow[`m${idx}`] = monthTotals[idx];
          });

          type DonorRow = typeof donorRowsData[number];

          const columns: Column<DonorRow>[] = [
            { field: 'donor', header: 'Donor' },
            ...monthNames.map((name, idx) => ({
              field: `m${idx}` as keyof DonorRow & string,
              header: name,
              render: (r: any) => r[`m${idx}`],
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
          onClick={handleExportOverall}
          disabled={exportLoading}
        >
          {exportLoading ? <CircularProgress size={20} /> : 'Export'}
        </Button>
      </Stack>
      <TableContainer sx={{ overflowX: 'auto' }}>
        {overallLoading ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          (() => {
            const columns: Column<WarehouseOverall & { monthName: string }>[] = [
              { field: 'monthName', header: 'Month' },
              { field: 'donations', header: 'Donations' },
              { field: 'surplus', header: 'Surplus' },
              { field: 'pigPound', header: 'Pig Pound' },
              { field: 'outgoingDonations', header: 'Outgoing Donations' },
            ];

            const rows = overallData.map(r => ({
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
            } as any);

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
    <Page title="Aggregations" header={<WarehouseQuickLinks />}>
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} />
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Page>
  );
}
