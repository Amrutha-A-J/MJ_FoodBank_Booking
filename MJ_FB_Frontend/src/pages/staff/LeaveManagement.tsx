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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import Page from '../../components/Page';
import { useTimesheets } from '../../api/timesheets';
import { useCreateLeaveRequest, useLeaveRequests } from '../../api/leaveRequests';
import { formatLocaleDate } from '../../utils/date';
import { useState } from 'react';

export default function LeaveManagement() {
  const { t } = useTranslation();
  const { timesheets } = useTimesheets();
  const current =
    timesheets.find(p => !p.approved_at) || timesheets[timesheets.length - 1];
  const leaveMutation = useCreateLeaveRequest(current?.id);
  const { requests } = useLeaveRequests(current?.id);
  const [open, setOpen] = useState(false);

  return (
    <Page title={t('leave.title')}>
      {current && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => setOpen(true)}
            sx={{ mb: 3 }}
          >
            {t('leave.request_vacation')}
          </Button>
          <Dialog open={open} onClose={() => setOpen(false)}>
            <Box
              component="form"
              onSubmit={e => {
                e.preventDefault();
                const form = e.currentTarget as typeof e.currentTarget & {
                  type: { value: string };
                  start: { value: string };
                  end: { value: string };
                };
                leaveMutation.mutate(
                  {
                    type: form.type.value,
                    startDate: form.start.value,
                    endDate: form.end.value,
                  },
                  { onSuccess: () => setOpen(false) },
                );
              }}
            >
              <DialogTitle>{t('leave.request_vacation')}</DialogTitle>
              <DialogContent
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <FormControl size="small">
                  <InputLabel id="leave-type-label">
                    {t('leave.type_label')}
                  </InputLabel>
                  <Select
                    labelId="leave-type-label"
                    name="type"
                    label={t('leave.type_label')}
                    defaultValue="paid"
                  >
                    <MenuItem value="paid">{t('leave.type.paid')}</MenuItem>
                    <MenuItem value="personal">
                      {t('leave.type.personal')}
                    </MenuItem>
                    <MenuItem value="sick">{t('leave.type.sick')}</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  name="start"
                  type="date"
                  size="small"
                  label={t('leave.start_date')}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  name="end"
                  type="date"
                  size="small"
                  label={t('leave.end_date')}
                  InputLabelProps={{ shrink: true }}
                />
              </DialogContent>
              <DialogActions>
                <Button
                  size="small"
                  onClick={() => setOpen(false)}
                  color="inherit"
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="contained" size="small">
                  {t('submit')}
                </Button>
              </DialogActions>
            </Box>
          </Dialog>

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
