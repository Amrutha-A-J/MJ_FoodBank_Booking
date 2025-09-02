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
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Page from '../../components/Page';
import StyledTabs, { type TabItem } from '../../components/StyledTabs';
import { useTranslation } from 'react-i18next';
import { formatLocaleDate } from '../../utils/date';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import type { ApiError } from '../../api/client';
import {
  useTimesheets,
  useTimesheetDays,
  useUpdateTimesheetDay,
  useSubmitTimesheet,
  useRejectTimesheet,
  useProcessTimesheet,
} from '../../api/timesheets';
import {
  useCreateLeaveRequest,
  useLeaveRequests,
  useApproveLeaveRequest,
} from '../../api/leaveRequests';

interface Day {
  date: string;
  reg: number;
  ot: number;
  stat: number;
  sick: number;
  vac: number;
  note: string;
  expected: number;
  lockedRule: boolean;
  lockedLeave: boolean;
}

export default function Timesheets() {
  const { t } = useTranslation();
  const { timesheets, isLoading: loadingSheets, error: sheetsError } =
    useTimesheets();
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!timesheets.length) return;
    const idx = timesheets.findIndex(p => !p.approved_at);
    setTab(idx === -1 ? timesheets.length - 1 : idx);
  }, [timesheets.length]);

  const current = timesheets[tab];
  const { days: rawDays, error: daysError } = useTimesheetDays(current?.id);
  const [days, setDays] = useState<Day[]>([]);
  useEffect(() => {
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
        lockedRule: d.locked_by_rule,
        lockedLeave: d.locked_by_leave,
      })),
    );
  }, [rawDays]);

  const updateMutation = useUpdateTimesheetDay(current?.id ?? 0);
  const submitMutation = useSubmitTimesheet();
  const rejectMutation = useRejectTimesheet();
  const processMutation = useProcessTimesheet();
  const leaveMutation = useCreateLeaveRequest(current?.id ?? 0);
  const { requests } = useLeaveRequests(current?.id);
  const approveLeaveMutation = useApproveLeaveRequest();
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

    const handleBlur = (index: number) => {
      const d = days[index];
      if (!current) return;
      updateMutation.mutate(
        {
          date: d.date,
          regHours: d.reg,
          otHours: d.ot,
          statHours: d.stat,
          sickHours: d.sick,
          vacHours: d.vac,
          note: d.note,
        },
        {
          onError: e =>
            setMessage((e as ApiError).message || 'Failed to update day'),
        },
      );
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
              const disabled =
                inputsDisabled || d.lockedRule || d.lockedLeave;
              return (
                <TableRow key={d.date}>
                  <TableCell>
                    {formatLocaleDate(d.date)}
                    {(d.lockedRule || d.lockedLeave) && (
                      <Tooltip
                        title={
                          d.lockedRule
                            ? t('timesheets.lock_stat_tooltip')
                            : t('timesheets.lock_leave_tooltip')
                        }
                      >
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
                      onBlur={() => handleBlur(i)}
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
                      onBlur={() => handleBlur(i)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={d.stat}
                      size="small"
                      disabled
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
                      onBlur={() => handleBlur(i)}
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
                      onBlur={() => handleBlur(i)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={d.note}
                      size="small"
                      disabled={disabled}
                      onChange={e => handleChange(i, 'note', e.target.value)}
                      onBlur={() => handleBlur(i)}
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

  const tabs: TabItem[] = timesheets.map(p => ({
    label: `${formatLocaleDate(p.start_date)} - ${formatLocaleDate(p.end_date)}`,
    content: p.id === current?.id ? renderTable() : null,
  }));

  return (
    <Page title={t('timesheets.title')}>
      {loadingSheets ? (
        <CircularProgress />
      ) : (
        <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
      )}
      {current && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          {!current.submitted_at && (
            <Button
              variant="contained"
              onClick={() => submitMutation.mutate(current.id)}
            >
              {t('timesheets.submit')}
            </Button>
          )}
          {current.submitted_at && !current.approved_at && (
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
      )}
      {current && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">
            {t('timesheets.request_leave')}
          </Typography>
          <Box
            component="form"
            sx={{ display: 'flex', gap: 1, mt: 1 }}
            onSubmit={e => {
              e.preventDefault();
              const form = e.currentTarget as typeof e.currentTarget & {
                date: { value: string };
                hours: { value: string };
              };
              leaveMutation.mutate({
                date: form.date.value,
                hours: Number(form.hours.value),
              });
              form.reset();
            }}
          >
            <TextField
              name="date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              name="hours"
              type="number"
              size="small"
              defaultValue={8}
            />
            <Button type="submit" variant="contained">
              {t('timesheets.submit')}
            </Button>
          </Box>
          {requests.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">
                {t('timesheets.review_leave')}
              </Typography>
              {requests.map(r => (
                <Box
                  key={r.id}
                  sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}
                >
                  <span>
                    {formatLocaleDate(r.work_date)} - {r.hours}
                  </span>
                  <Button
                    size="small"
                    onClick={() =>
                      approveLeaveMutation.mutate({
                        requestId: r.id,
                        timesheetId: current.id,
                      })
                    }
                  >
                    {t('timesheets.approve_leave')}
                  </Button>
                </Box>
              ))}
            </Box>
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
  );
}

