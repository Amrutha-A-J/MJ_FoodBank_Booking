import { useState } from 'react';
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
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Page from '../../components/Page';
import StyledTabs, { type TabItem } from '../../components/StyledTabs';
import { useTranslation } from 'react-i18next';
import { formatLocaleDate } from '../../utils/date';

type Day = {
  date: string;
  reg: number;
  ot: number;
  stat: number;
  sick: number;
  vac: number;
  note: string;
  expected: number;
};

type PayPeriod = {
  id: number;
  start: string;
  end: string;
  submitted: boolean;
  processed: boolean;
  days: Day[];
};

const mockPeriods: PayPeriod[] = [
  {
    id: 2,
    start: '2023-12-15',
    end: '2023-12-31',
    submitted: true,
    processed: true,
    days: [
      { date: '2023-12-15', reg: 8, ot: 0, stat: 0, sick: 0, vac: 0, note: '', expected: 8 },
      { date: '2023-12-16', reg: 4, ot: 4, stat: 0, sick: 0, vac: 0, note: '', expected: 8 },
    ],
  },
  {
    id: 1,
    start: '2024-01-01',
    end: '2024-01-07',
    submitted: false,
    processed: false,
    days: [
      { date: '2024-01-01', reg: 0, ot: 0, stat: 8, sick: 0, vac: 0, note: '', expected: 8 },
      { date: '2024-01-02', reg: 8, ot: 0, stat: 0, sick: 0, vac: 0, note: '', expected: 8 },
      { date: '2024-01-03', reg: 8, ot: 1, stat: 0, sick: 0, vac: 0, note: '', expected: 8 },
    ],
  },
];

export default function Timesheets() {
  const { t } = useTranslation();
  const [periods, setPeriods] = useState<PayPeriod[]>(mockPeriods);
  const [tab, setTab] = useState(() => {
    const idx = mockPeriods.findIndex(p => !p.processed);
    return idx === -1 ? mockPeriods.length - 1 : idx;
  });

  const current = periods[tab];
  const inputsDisabled = current.submitted || current.processed;

  const tabs: TabItem[] = periods.map(p => ({
    label: `${formatLocaleDate(p.start)} - ${formatLocaleDate(p.end)}`,
    content: renderTable(p),
  }));

  function renderTable(period: PayPeriod) {
    const handleChange = (index: number, field: keyof Day, value: string) => {
      setPeriods(prev => {
        const copy = [...prev];
        const days = [...copy[tab].days];
        days[index] = { ...days[index], [field]: field === 'note' ? value : Number(value) };
        copy[tab] = { ...copy[tab], days };
        return copy;
      });
    };

    const totals = period.days.reduce(
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
            {period.days.map((d, i) => {
              const paid = d.reg + d.ot + d.stat + d.sick + d.vac;
              const over = paid > 8;
              const disabled = inputsDisabled || d.stat === 8;
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

  return (
    <Page title={t('timesheets.title')}>
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
    </Page>
  );
}

