import { List, ListItem, Typography } from '@mui/material';
import type { Event } from '../api/events';

interface EventListProps {
  events: Event[];
  limit?: number;
}

export default function EventList({ events, limit }: EventListProps) {
  const items = limit ? events.slice(0, limit) : events;
  if (!items.length)
    return <Typography variant="body2">No events</Typography>;
  return (
    <List>
      {items.map(ev => (
        <ListItem key={ev.id} disableGutters>
          <Typography variant="body2">
            {new Date(ev.date).toLocaleDateString()} - {ev.title}
          </Typography>
        </ListItem>
      ))}
    </List>
  );
}
