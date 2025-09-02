import { useState } from 'react';
import Page from '../../components/Page';
import { useTranslation } from 'react-i18next';
import { TextField, Button, Box } from '@mui/material';
import {
  useLeaveRequests,
  useCreateLeaveRequest,
  useCancelLeaveRequest,
} from '../../api/leaveRequests';
import { formatLocaleDate } from '../../utils/date';

export default function LeaveRequests() {
  const { t } = useTranslation();
  const { requests } = useLeaveRequests();
  const create = useCreateLeaveRequest();
  const cancel = useCancelLeaveRequest();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  return (
    <Page title={t('leave_requests.title')}>
      <Box component="form" onSubmit={e => { e.preventDefault(); create.mutate({ startDate: start, endDate: end, reason }); }} sx={{ mb: 2 }}>
        <TextField label={t('leave_requests.start')} type="date" value={start} onChange={e => setStart(e.target.value)} sx={{ mr: 2 }} />
        <TextField label={t('leave_requests.end')} type="date" value={end} onChange={e => setEnd(e.target.value)} sx={{ mr: 2 }} />
        <TextField label={t('leave_requests.reason')} value={reason} onChange={e => setReason(e.target.value)} sx={{ mr: 2 }} />
        <Button type="submit" variant="contained">{t('leave_requests.submit')}</Button>
      </Box>
      {requests.map(r => (
        <Box key={r.id} sx={{ mb: 1 }}>
          {formatLocaleDate(r.start_date)} - {formatLocaleDate(r.end_date)} : {r.status}
          {r.status === 'pending' && (
            <Button size="small" sx={{ ml: 1 }} onClick={() => cancel.mutate(r.id)}>
              {t('leave_requests.cancel')}
            </Button>
          )}
        </Box>
      ))}
    </Page>
  );
}
