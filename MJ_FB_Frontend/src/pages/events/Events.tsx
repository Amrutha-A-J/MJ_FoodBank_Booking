import { useEffect, useState } from 'react';
import { Button, Card, CardContent, Grid, Typography } from '@mui/material';
import Page from '../../components/Page';
import EventForm from '../../components/EventForm';
import EventList from '../../components/EventList';
import { getEvents, type EventGroups } from '../../api/events';

export default function Events() {
  const [events, setEvents] = useState<EventGroups>({
    today: [],
    upcoming: [],
    past: [],
  });
  const [open, setOpen] = useState(false);

  function fetchEvents() {
    getEvents()
      .then(data =>
        setEvents(
          data ?? { today: [], upcoming: [], past: [] },
        ),
      )
      .catch(() => setEvents({ today: [], upcoming: [], past: [] }));
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <Page
      title="Events"
      header={
        <Button size="small" variant="contained" onClick={() => setOpen(true)}>
          Create Event
        </Button>
      }
    >
      <Grid container spacing={2}>
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Today</Typography>
              <EventList events={events.today} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Upcoming</Typography>
              <EventList events={events.upcoming} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <Card sx={{ maxHeight: 200, overflowY: 'auto' }}>
            <CardContent>
              <Typography variant="h6">Past</Typography>
              <EventList events={events.past} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <EventForm
        open={open}
        onClose={() => setOpen(false)}
        onCreated={fetchEvents}
      />
    </Page>
  );
}

