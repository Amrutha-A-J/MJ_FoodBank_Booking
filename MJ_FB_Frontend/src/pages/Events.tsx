import { useState } from 'react';
import { Button, Box } from '@mui/material';
import Page from '../components/Page';
import EventForm from '../components/EventForm';

export default function Events() {
  const [open, setOpen] = useState(false);
  return (
    <Page title="Events">
      <Box mb={2}>
        <Button variant="contained" size="small" onClick={() => setOpen(true)}>
          Create Event
        </Button>
      </Box>
      <EventForm open={open} onClose={() => setOpen(false)} />
    </Page>
  );
}
