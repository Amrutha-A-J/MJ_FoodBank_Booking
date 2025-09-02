import Page from '../../components/Page';
import { useTranslation } from 'react-i18next';
import { Button, Box } from '@mui/material';
import {
  useLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '../../api/leaveRequests';
import { formatLocaleDate } from '../../utils/date';

export default function LeaveInbox() {
  const { t } = useTranslation();
  const { requests } = useLeaveRequests();
  const approve = useApproveLeaveRequest();
  const reject = useRejectLeaveRequest();
  const pending = requests.filter(r => r.status === 'pending');
  return (
    <Page title={t('leave_requests.title')}>
      {pending.map(r => (
        <Box key={r.id} sx={{ mb: 1 }}>
          {formatLocaleDate(r.start_date)} - {formatLocaleDate(r.end_date)}
          <Button size="small" sx={{ ml: 1 }} onClick={() => approve.mutate(r.id)}>
            {t('leave_requests.approve')}
          </Button>
          <Button size="small" sx={{ ml: 1 }} onClick={() => reject.mutate(r.id)}>
            {t('leave_requests.reject')}
          </Button>
        </Box>
      ))}
    </Page>
  );
}
