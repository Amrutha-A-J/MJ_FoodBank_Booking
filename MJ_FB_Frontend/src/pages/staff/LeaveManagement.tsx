import { Box, Button, TextField, Typography } from '@mui/material';
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

          {requests.map(r => (
            <Box key={r.id} sx={{ mb: 1 }}>
              <Typography component="span" sx={{ mr: 1 }}>
                {formatLocaleDate(r.work_date)} - {r.hours}h
              </Typography>
              <Typography component="span">
                {t(`leave.status.${r.status}`)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Page>
  );
}
