import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Table,
  TableRow,
  TableCell,
  TableFooter,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
  Button,
  Autocomplete,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import Page from '../../components/Page';
import StyledTabs, { type TabItem } from '../../components/StyledTabs';
import { useTranslation } from 'react-i18next';
import { formatLocaleDate } from '../../utils/date';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import type { ApiError } from '../../api/client';
import {
  useTimesheets,
  useAllTimesheets,
  useTimesheetDays,
  updateTimesheetDay,
  useSubmitTimesheet,
  useRejectTimesheet,
  useProcessTimesheet,
} from '../../api/timesheets';
import { useMatch } from 'react-router-dom';
import {
  searchStaff as searchStaffApi,
  type StaffOption,
} from '../../api/staff';
import { searchStaff as searchAdminStaff } from '../../api/adminStaff';
import type { Staff } from '../../types';
import ErrorBoundary from '../../components/ErrorBoundary';

interface Day {
  date: string;
  reg: number;
  ot: number;
  stat: number;
  sick: number;
  vac: number;
  note: string;
  expected: number;
  lockedLeave: boolean;
}

interface DayRow extends Day {
  index: number;
  paid: number;
}

export default function Timesheets() {
  const { t } = useTranslation();
  const inAdmin = useMatch('/admin/timesheet') !== null;
  const [staffInput, setStaffInput] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staff, setStaff] = useState<StaffOption | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  useEffect(() => {
    let active = true;
    if (staffInput.length < 3) {
      setStaffOptions([]);
      return () => {
        active = false;
      };
    }
    const search = inAdmin ? searchAdminStaff : searchStaffApi;
    search(staffInput)
      .then(data => {
        if (!active) return;
        const options: StaffOption[] = inAdmin
          ? (data as Staff[]).map(d => ({
              id: d.id,
              name: `${(d as Staff).firstName} ${(d as Staff).lastName}`,
            }))
          : (data as StaffOption[]);
        setStaffOptions(options);
      })
      .catch(() => {
        if (active) setStaffOptions([]);
      });
    return () => {
      active = false;
    };
  }, [staffInput, inAdmin]);
  const { timesheets, isLoading: loadingSheets, error: sheetsError } = inAdmin
    ? useAllTimesheets(staff?.id, year, month)
    : useTimesheets();

  const visibleTimesheets = useMemo(() => {
    if (inAdmin) return timesheets;
    const idx = timesheets.findIndex(p => !p.approved_at);
    const currentIdx = idx === -1 ? timesheets.length - 1 : idx;
    const start = Math.max(0, currentIdx - 5);
    const end = Math.min(timesheets.length, currentIdx + 5);
    return timesheets.slice(start, end);
  }, [timesheets, inAdmin]);

  const [tab, setTab] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!visibleTimesheets.length || inAdmin) return;
    const idx = visibleTimesheets.findIndex(p => !p.approved_at);
    setTab(idx === -1 ? visibleTimesheets.length - 1 : idx);
  }, [visibleTimesheets, inAdmin]);

  useEffect(() => {
    setExpanded(null);
  }, [staff, year, month]);

  const current = inAdmin
    ? timesheets.find(p => p.id === expanded)
    : visibleTimesheets[tab];
  const { days: rawDays, error: daysError } = useTimesheetDays(current?.id);
  const [days, setDays] = useState<Day[]>([]);
  useEffect(() => {
    if (!rawDays.length) {
      setDays([]);
      return;
    }
    setDays(
      rawDays.map(d => ({
        date: d.work_date,
        reg: d.reg_hours,
        ot: d.ot_hours,
        stat: d.stat_hours,
        sick: d.sick_hours,
        vac: d.vac_hours,
        note: d.note ?? '',
        expected: d.expected_hours,
        lockedLeave: d.locked_by_leave,
      })),
    );
  }, [rawDays]);

  const submitMutation = useSubmitTimesheet();
  const rejectMutation = useRejectTimesheet();
  const processMutation = useProcessTimesheet();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const err = sheetsError || daysError;
    if (err) setMessage((err as ApiError).message || 'Error');
  }, [sheetsError, daysError]);

  function renderTable() {
    if (!current) return null;
    const inputsDisabled = !!current.submitted_at || !!current.approved_at;

    const handleChange = (index: number, field: keyof Day, value: string) => {
      setDays(prev => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          [field]: field === 'note' ? value : Number(value),
        };
        return copy;
      });
    };

    const totals = days.reduce(
      (acc, d) => {
        const paid = d.reg + d.ot + d.stat + d.sick + d.vac;
        acc.reg += d.reg;
        acc.ot += d.ot;
        acc.stat += d.stat;
        acc.sick += d.sick;
        acc.vac += d.vac;
        acc.paid += paid;
        acc.expected += d.expected;
        return acc;
      },
      { reg: 0, ot: 0, stat: 0, sick: 0, vac: 0, paid: 0, expected: 0 },
    );
    const shortfall = totals.expected - totals.paid;
    const otBankRemaining = 40 - totals.ot;
    const rows: DayRow[] = days.map((d, index) => ({
      ...d,
      index,
      paid: d.reg + d.ot + d.stat + d.sick + d.vac,
    }));

    const columns: Column<DayRow>[] = [
      {
        field: 'date',
        header: t('timesheets.date'),
        render: (row: DayRow) => (
          <>
            {formatLocaleDate(row.date)}
            {row.lockedLeave && (
              <Tooltip title={t('timesheets.lock_leave_tooltip')}>
                <LockIcon sx={{ ml: 1, fontSize: 16 }} />
              </Tooltip>
            )}
          </>
        ),
      },
      {
        field: 'reg',
        header: t('timesheets.reg'),
        render: (row: DayRow) => (
          <TextField
            type="number"
            value={row.reg}
            
            disabled={inputsDisabled || row.lockedLeave}
            error={row.paid > 8}
            onChange={e => handleChange(row.index, 'reg', e.target.value)}
            fullWidth
            sx={{ width: { xs: '100%', sm: 80 } }}
          />
        ),
      },
      {
        field: 'ot',
        header: t('timesheets.ot'),
        render: (row: DayRow) => (
          <TextField
            type="number"
            value={row.ot}
            
            disabled={inputsDisabled || row.lockedLeave}
            error={row.paid > 8}
            onChange={e => handleChange(row.index, 'ot', e.target.value)}
            fullWidth
            sx={{ width: { xs: '100%', sm: 80 } }}
          />
        ),
      },
      {
        field: 'stat',
        header: t('timesheets.stat'),
        render: (row: DayRow) => (
          <TextField
            type="number"
            value={row.stat}
            
            disabled={inputsDisabled || row.lockedLeave}
            error={row.paid > 8}
            onChange={e => handleChange(row.index, 'stat', e.target.value)}
            fullWidth
            sx={{ width: { xs: '100%', sm: 80 } }}
          />
        ),
      },
      {
        field: 'sick',
        header: t('timesheets.sick'),
        render: (row: DayRow) => (
          <TextField
            type="number"
            value={row.sick}
            
            disabled={inputsDisabled || row.lockedLeave}
            error={row.paid > 8}
            onChange={e => handleChange(row.index, 'sick', e.target.value)}
            fullWidth
            sx={{ width: { xs: '100%', sm: 80 } }}
          />
        ),
      },
      {
        field: 'vac',
        header: t('timesheets.vac'),
        render: (row: DayRow) => (
          <TextField
            type="number"
            value={row.vac}
            
            disabled={inputsDisabled || row.lockedLeave}
            error={row.paid > 8}
            onChange={e => handleChange(row.index, 'vac', e.target.value)}
            fullWidth
            sx={{ width: { xs: '100%', sm: 80 } }}
          />
        ),
      },
      {
        field: 'note',
        header: t('timesheets.note'),
        render: (row: DayRow) => (
          <TextField
            value={row.note}
            
            disabled={inputsDisabled || row.lockedLeave}
            onChange={e => handleChange(row.index, 'note', e.target.value)}
            fullWidth
            sx={{ width: { xs: '100%', sm: 200 } }}
          />
        ),
      },
      {
        field: 'paid',
        header: t('timesheets.paid_total'),
        render: (row: DayRow) => (
          <Typography sx={{ color: row.paid > 8 ? 'error.main' : undefined }}>
            {row.paid}
          </Typography>
        ),
      },
    ];

    return (
      <Box>
        <ResponsiveTable columns={columns} rows={rows} getRowKey={r => r.date} />
        <Table size="small" >
          <TableFooter>
            <TableRow>
              <TableCell>{t('timesheets.summary.totals')}</TableCell>
              <TableCell>{totals.reg}</TableCell>
              <TableCell>{totals.ot}</TableCell>
              <TableCell>{totals.stat}</TableCell>
              <TableCell>{totals.sick}</TableCell>
              <TableCell>{totals.vac}</TableCell>
              <TableCell />
              <TableCell>{totals.paid}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={8}>
                <Typography variant="body2">
                  {t('timesheets.summary.expected')}: {totals.expected} •{' '}
                  {t('timesheets.summary.shortfall')}: {shortfall} •{' '}
                  {t('timesheets.summary.ot_bank_remaining')}: {otBankRemaining}
                </Typography>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Box>
    );
  }

  const handleSubmitTimesheet = async () => {
    if (!current) return;
    try {
      await Promise.all(
        days.map(d =>
          updateTimesheetDay(current.id, d.date, {
            regHours: d.reg,
            otHours: d.ot,
            statHours: d.stat,
            sickHours: d.sick,
            vacHours: d.vac,
            note: d.note,
          }),
        ),
      );
      await submitMutation.mutateAsync(current.id);
    } catch (e) {
      setMessage((e as ApiError).message || 'Failed to submit timesheet');
    }
  };

  const tabs: TabItem[] = !inAdmin
    ? visibleTimesheets.map(p => ({
        label: `${formatLocaleDate(p.start_date)} - ${formatLocaleDate(p.end_date)}`,
        content: p.id === current?.id ? renderTable() : null,
      }))
    : [];

  return (
    <ErrorBoundary>
      <Page title={t('timesheets.title')}>
      {inAdmin && (
        <>
          <Autocomplete
            options={staffOptions}
            getOptionLabel={o => o.name}
            value={staff}
            onChange={(_, val) => setStaff(val)}
            onInputChange={(_, val) => setStaffInput(val)}
            renderInput={params => (
              <TextField {...params} label={t('timesheets.staff')} margin="normal" />
            )}
            sx={{ mb: 2, maxWidth: 400 }}
          />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label={t('timesheets.year')}
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              sx={{ maxWidth: 120 }}
            />
            <TextField
              select
              label={t('timesheets.month')}
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              sx={{ maxWidth: 160 }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString(undefined, { month: 'long' })}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </>
      )}
      {!inAdmin || staff ? (
        loadingSheets ? (
          <CircularProgress />
        ) : inAdmin ? (
          timesheets.map(p => (
            <Accordion
              key={p.id}
              expanded={expanded === p.id}
              onChange={(_, isExpanded) =>
                setExpanded(isExpanded ? p.id : null)
              }
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {`${formatLocaleDate(p.start_date)} - ${formatLocaleDate(p.end_date)}`}
              </AccordionSummary>
              <AccordionDetails>
                {expanded === p.id && (
                  <>
                    {renderTable()}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      {!current?.submitted_at && (
                        <Button
                          variant="contained"
                          disabled={submitMutation.isPending}
                          onClick={handleSubmitTimesheet}
                        >
                          {t('timesheets.submit')}
                        </Button>
                      )}
                      {current?.submitted_at && !current?.approved_at && (
                        <>
                          <Button
                            variant="contained"
                            onClick={() => rejectMutation.mutate(current.id)}
                          >
                            {t('timesheets.reject')}
                          </Button>
                          <Button
                            variant="contained"
                            onClick={() => processMutation.mutate(current.id)}
                          >
                            {t('timesheets.process')}
                          </Button>
                        </>
                      )}
                    </Box>
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
        )
      ) : (
        <Typography sx={{ mt: 2 }}>{t('timesheets.select_staff')}</Typography>
      )}
      {current && !inAdmin && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          {!current.submitted_at && (
            <Button
              variant="contained"
              disabled={submitMutation.isPending}
              onClick={handleSubmitTimesheet}
            >
              {t('timesheets.submit')}
            </Button>
          )}
        </Box>
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity="error"
      />
      </Page>
    </ErrorBoundary>
  );
}

