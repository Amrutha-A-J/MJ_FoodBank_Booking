import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter,
  Typography,
  CircularProgress,
  Button,
  Tooltip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Page from '../../components/Page';
import StyledTabs, { type TabItem } from '../../components/StyledTabs';
import { useTranslation } from 'react-i18next';
import { formatLocaleDate } from '../../utils/date';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import type { ApiError } from '../../api/client';
import {
  useAllTimesheets,
  useTimesheetDays,
  useRejectTimesheet,
  useProcessTimesheet,
} from '../../api/timesheets';

export default function AdminTimesheets() {
  const { t } = useTranslation();
  const { timesheets, isLoading: loadingSheets, error: sheetsError } =
    useAllTimesheets();
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!timesheets.length) return;
    const idx = timesheets.findIndex(p => !p.approved_at);
    setTab(idx === -1 ? 0 : idx);
  }, [timesheets.length]);

  const current = timesheets[tab];
  const { days: rawDays, error: daysError } = useTimesheetDays(current?.id);

  const rejectMutation = useRejectTimesheet();
  const processMutation = useProcessTimesheet();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const err = sheetsError || daysError;
    if (err) setMessage((err as ApiError).message || 'Error');
  }, [sheetsError, daysError]);

  function renderTable() {
    if (!current) return null;
    const totals = rawDays.reduce(
      (acc, d) => {
        const paid = d.reg_hours + d.ot_hours + d.stat_hours + d.sick_hours + d.vac_hours;
        acc.reg += d.reg_hours;
        acc.ot += d.ot_hours;
        acc.stat += d.stat_hours;
        acc.sick += d.sick_hours;
        acc.vac += d.vac_hours;
        acc.paid += paid;
        acc.expected += d.expected_hours;
        return acc;
      },
      { reg: 0, ot: 0, stat: 0, sick: 0, vac: 0, paid: 0, expected: 0 },
    );
    const shortfall = totals.expected - totals.paid;
    const otBankRemaining = current.balance_hours;

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
            {rawDays.map(d => {
              const paid =
                d.reg_hours + d.ot_hours + d.stat_hours + d.sick_hours + d.vac_hours;
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    {formatLocaleDate(d.work_date)}
                    {(d.locked_by_rule || d.locked_by_leave) && (
                      <Tooltip
                        title={
                          d.locked_by_rule
                            ? t('timesheets.lock_stat_tooltip')
                            : t('timesheets.lock_leave_tooltip')
                        }
                      >
                        <LockIcon sx={{ ml: 1, fontSize: 16 }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>{d.reg_hours}</TableCell>
                  <TableCell>{d.ot_hours}</TableCell>
                  <TableCell>{d.stat_hours}</TableCell>
                  <TableCell>{d.sick_hours}</TableCell>
                  <TableCell>{d.vac_hours}</TableCell>
                  <TableCell>{d.note}</TableCell>
                  <TableCell>{paid}</TableCell>
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
    label: `${p.staff_name}: ${formatLocaleDate(p.start_date)} - ${formatLocaleDate(
      p.end_date,
    )}`,
    content: p.id === current?.id ? renderTable() : null,
  }));

  return (
    <Page title={t('timesheets.title')}>
      {loadingSheets ? (
        <CircularProgress />
      ) : (
        <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
      )}
      {current && current.submitted_at && !current.approved_at && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
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
