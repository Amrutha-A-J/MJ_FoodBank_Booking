import { useEffect, useState } from 'react';
import { Button, Card, CardContent, Grid, List, ListItem, Typography } from '@mui/material';
import Page from '../components/Page';
import EventForm from '../components/EventForm';
import { getEvents, type Event } from '../api/events';

function groupEvents(events: Event[] = []) {
  const todayStr = new Date().toISOString().split('T')[0];
  const today: Event[] = [];
  const upcoming: Event[] = [];
  const past: Event[] = [];
  events.forEach(ev => {
    const dateStr = ev.date.split('T')[0];
    if (dateStr === todayStr) today.push(ev);
    else if (dateStr > todayStr) upcoming.push(ev);
    else past.push(ev);
  });
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  past.sort((a, b) => b.date.localeCompare(a.date));
  return { today, upcoming, past };
}

function EventList({ events }: { events: Event[] }) {
  if (!events.length)
    return <Typography variant="body2">No events</Typography>;
  return (
    <List>
      {events.map(ev => (
        <ListItem key={ev.id} disableGutters>
          <Typography variant="body2">
            {new Date(ev.date).toLocaleDateString()} - {ev.title}
          </Typography>
        </ListItem>
      ))}
    </List>
  );
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);

  function fetchEvents() {
    getEvents()
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]));
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  const { today, upcoming, past } = groupEvents(events);

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
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Today</Typography>
              <EventList events={today} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Upcoming</Typography>
              <EventList events={upcoming} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card sx={{ maxHeight: 200, overflowY: 'auto' }}>
            <CardContent>
              <Typography variant="h6">Past</Typography>
              <EventList events={past} />
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

