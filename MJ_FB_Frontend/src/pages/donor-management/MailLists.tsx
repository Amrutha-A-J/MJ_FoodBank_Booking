import { useEffect, useState } from 'react';
import {
  Stack,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Box,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DonorQuickLinks from '../../components/DonorQuickLinks';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  getMailLists,
  sendMailListEmails,
  sendTestMailListEmails,
  type MailLists,
} from '../../api/monetaryDonors';

const RANGES = ['1-100', '101-500', '501-1000', '1001-10000', '10001-30000'] as const;

export default function MailLists() {
  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() - 1);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const monthName = now.toLocaleString('en-CA', { month: 'long' });
  const [lists, setLists] = useState<MailLists>();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as AlertColor,
  });
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmTestSend, setConfirmTestSend] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMailLists(year, month);
        setLists(data);
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message ?? 'Failed to load mail lists',
          severity: 'error',
        });
      }
    }
    load();
  }, [year, month]);

  async function handleSend() {
    setConfirmSend(false);
    try {
      await sendMailListEmails({ year, month });
      setSnackbar({ open: true, message: 'Emails sent', severity: 'success' });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message ?? 'Failed to send emails',
        severity: 'error',
      });
    }
  }

  async function handleTestSend() {
    setConfirmTestSend(false);
    try {
      await sendTestMailListEmails({ year, month });
      setSnackbar({ open: true, message: 'Test emails sent', severity: 'success' });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message ?? 'Failed to send test emails',
        severity: 'error',
      });
    }
  }

  const noDonors = Boolean(lists && !RANGES.some(range => lists[range].length > 0));

  return (
    <>
      <DonorQuickLinks />
      <Page title="Mail Lists">
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            useFlexGap
            alignItems={{ xs: 'stretch', md: 'center' }}
            sx={{ flexWrap: { md: 'wrap' } }}
          >
            <Typography>{`Month: ${month}`}</Typography>
            <Typography>{`Year: ${year}`}</Typography>
            <Tooltip
              title="No donors to email for last month"
              disableHoverListener={!noDonors}
              disableFocusListener={!noDonors}
              disableTouchListener={!noDonors}
            >
              <Box
                component="span"
                sx={{ display: 'inline-flex', width: { xs: '100%', md: 'auto' } }}
              >
                <Button
                  variant="contained"
                  onClick={() => setConfirmSend(true)}
                  disabled={!lists || noDonors}
                  sx={{ width: { xs: '100%', md: 'auto' } }}
                >
                  {`Send emails for (${monthName})`}
                </Button>
              </Box>
            </Tooltip>
            <Button
              variant="outlined"
              onClick={() => setConfirmTestSend(true)}
              disabled={!lists}
              sx={{ width: { xs: '100%', md: 'auto' } }}
            >
              Send test emails
            </Button>
            {noDonors && (
              <Typography
                color="text.secondary"
                sx={{ width: { xs: '100%', md: 'auto' } }}
              >
                No donors to email for last month
              </Typography>
            )}
          </Stack>
        {lists &&
          RANGES.map(range => (
            <Paper key={range} sx={{ p: 2 }}>
              <Typography variant="h6" mb={1}>{`$${range}`}</Typography>
              <List dense>
                {lists[range].map(donor => (
                  <ListItem
                    key={donor.id}
                    secondaryAction={<Typography>{`$${donor.amount}`}</Typography>}
                  >
                    <ListItemText
                      primary={`${donor.firstName} ${donor.lastName}`}
                      secondary={donor.email}
                    />
                  </ListItem>
                ))}
                {lists[range].length === 0 && (
                  <ListItem>
                    <ListItemText primary="No donors" />
                  </ListItem>
                )}
              </List>
            </Paper>
          ))}
          <FeedbackSnackbar
            open={snackbar.open}
            onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            message={snackbar.message}
            severity={snackbar.severity}
          />
          {confirmSend && (
            <ConfirmDialog
              message="Send emails?"
              onConfirm={handleSend}
              onCancel={() => setConfirmSend(false)}
            />
          )}
          {confirmTestSend && (
            <ConfirmDialog
              message="Send test emails?"
              onConfirm={handleTestSend}
              onCancel={() => setConfirmTestSend(false)}
            />
          )}
        </Stack>
      </Page>
    </>
  );
}

