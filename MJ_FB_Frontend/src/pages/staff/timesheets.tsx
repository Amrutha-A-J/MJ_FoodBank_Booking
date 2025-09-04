import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
  Button,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Page from '../../components/Page';
import { useTranslation } from 'react-i18next';
import { formatLocaleDate } from '../../utils/date';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
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

export default function Timesheets() {
  const { t } = useTranslation();
  const inAdmin = useMatch('/admin/*') !== null;
  const [staffInput, setStaffInput] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staff, setStaff] = useState<StaffOption | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
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
        const options = inAdmin
          ? data.map(d => ({ id: d.id, name: `${d.firstName} ${d.lastName}` }))
          : data;
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
    ? useAllTimesheets(staff?.id, year ?? undefined, month ?? undefined)
    : useTimesheets();
  const [expanded, setExpanded] = useState<number | false>(false);

  useEffect(() => {
    if (!timesheets.length) return;
    const ts = timesheets.find(p => !p.approved_at) ?? timesheets[0];
    setExpanded(ts.id);
  }, [timesheets]);

  const current = timesheets.find(p => p.id === expanded);
  const { days: rawDays, error: daysError } = useTimesheetDays(current?.id);
  const [days, setDays] = useState<Day[]>([]);
  useEffect(() => {
    if (!rawDays.length) return;
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

    return (
      <Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('timesheets.date')}</TableCell>
              <TableCell>{t('timesheets.reg')}</TableCell>
              <TableCell>{t('timesheets.ot')}</TableCell>
              <TableCell>{t('timesheets.stat')}</TableCell>
              <TableCell>{t('timesheets.sick')}</TableCell>
              <TableCell>{t('timesheets.vac')}</TableCell>
              <TableCell>{t('timesheets.note')}</TableCell>
              <TableCell>{t('timesheets.paid_total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {days.map((d, i) => {
              const paid = d.reg + d.ot + d.stat + d.sick + d.vac;
              const over = paid > 8;
              const disabled = inputsDisabled || d.lockedLeave;
              return (
                <TableRow key={d.date}>
                  <TableCell>
                    {formatLocaleDate(d.date)}
                    {d.lockedLeave && (
                      <Tooltip title={t('timesheets.lock_leave_tooltip')}>
                        <LockIcon sx={{ ml: 1, fontSize: 16 }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={d.reg}
                      size="small"
                      disabled={disabled}
                      error={over}
                      onChange={e => handleChange(i, 'reg', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={d.ot}
                      size="small"
                      disabled={disabled}
                      error={over}
                      onChange={e => handleChange(i, 'ot', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={d.stat}
                      size="small"
                      disabled={disabled}
                      error={over}
                      onChange={e => handleChange(i, 'stat', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={d.sick}
                      size="small"
                      disabled={disabled}
                      error={over}
                      onChange={e => handleChange(i, 'sick', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={d.vac}
                      size="small"
                      disabled={disabled}
                      error={over}
                      onChange={e => handleChange(i, 'vac', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={d.note}
                      size="small"
                      disabled={disabled}
                      onChange={e => handleChange(i, 'note', e.target.value)}
                    />
                  </TableCell>
                  <TableCell sx={{ color: over ? 'error.main' : undefined }}>
                    {paid}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
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
  return (
    <Page title={t('timesheets.title')}>
      {inAdmin && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Autocomplete
            options={staffOptions}
            getOptionLabel={o => o.name}
            value={staff}
            onChange={(_, val) => setStaff(val)}
            onInputChange={(_, val) => setStaffInput(val)}
            renderInput={params => (
              <TextField {...params} label={t('timesheets.staff')} margin="normal" />
            )}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label={t('timesheets.year')}
            type="number"
            value={year ?? ''}
            onChange={e => setYear(e.target.value ? Number(e.target.value) : null)}
            margin="normal"
            sx={{ width: 120 }}
          />
            <TextField
            label={t('timesheets.month')}
            type="number"
            inputProps={{ min: 1, max: 12 }}
            value={month ?? ''}
            onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)}
            margin="normal"
            sx={{ width: 120 }}
          />
        </Box>
      )}
      {!inAdmin || staff ? (
        loadingSheets ? (
          <CircularProgress />
        ) : (
          timesheets.map(p => (
            <Accordion
              key={p.id}
              expanded={expanded === p.id}
              onChange={(_, isExp) => setExpanded(isExp ? p.id : false)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  {`${formatLocaleDate(p.start_date)} - ${formatLocaleDate(p.end_date)}`}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {expanded === p.id && (
                  <>
                    {renderTable()}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      {!p.submitted_at && (
                        <Button
                          variant="contained"
                          disabled={submitMutation.isPending}
                          onClick={handleSubmitTimesheet}
                        >
                          {t('timesheets.submit')}
                        </Button>
                      )}
                      {p.submitted_at && !p.approved_at && inAdmin && (
                        <>
                          <Button
                            variant="contained"
                            onClick={() => rejectMutation.mutate(p.id)}
                          >
                            {t('timesheets.reject')}
                          </Button>
                          <Button
                            variant="contained"
                            onClick={() => processMutation.mutate(p.id)}
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
        )
      ) : (
        <Typography sx={{ mt: 2 }}>{t('timesheets.select_staff')}</Typography>
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity="error"
      />
    </Page>
  );
}

