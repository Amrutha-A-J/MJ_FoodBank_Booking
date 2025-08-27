import { useState, useEffect } from 'react';
import {
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
} from '@mui/material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  getWarehouseOverallYears,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
} from '../../api/warehouseOverall';
import { exportDonorAggregations } from '../../api/donations';

export default function Exports() {
  const currentYear = new Date().getFullYear();
  const fallbackYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [years, setYears] = useState<number[]>(fallbackYears);
  const [year, setYear] = useState(fallbackYears[0]);
  const [donorLoading, setDonorLoading] = useState(false);
  const [overallLoading, setOverallLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    async function loadYears() {
      try {
        const ys = await getWarehouseOverallYears();
        if (ys.length) {
          setYears(ys);
          setYear(ys[0]);
        }
      } catch {
        // ignore, fallback already set
      }
    }
    loadYears();
  }, []);

  const handleDonorExport = async () => {
    setDonorLoading(true);
    try {
      const blob = await exportDonorAggregations(year);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${year}_donor_aggregations.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Export ready', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setDonorLoading(false);
    }
  };

  const handleOverallExport = async () => {
    setOverallLoading(true);
    try {
      await rebuildWarehouseOverall(year);
      const blob = await exportWarehouseOverall(year);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${year}_warehouse_overall_stats.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Export ready', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    } finally {
      setOverallLoading(false);
    }
  };

  return (
    <Page title="Exports">
      <Stack spacing={2} sx={{ mb: 2 }} direction="row">
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
      </Stack>
      <Stack spacing={2} direction="column" alignItems="flex-start">
        <Button
          size="small"
          variant="contained"
          onClick={handleDonorExport}
          disabled={donorLoading}
        >
          {donorLoading ? <CircularProgress size={20} /> : 'Export Donor Aggregations'}
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleOverallExport}
          disabled={overallLoading}
        >
          {overallLoading ? <CircularProgress size={20} /> : 'Export Warehouse Overall Stats'}
        </Button>
      </Stack>
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Page>
  );
}
