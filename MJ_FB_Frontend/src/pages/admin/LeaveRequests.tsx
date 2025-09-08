import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import Page from '../../components/Page';
import {
  useAllLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '../../api/leaveRequests';
import { formatLocaleDate } from '../../utils/date';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

export default function AdminLeaveRequests() {
  const { t } = useTranslation();
  const { requests: fetched } = useAllLeaveRequests();
  const [requests, setRequests] = useState(fetched);
  const approve = useApproveLeaveRequest();
  const reject = useRejectLeaveRequest();

  useEffect(() => setRequests(fetched), [fetched]);

  const removeRequest = (id: number) =>
    setRequests(prev => prev.filter(r => r.id !== id));

  return (
    <Page title={t('leave.title')}>
      {requests.map(r => {
        const days =
          Math.round(
            (new Date(r.end_date!).getTime() -
              new Date(r.start_date!).getTime()) /
              86400000,
          ) + 1;
        return (
          <Card key={r.id} sx={{ mb: 2 }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
              }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight="bold">{r.requester_name}</Typography>
                <Typography variant="body2">
                  {formatLocaleDate(r.start_date!)} – {formatLocaleDate(r.end_date!)} ({
                    days
                  }{' '}
                  days) • {r.type ? t(`leave.type.${r.type}`) : ''}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  flexDirection: { xs: 'column', sm: 'row' },
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                  onClick={() =>
                    approve.mutate(
                      { requestId: r.id },
                      { onSuccess: () => removeRequest(r.id) },
                    )
                  }
                >
                  {t('timesheets.approve_leave')}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                  onClick={() =>
                    reject.mutate(
                      { requestId: r.id },
                      { onSuccess: () => removeRequest(r.id) },
                    )
                  }
                >
                  {t('timesheets.reject_leave')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Page>
  );
}
