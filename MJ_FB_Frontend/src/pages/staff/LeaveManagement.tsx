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
  Typography,
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
  const leaveMutation = useCreateLeaveRequest(current?.id ?? 0);
  const { requests } = useLeaveRequests(current?.id);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('paid');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

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
                leaveMutation.mutate(
                  { type, start, end },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      setStart('');
                      setEnd('');
                      setType('paid');
                    },
                  },
                );
              }}
            >
              <DialogTitle>{t('leave.request_vacation')}</DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <FormControl size="small">
                  <InputLabel>{t('leave.type')}</InputLabel>
                  <Select
                    label={t('leave.type')}
                    value={type}
                    onChange={e => setType(e.target.value)}
                  >
                    <MenuItem value="paid">{t('leave.types.paid')}</MenuItem>
                    <MenuItem value="personal">{t('leave.types.personal')}</MenuItem>
                    <MenuItem value="sick">{t('leave.types.sick')}</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label={t('leave.start_date')}
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={start}
                  onChange={e => setStart(e.target.value)}
                />
                <TextField
                  label={t('leave.end_date')}
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpen(false)} size="small">
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="contained" size="small">
                  {t('timesheets.submit')}
                </Button>
              </DialogActions>
            </Box>
          </Dialog>

          {requests.map(r => (
            <Box key={r.id} sx={{ mb: 1 }}>
              <Typography component="span" sx={{ mr: 1 }}>
                {formatLocaleDate(r.start_date)} - {formatLocaleDate(r.end_date)}
              </Typography>
              <Typography component="span" sx={{ mr: 1 }}>
                {t(`leave.types.${r.type}`)}
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
