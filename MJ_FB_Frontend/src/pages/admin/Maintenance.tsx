import { useEffect, useState, type ReactNode } from 'react';
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Switch,
  TextField,
  Tabs,
  Tab,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
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
  purgeOldRecords,
  type MaintenanceSettings,
} from '../../api/maintenance';
import dayjs, { type Dayjs } from '../../utils/date';

const PURGE_TARGETS = [
  { key: 'bookings', label: 'Pantry bookings' },
  { key: 'client_visits', label: 'Pantry visits' },
  { key: 'volunteer_bookings', label: 'Volunteer bookings' },
  { key: 'donations', label: 'Food donations' },
  { key: 'monetary_donations', label: 'Monetary donations' },
  { key: 'pig_pound_log', label: 'Pig pound log' },
  { key: 'outgoing_donation_log', label: 'Outgoing donation log' },
  { key: 'surplus_log', label: 'Surplus log' },
  { key: 'sunshine_bag_log', label: 'Sunshine bag log' },
] as const;

type PurgeTableKey = (typeof PURGE_TARGETS)[number]['key'];

function getPurgeLabel(key: string) {
  const target = PURGE_TARGETS.find(item => item.key === key);
  if (target) return target.label;
  return key.replace(/_/g, ' ');
}

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
  const [selectedPurgeTables, setSelectedPurgeTables] = useState<PurgeTableKey[]>([]);
  const [purgeCutoff, setPurgeCutoff] = useState<Dayjs | null>(null);
  const [purgeTouched, setPurgeTouched] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);

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

  const januaryFirst = dayjs().startOf('year');
  const latestAllowedDate = januaryFirst.subtract(1, 'day');
  const hasValidCutoff =
    !!purgeCutoff && purgeCutoff.isValid() && purgeCutoff.isBefore(januaryFirst);
  const tablesError =
    purgeTouched && selectedPurgeTables.length === 0 ? 'Select at least one data set' : '';
  let dateError = '';
  if (purgeTouched) {
    if (!purgeCutoff) {
      dateError = 'Select a cutoff date';
    } else if (!purgeCutoff.isValid()) {
      dateError = 'Cutoff date is invalid';
    } else if (!purgeCutoff.isBefore(januaryFirst)) {
      dateError = `Pick a date before January 1, ${januaryFirst.year()}`;
    }
  }
  const isPurgeFormValid = selectedPurgeTables.length > 0 && hasValidCutoff;

  function handleTogglePurgeTable(key: PurgeTableKey) {
    setSelectedPurgeTables(prev =>
      prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key],
    );
  }

  function handleOpenPurgeConfirm() {
    setPurgeTouched(true);
    if (!isPurgeFormValid) return;
    setConfirmPurgeOpen(true);
  }

  function handleCancelPurge() {
    if (isPurging) return;
    setConfirmPurgeOpen(false);
  }

  async function handleConfirmPurge() {
    if (!isPurgeFormValid || !purgeCutoff) return;
    try {
      setIsPurging(true);
      setError('');
      setMessage('');
      const cutoff = purgeCutoff.format('YYYY-MM-DD');
      const result = await purgeOldRecords({
        tables: selectedPurgeTables,
        before: cutoff,
      });
      const tableSummaries =
        result.purged?.map(item => {
          const label = getPurgeLabel(item.table);
          if (item.months && item.months.length > 0) {
            return `${label} (${item.months.join(', ')})`;
          }
          return label;
        }) ?? [];
      const fallbackSummary = selectedPurgeTables.map(getPurgeLabel).join(', ');
      const summary = tableSummaries.length > 0 ? tableSummaries.join(', ') : fallbackSummary;
      setMessage(`Deleted records before ${result.cutoff ?? cutoff} for ${summary}.`);
      setConfirmPurgeOpen(false);
      setPurgeTouched(false);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsPurging(false);
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
              <Tab
                label="Delete Older Records"
                id="maintenance-tab-2"
                aria-controls="maintenance-tabpanel-2"
              />
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
            <TabPanel value={activeTab} index={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">Delete Older Records</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Select the data sets and a cutoff date to purge legacy rows. Aggregates refresh
                    automatically after the purge completes.
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControl component="fieldset" error={!!tablesError} variant="standard" disabled={isPurging}>
                    <FormLabel component="legend">Data sets</FormLabel>
                    <FormGroup>
                      {PURGE_TARGETS.map(target => (
                        <FormControlLabel
                          key={target.key}
                          control={
                            <Checkbox
                              checked={selectedPurgeTables.includes(target.key)}
                              onChange={() => handleTogglePurgeTable(target.key)}
                              name={`purge-${target.key}`}
                            />
                          }
                          label={target.label}
                        />
                      ))}
                    </FormGroup>
                    <FormHelperText>
                      {tablesError || 'Choose each data set you want to delete before the cutoff date.'}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Cutoff Date"
                      value={purgeCutoff}
                      onChange={value => setPurgeCutoff(value)}
                      maxDate={latestAllowedDate}
                      disableFuture
                      shouldDisableDate={date => !!date && (date.isSame(januaryFirst) || date.isAfter(januaryFirst))}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'medium',
                          helperText:
                            dateError || `Only dates before Jan 1, ${januaryFirst.year()} are allowed.`,
                          error: !!dateError,
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Purging also archives volunteer hours and refreshes pantry, warehouse, and sunshine bag
                    aggregates for affected months.
                  </Typography>
                </Grid>
                <Grid item xs={12} sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleOpenPurgeConfirm}
                    loading={isPurging}
                    disabled={isPurging}
                  >
                    Delete Older Records
                  </Button>
                  <Button onClick={() => setPurgeCutoff(null)} disabled={isPurging}>
                    Clear Cutoff
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
          <Dialog open={confirmPurgeOpen} onClose={handleCancelPurge} aria-labelledby="purge-confirm-title">
            <DialogTitle id="purge-confirm-title">Delete older records?</DialogTitle>
            <DialogContent>
              <DialogContentText>
                This will permanently delete records before{' '}
                {purgeCutoff ? purgeCutoff.format('YYYY-MM-DD') : 'the selected date'} for the selected data sets. This action
                cannot be undone.
              </DialogContentText>
              <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                {selectedPurgeTables.map(table => (
                  <Box key={table} component="li">
                    {getPurgeLabel(table)}
                  </Box>
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelPurge} disabled={isPurging}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPurge}
                variant="contained"
                color="error"
                loading={isPurging}
                disabled={isPurging}
              >
                Confirm Delete
              </Button>
            </DialogActions>
          </Dialog>
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
