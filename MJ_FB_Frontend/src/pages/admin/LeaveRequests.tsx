import { Box, Button, Typography } from '@mui/material';
import Page from '../../components/Page';
import {
  useAllLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '../../api/leaveRequests';
import { formatLocaleDate } from '../../utils/date';
import { useTranslation } from 'react-i18next';

export default function AdminLeaveRequests() {
  const { t } = useTranslation();
  const { requests } = useAllLeaveRequests();
  const approve = useApproveLeaveRequest();
  const reject = useRejectLeaveRequest();

  return (
    <Page title={t('leave.title')}>
      {requests.map(r => (
        <Box key={r.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
          <Typography component="span" sx={{ flexGrow: 1 }}>
            {r.staff_name} - {formatLocaleDate(r.work_date)} - {r.hours}h
          </Typography>
          <Button
            size="small"
            onClick={() => approve.mutate({ requestId: r.id, timesheetId: r.timesheet_id })}
          >
            {t('timesheets.approve_leave')}
          </Button>
          <Button
            size="small"
            onClick={() => reject.mutate({ requestId: r.id, timesheetId: r.timesheet_id })}
          >
            {t('timesheets.reject')}
          </Button>
        </Box>
      ))}
    </Page>
  );
}
