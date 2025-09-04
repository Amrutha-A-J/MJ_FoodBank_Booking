import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import Page from '../../components/Page';
import { useTimesheets } from '../../api/timesheets';
import { useCreateLeaveRequest, useLeaveRequests } from '../../api/leaveRequests';
import { formatLocaleDate } from '../../utils/date';

export default function LeaveManagement() {
  const { t } = useTranslation();
  const { timesheets } = useTimesheets();
  const current =
    timesheets.find(p => !p.approved_at) || timesheets[timesheets.length - 1];
  const leaveMutation = useCreateLeaveRequest(current?.id ?? 0);
  const { requests } = useLeaveRequests(current?.id);

  return (
    <Page title={t('leave.title')}>
      {current && (
        <Box sx={{ mt: 2 }}>
          <Box
            component="form"
            sx={{ display: 'flex', gap: 1, mb: 3 }}
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

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('leave.start_date')}</TableCell>
                  <TableCell>{t('leave.end_date')}</TableCell>
                  <TableCell>{t('leave.type_label')}</TableCell>
                  <TableCell>{t('leave.status_label')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {formatLocaleDate(r.start_date ?? r.work_date)}
                    </TableCell>
                    <TableCell>
                      {formatLocaleDate(r.end_date ?? r.work_date)}
                    </TableCell>
                    <TableCell>
                      {r.type ? t(`leave.type.${r.type}`) : ''}
                    </TableCell>
                    <TableCell>
                      {t(`leave.status.${r.status}`)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Page>
  );
}
