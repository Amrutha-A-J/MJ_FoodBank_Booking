import { List, ListItem, Typography, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Event } from '../api/events';
import { formatLocaleDate } from '../utils/date';

interface EventListProps {
  events: Event[];
  limit?: number;
  onDelete?: (id: number) => void;
}

export default function EventList({ events, limit, onDelete }: EventListProps) {
  const items = limit ? events.slice(0, limit) : events;
  if (!items.length)
    return <Typography variant="body2">No events</Typography>;

  function formatDateRange(start: string, end: string) {
    const startText = formatLocaleDate(start);
    const endText = formatLocaleDate(end);
    return startText === endText ? startText : `${startText} - ${endText}`;
  }
  return (
    <List>
      {items.map(ev => (
        <ListItem
          key={ev.id}
          disableGutters
          secondaryAction={
            onDelete && (
              <IconButton edge="end" aria-label="delete" onClick={() => onDelete(ev.id)}>
                <DeleteIcon />
              </IconButton>
            )
          }
        >
          <ListItemText
            primary={`${formatDateRange(ev.startDate, ev.endDate)} - ${ev.title}`}
            secondary={
              <>
                {ev.details && (
                  <Typography variant="body2" component="span" display="block">
                    {ev.details}
                  </Typography>
                )}
                <Typography variant="caption" component="span" display="block">
                  Created by {ev.createdByName}
                </Typography>
              </>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}
