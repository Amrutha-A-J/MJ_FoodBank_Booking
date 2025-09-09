import { useState } from 'react';
import { Stack, TextField, Button } from '@mui/material';
import Page from '../../components/Page';

export default function MailLists() {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  return (
    <Page title="Mail Lists">
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            size="small"
          />
          <TextField
            label="Year"
            value={year}
            onChange={e => setYear(e.target.value)}
            size="small"
          />
        </Stack>
        <div>Grouped donor lists will appear here.</div>
        <Button variant="contained">Send Emails</Button>
      </Stack>
    </Page>
  );
}

