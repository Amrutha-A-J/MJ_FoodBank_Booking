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
import { useEffect, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { LeaveRequest } from '../../api/leaveRequests';

export default function AdminLeaveRequests() {
  const { requests: fetched } = useAllLeaveRequests();
  const typeLabels: Record<string, string> = {
    paid: 'Paid',
    personal: 'Personal',
    sick: 'Sick',
  };
  const [requests, setRequests] = useState(fetched);
  const approve = useApproveLeaveRequest();
  const reject = useRejectLeaveRequest();
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);

  useEffect(() => setRequests(fetched), [fetched]);

  const removeRequest = (id: number) =>
    setRequests(prev => prev.filter(r => r.id !== id));

  return (
    <Page title={"Leave Requests"}>
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
                  days) • {r.type ? typeLabels[r.type] ?? '' : ''}
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
                  
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                  onClick={() =>
                    approve.mutate(
                      { requestId: r.id },
                      { onSuccess: () => removeRequest(r.id) },
                    )
                  }
                >
                  {"Approve"}
                </Button>
                <Button
                  variant="contained"
                  color="error"

                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                  onClick={() => setRejecting(r)}
                >
                  {"Reject"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      })}
      {rejecting && (
        <ConfirmDialog
          message={`Reject leave request for ${rejecting.requester_name}?`}
          onConfirm={() => {
            reject.mutate(
              { requestId: rejecting.id },
              { onSuccess: () => removeRequest(rejecting.id) },
            );
            setRejecting(null);
          }}
          onCancel={() => setRejecting(null)}
        />
      )}
    </Page>
  );
}
