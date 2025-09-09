import { useEffect, useState } from 'react';
import { Button, Card, CardContent, Grid, Typography } from '@mui/material';
import Page from '../../components/Page';
import EventForm from '../../components/EventForm';
import EventList from '../../components/EventList';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getEvents, deleteEvent, type EventGroups } from '../../api/events';

export default function Events() {
  const [events, setEvents] = useState<EventGroups>({
    today: [],
    upcoming: [],
    past: [],
  });
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  function fetchEvents() {
    getEvents()
      .then(data =>
        setEvents(
          data ?? { today: [], upcoming: [], past: [] },
        ),
      )
      .catch(() => setEvents({ today: [], upcoming: [], past: [] }));
  }

  async function handleDelete(id: number) {
    try {
      await deleteEvent(id);
      setSuccess('Event deleted');
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <Page
      title="Events"
      header={
        <Button variant="contained" onClick={() => setOpen(true)}>
          Create Event
        </Button>
      }
    >
      <Grid container spacing={2}>
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Today</Typography>
              <EventList events={events.today} onDelete={handleDelete} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Upcoming</Typography>
              <EventList events={events.upcoming} onDelete={handleDelete} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <Card sx={{ maxHeight: 200, overflowY: 'auto' }}>
            <CardContent>
              <Typography variant="h6">Past</Typography>
              <EventList events={events.past} onDelete={handleDelete} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <EventForm
        open={open}
        onClose={() => setOpen(false)}
        onCreated={fetchEvents}
      />
      <FeedbackSnackbar
        open={!!success}
        message={success}
        onClose={() => setSuccess('')}
        severity="success"
      />
      <FeedbackSnackbar
        open={!!error}
        message={error}
        onClose={() => setError('')}
        severity="error"
      />
    </Page>
  );
}

