import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import Page from '../../components/Page';
import { useTimesheets } from '../../api/timesheets';
import {
  useCreateLeaveRequest,
  useLeaveRequests,
  type LeaveRequest,
} from '../../api/leaveRequests';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import { formatLocaleDate } from '../../utils/date';
import { useState } from 'react';

export default function LeaveManagement() {
  const { timesheets } = useTimesheets();
  const current =
    timesheets.find(p => !p.approved_at) || timesheets[timesheets.length - 1];
  const leaveMutation = useCreateLeaveRequest(current?.id);
  const { requests } = useLeaveRequests(current?.staff_id);
  const [open, setOpen] = useState(false);

  const typeLabels: Record<string, string> = {
    paid: 'Paid',
    personal: 'Personal',
    sick: 'Sick',
  };

  const statusLabels: Record<LeaveRequest['status'], string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  const columns: Column<LeaveRequest>[] = [
    {
      field: 'start_date',
      header: 'Start date',
      render: (r: LeaveRequest) =>
        formatLocaleDate(r.start_date ?? r.work_date),
    },
    {
      field: 'end_date',
      header: 'End date',
      render: (r: LeaveRequest) =>
        formatLocaleDate(r.end_date ?? r.work_date),
    },
    {
      field: 'type',
      header: 'Type',
      render: (r: LeaveRequest) => (r.type ? typeLabels[r.type] ?? r.type : ''),
    },
    {
      field: 'status',
      header: 'Status',
      render: (r: LeaveRequest) => statusLabels[r.status],
    },
  ];

  return (
    <Page title="Leave Requests">
      {current && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"

            onClick={() => setOpen(true)}
            sx={{ mb: 3 }}
          >
            Request Vacation
          </Button>
          <Dialog open={open} onClose={() => setOpen(false)}>
            <Box
              component="form"
              onSubmit={e => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                leaveMutation.mutate(
                  {
                    type: data.get('type')?.toString() ?? '',
                    startDate: data.get('start')?.toString() ?? '',
                    endDate: data.get('end')?.toString() ?? '',
                  },
                  { onSuccess: () => setOpen(false) },
                );
              }}
            >
              <DialogTitle>Request Vacation</DialogTitle>
              <DialogContent
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <FormControl>
                  <InputLabel id="leave-type-label">Type</InputLabel>
                  <Select
                    labelId="leave-type-label"
                    name="type"
                    label="Type"
                    defaultValue="paid"
                  >
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="personal">Personal</MenuItem>
                    <MenuItem value="sick">Sick</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  name="start"
                  type="date"

                  label="Start date"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  name="end"
                  type="date"

                  label="End date"
                  InputLabelProps={{ shrink: true }}
                />
              </DialogContent>
              <DialogActions>
                <Button

                  onClick={() => setOpen(false)}
                  color="inherit"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="contained">
                  Submit
                </Button>
              </DialogActions>
            </Box>
          </Dialog>

          <ResponsiveTable
            columns={columns}
            rows={requests ?? []}
            getRowKey={r => r.id}
          />
        </Box>
      )}
    </Page>
  );
}
