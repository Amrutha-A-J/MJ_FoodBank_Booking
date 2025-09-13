import { useEffect, useState } from 'react';
import { Box, FormControlLabel, Switch, TextField, Button } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import Page from '../../components/Page';
import ErrorBoundary from '../../components/ErrorBoundary';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  getMaintenanceSettings,
  updateMaintenanceSettings,
  clearMaintenanceStats,
  type MaintenanceSettings,
} from '../../api/maintenance';

export default function Maintenance() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [upcomingNotice, setUpcomingNotice] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getMaintenanceSettings();
        setMaintenanceMode(data.maintenanceMode);
        setUpcomingNotice(data.upcomingNotice ?? '');
      } catch (err: any) {
        setError(err.message || String(err));
      }
    })();
  }, []);

  async function handleSave() {
    try {
      const settings: MaintenanceSettings = {
        maintenanceMode,
        upcomingNotice,
      };
      await updateMaintenanceSettings(settings);
      setMessage('Settings saved');
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  async function handleClearStats() {
    try {
      await clearMaintenanceStats();
      setMessage('Maintenance stats cleared');
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  return (
    <ErrorBoundary>
      <Page title="Maintenance">
        <Box p={2}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={maintenanceMode}
                    onChange={e => setMaintenanceMode(e.target.checked)}
                    name="maintenanceMode"
                  />
                }
                label="Maintenance Mode"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Upcoming Notice"
                value={upcomingNotice}
                onChange={e => setUpcomingNotice(e.target.value)}
                fullWidth
                size="medium"
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSave} sx={{ mr: 2 }}>
                Save
              </Button>
              <Button variant="outlined" color="error" onClick={handleClearStats}>
                Clear Maintenance Stats
              </Button>
            </Grid>
          </Grid>
          <FeedbackSnackbar
            open={!!error || !!message}
            onClose={() => {
              setError('');
              setMessage('');
            }}
            message={error || message}
            severity={error ? 'error' : 'success'}
          />
        </Box>
      </Page>
    </ErrorBoundary>
  );
}
