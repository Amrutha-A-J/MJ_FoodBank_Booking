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
} from '../../api/timesheets';

interface Day {
  date: string;
  reg: number;
  ot: number;
  stat: number;
  sick: number;
  vac: number;
  note: string;
  expected: number;
  locked: boolean;
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
        reg: (d as any).reg_hours ?? d.actual_hours ?? 0,
        ot: (d as any).ot_hours ?? 0,
        stat: (d as any).stat_hours ?? 0,
        sick: (d as any).sick_hours ?? 0,
        vac: (d as any).vac_hours ?? 0,
        note: (d as any).note ?? '',
        expected: d.expected_hours,
        locked: (d as any).locked_by_leave ?? false,
      })),
    );
  }, [rawDays]);

  const updateMutation = useUpdateTimesheetDay(current?.id ?? 0);
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
      const hours = d.reg + d.ot + d.stat + d.sick + d.vac;
      if (!current) return;
      updateMutation.mutate(
        { date: d.date, hours },
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
              const disabled = inputsDisabled || d.stat === 8 || d.locked;
              return (
                <TableRow key={d.date}>
                  <TableCell>
                    {formatLocaleDate(d.date)}
                    {d.stat === 8 && (
                      <Tooltip title={t('timesheets.lock_stat_tooltip')}>
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
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity="error"
      />
    </Page>
  );
}

