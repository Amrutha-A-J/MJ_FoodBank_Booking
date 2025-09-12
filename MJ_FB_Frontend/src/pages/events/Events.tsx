import { useEffect, useState } from 'react';
import { Button, Card, CardContent, Grid, Typography } from '@mui/material';
import Page from '../../components/Page';
import EventForm from '../../components/EventForm';
import EventList from '../../components/EventList';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getEvents, deleteEvent, type EventGroups, type Event } from '../../api/events';

export default function Events() {
  const [events, setEvents] = useState<EventGroups>({
    today: [],
    upcoming: [],
    past: [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  function fetchEvents() {
    getEvents()
      .then(data =>
        setEvents(
          data ?? { today: [], upcoming: [], past: [] },
        ),
      )
      .catch(() => setEvents({ today: [], upcoming: [], past: [] }));
  }

  function confirmDelete(id: number) {
    const ev =
      events.today.find(e => e.id === id) ??
      events.upcoming.find(e => e.id === id) ??
      events.past.find(e => e.id === id) ??
      null;
    setEventToDelete(ev);
  }

  async function handleDelete() {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.id);
      setSuccess('Event deleted');
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setEventToDelete(null);
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <Page
      title="Events"
      header={
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Create Event
        </Button>
      }
    >
      <Grid container spacing={2}>
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Today</Typography>
              <EventList
                events={events.today}
                onDelete={confirmDelete}
                onEdit={ev => {
                  setEditing(ev);
                  setOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Upcoming</Typography>
              <EventList
                events={events.upcoming}
                onDelete={confirmDelete}
                onEdit={ev => {
                  setEditing(ev);
                  setOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <Card sx={{ maxHeight: 200, overflowY: 'auto' }}>
            <CardContent>
              <Typography variant="h6">Past</Typography>
              <EventList
                events={events.past}
                onDelete={confirmDelete}
                onEdit={ev => {
                  setEditing(ev);
                  setOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <EventForm
        open={open}
        onClose={() => setOpen(false)}
        onSaved={fetchEvents}
        event={editing ?? undefined}
      />
      {eventToDelete && (
        <ConfirmDialog
          message={`Delete ${eventToDelete.title}?`}
          onConfirm={handleDelete}
          onCancel={() => setEventToDelete(null)}
        />
      )}
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

