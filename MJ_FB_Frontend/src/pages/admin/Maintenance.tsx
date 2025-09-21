import { useEffect, useState, type ReactNode } from 'react';
import {
  Box,
  FormControlLabel,
  Switch,
  TextField,
  Tabs,
  Tab,
  Typography,
  Paper,
  Button,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import Page from '../../components/Page';
import ErrorBoundary from '../../components/ErrorBoundary';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  getMaintenanceSettings,
  updateMaintenanceSettings,
  clearMaintenanceStats,
  vacuumDatabase,
  vacuumTable,
  getVacuumDeadRows,
  type MaintenanceSettings,
} from '../../api/maintenance';

export default function Maintenance() {
  const [activeTab, setActiveTab] = useState(0);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [upcomingNotice, setUpcomingNotice] = useState('');
  const [vacuumTableName, setVacuumTableName] = useState('');
  const [deadRowsTable, setDeadRowsTable] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingStats, setIsClearingStats] = useState(false);
  const [isVacuumingDatabase, setIsVacuumingDatabase] = useState(false);
  const [isVacuumingTable, setIsVacuumingTable] = useState(false);
  const [isCheckingDeadRows, setIsCheckingDeadRows] = useState(false);

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
      setError('');
      setMessage('');
      setIsSaving(true);
      const settings: MaintenanceSettings = {
        maintenanceMode,
        upcomingNotice,
      };
      await updateMaintenanceSettings(settings);
      setMessage('Settings saved');
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClearStats() {
    try {
      setError('');
      setMessage('');
      setIsClearingStats(true);
      await clearMaintenanceStats();
      setMessage('Maintenance stats cleared');
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsClearingStats(false);
    }
  }

  async function handleVacuumDatabase() {
    try {
      setError('');
      setMessage('');
      setIsVacuumingDatabase(true);
      const result = await vacuumDatabase();
      setMessage(result.message || 'Vacuum started');
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsVacuumingDatabase(false);
    }
  }

  async function handleVacuumTable() {
    const table = vacuumTableName.trim();
    if (!table) return;
    try {
      setError('');
      setMessage('');
      setIsVacuumingTable(true);
      const result = await vacuumTable(table);
      setMessage(result.message || `Vacuum started for ${table}`);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsVacuumingTable(false);
    }
  }

  async function handleDeadRowsLookup() {
    try {
      setError('');
      setMessage('');
      setIsCheckingDeadRows(true);
      const table = deadRowsTable.trim() || undefined;
      const result = await getVacuumDeadRows(table);
      if (result.message) {
        setMessage(result.message);
        return;
      }
      if (result.tables && result.tables.length > 0) {
        const summary = result.tables
          .map(item => `${item.table}: ${item.deadRows.toLocaleString()} dead rows`)
          .join(', ');
        setMessage(summary);
      } else {
        setMessage('No dead rows reported.');
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsCheckingDeadRows(false);
    }
  }

  return (
    <ErrorBoundary>
      <Page title="Maintenance">
        <Box p={2}>
          <Paper elevation={1}>
            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Maintenance tabs"
            >
              <Tab label="Maintenance Mode" id="maintenance-tab-0" aria-controls="maintenance-tabpanel-0" />
              <Tab label="Vacuum" id="maintenance-tab-1" aria-controls="maintenance-tabpanel-1" />
            </Tabs>
            <TabPanel value={activeTab} index={0}>
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
                <Grid item xs={12} sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    loading={isSaving}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleClearStats}
                    loading={isClearingStats}
                  >
                    Clear Maintenance Stats
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">Full Database Vacuum</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Run a maintenance vacuum across the entire database during a low-traffic window.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleVacuumDatabase}
                    loading={isVacuumingDatabase}
                  >
                    Vacuum Database
                  </Button>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6">Vacuum Specific Table</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Target a single table when you notice bloat building up.
                  </Typography>
                  <TextField
                    label="Table Name"
                    value={vacuumTableName}
                    onChange={e => setVacuumTableName(e.target.value)}
                    fullWidth
                    size="medium"
                  />
                  <Box mt={1}>
                    <Button
                      variant="outlined"
                      onClick={handleVacuumTable}
                      loading={isVacuumingTable}
                      disabled={!vacuumTableName.trim()}
                    >
                      Vacuum Table
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6">Dead Rows Lookup</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Check recent dead row counts to decide whether a manual vacuum is required.
                  </Typography>
                  <TextField
                    label="Table Filter (optional)"
                    value={deadRowsTable}
                    onChange={e => setDeadRowsTable(e.target.value)}
                    fullWidth
                    size="medium"
                  />
                  <Box mt={1}>
                    <Button
                      variant="outlined"
                      onClick={handleDeadRowsLookup}
                      loading={isCheckingDeadRows}
                    >
                      Check Dead Rows
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
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

interface TabPanelProps {
  value: number;
  index: number;
  children: ReactNode;
}

function TabPanel({ value, index, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`maintenance-tabpanel-${index}`}
      aria-labelledby={`maintenance-tab-${index}`}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}
