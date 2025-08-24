import { useState, useEffect } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import Page from '../components/Page';
import {
  getWarehouseOverall,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
  type WarehouseOverall,
} from '../api/warehouseOverall';
import { getDonorAggregations, type DonorAggregation } from '../api/donations';
import FeedbackSnackbar from '../components/FeedbackSnackbar';

export default function Aggregations() {
  const [overallRows, setOverallRows] = useState<WarehouseOverall[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const currentYear = new Date().getFullYear();
  const [overallYear, setOverallYear] = useState(currentYear);
  const [donorYear, setDonorYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [tab, setTab] = useState(0);
  const [donorRows, setDonorRows] = useState<DonorAggregation[]>([]);
  const [donorLoading, setDonorLoading] = useState(false);

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

  const handleExportOverall = () => {
    setExporting(true);
    exportWarehouseOverall(overallYear)
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `warehouse-overall-${overallYear}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSnackbar({ open: true, message: 'Export ready', severity: 'success' });
      })
      .catch(() => {
        setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
      })
      .finally(() => setExporting(false));
  };

  return (
    <Page title="Aggregations">
      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="Donor Aggregations" />
        <Tab label="Yearly Overall Aggregations" />
      </Tabs>
      {tab === 0 ? (
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
          </Stack>
          <TableContainer sx={{ overflow: 'auto', maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 3,
                      backgroundColor: 'background.paper',
                    }}
                  >
                    Donor
                  </TableCell>
                  {monthNames.map((name, idx) => (
                    <TableCell
                      key={idx}
                      align="right"
                      sx={{
                        top: 0,
                        zIndex: 2,
                        backgroundColor: 'background.paper',
                      }}
                    >
                      {name}
                    </TableCell>
                  ))}
                  <TableCell
                    align="right"
                    sx={{
                      position: 'sticky',
                      right: 0,
                      top: 0,
                      zIndex: 3,
                      backgroundColor: 'background.paper',
                    }}
                  >
                    Total
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {donorLoading ? (
                  <TableRow>
                    <TableCell colSpan={monthNames.length + 2} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const monthTotals = Array(12).fill(0);
                    donorRows.forEach(d =>
                      d.monthlyTotals.forEach((v, i) => {
                        monthTotals[i] += v;
                      }),
                    );
                    return (
                      <>
                        {donorRows.map(d => {
                          const hasDonation = d.total > 0;
                          return (
                            <TableRow key={d.donor}>
                              <TableCell
                                sx={{
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 2,
                                  backgroundColor: 'background.paper',
                                  fontWeight: hasDonation ? 'bold' : undefined,
                                }}
                              >
                                {d.donor}
                              </TableCell>
                              {d.monthlyTotals.map((value, idx) => (
                                <TableCell
                                  key={idx}
                                  align="right"
                                  sx={{
                                    fontWeight: value > 0 ? 'bold' : undefined,
                                  }}
                                >
                                  {value}
                                </TableCell>
                              ))}
                              <TableCell
                                align="right"
                                sx={{
                                  position: 'sticky',
                                  right: 0,
                                  zIndex: 2,
                                  backgroundColor: 'background.paper',
                                  fontWeight: hasDonation ? 'bold' : undefined,
                                }}
                              >
                                {d.total}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              left: 0,
                              bottom: 0,
                              zIndex: 3,
                              backgroundColor: 'background.paper',
                              fontWeight: 'bold',
                            }}
                          >
                            Total
                          </TableCell>
                          {monthTotals.map((total, idx) => (
                            <TableCell
                              key={idx}
                              align="right"
                              sx={{
                                bottom: 0,
                                position: 'sticky',
                                backgroundColor: 'background.paper',
                                fontWeight: 'bold',
                              }}
                            >
                              {total}
                            </TableCell>
                          ))}
                          <TableCell
                            align="right"
                            sx={{
                              position: 'sticky',
                              right: 0,
                              bottom: 0,
                              zIndex: 3,
                              backgroundColor: 'background.paper',
                              fontWeight: 'bold',
                            }}
                          >
                            {monthTotals.reduce((a, b) => a + b, 0)}
                          </TableCell>
                        </TableRow>
                      </>
                    );
                  })()
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
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
            <Button
              size="small"
              variant="contained"
              onClick={handleExportOverall}
              disabled={exporting}
            >
              {exporting ? <CircularProgress size={20} /> : 'Export'}
            </Button>
          </Stack>
          <TableContainer sx={{ overflowX: 'auto' }}>
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
          </TableContainer>
        </>
      )}
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Page>
  );
}
