import { useEffect, useState } from 'react';
import {
  Stack,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  getMailLists,
  sendMailListEmails,
  type MailLists,
} from '../../api/monetaryDonors';

const RANGES = ['1-100', '101-500', '501+'] as const;

export default function MailLists() {
  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() - 1);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const [lists, setLists] = useState<MailLists>();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as AlertColor,
  });

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
    try {
      await sendMailListEmails(year, month);
      setSnackbar({ open: true, message: 'Emails sent', severity: 'success' });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message ?? 'Failed to send emails',
        severity: 'error',
      });
    }
  }

  return (
    <Page title="Mail Lists">
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography>{`Month: ${month}`}</Typography>
          <Typography>{`Year: ${year}`}</Typography>
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!lists || !RANGES.some(range => lists[range].length > 0)}
          >
            Send Emails
          </Button>
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
      </Stack>
    </Page>
  );
}

