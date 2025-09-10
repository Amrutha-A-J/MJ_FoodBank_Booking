import { useState, useEffect } from 'react';
import {
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import WarehouseQuickLinks from '../../components/WarehouseQuickLinks';
import {
  getWarehouseOverallYears,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
} from '../../api/warehouseOverall';
import { exportDonorAggregations } from '../../api/donations';

export default function Exports() {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | ''>('');
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
        setYears(ys);
        if (ys.length) {
          setYear(ys[0]);
        }
      } catch {
        setYears([]);
      }
    }
    loadYears();
  }, []);

  const handleDonorExport = async () => {
    if (!year) return;
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
    if (!year) return;
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
    <>
      <WarehouseQuickLinks />
      <Page title="Exports">
      <Stack spacing={2} sx={{ mb: 2 }} direction="row">
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="year-label">Year</InputLabel>
          <Select
            labelId="year-label"
            label="Year"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            disabled={!years.length}
          >
            {years.length ? (
              years.map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                No years available
              </MenuItem>
            )}
          </Select>
        </FormControl>
      </Stack>
      {!years.length && (
        <Typography sx={{ mb: 2 }}>No years available</Typography>
      )}
      <Stack spacing={2} direction="column" alignItems="flex-start">
        <Button

          variant="contained"
          onClick={handleDonorExport}
          disabled={donorLoading || !year}
        >
          {donorLoading ? <CircularProgress size={20} /> : 'Export Donor Aggregations'}
        </Button>
        <Button

          variant="contained"
          onClick={handleOverallExport}
          disabled={overallLoading || !year}
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
    </>
  );
}
