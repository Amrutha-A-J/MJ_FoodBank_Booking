import { List, ListItem, Typography, ListItemText, IconButton, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EditIcon from '@mui/icons-material/Edit';
import type { Event } from '../api/events';
import { updateEvent } from '../api/events';
import { formatLocaleDate } from '../utils/date';

interface EventListProps {
  events: Event[];
  limit?: number;
  onDelete?: (id: number) => void;
  onChange?: () => void;
  onEdit?: (event: Event) => void;
}

export default function EventList({ events, limit, onDelete, onChange, onEdit }: EventListProps) {
  const items = limit ? events.slice(0, limit) : events;
  if (!items.length)
    return <Typography variant="body2">No events</Typography>;

  function formatDateRange(start: string, end: string) {
    const startText = formatLocaleDate(start);
    const endText = formatLocaleDate(end);
    return startText === endText ? startText : `${startText} to ${endText}`;
  }

  async function changePriority(ev: Event, delta: number) {
    await updateEvent(ev.id, { priority: ev.priority + delta });
    onChange?.();
  }

  return (
    <List>
      {items.map(ev => (
        <ListItem key={ev.id} sx={{ pl: 0 }}>
          <ListItemText
            disableTypography
            primary={
              <Typography component="span" variant="body1">
                {formatDateRange(ev.startDate, ev.endDate)}
                {' - '}
                <Box component="span" fontWeight="bold">
                  {ev.title}
                </Box>
              </Typography>
            }
            secondary={
              <>
                {ev.details && (
                  <Typography
                    variant="body2"
                    component="span"
                    display="block"
                    sx={{ whiteSpace: 'pre-line' }}
                  >
                    {ev.details}
                  </Typography>
                )}
                <Box display="flex" alignItems="center" mt={0.5}>
                  <Typography variant="caption" component="span">
                    Created by {ev.createdByName}
                  </Typography>
                  <Box ml="auto">
                    {onEdit && (
                      <IconButton aria-label="edit" onClick={() => onEdit(ev)}>
                        <EditIcon />
                      </IconButton>
                    )}
                    {onChange && (
                      <>
                        <IconButton aria-label="move up" onClick={() => changePriority(ev, 1)}>
                          <ArrowUpwardIcon />
                        </IconButton>
                        <IconButton aria-label="move down" onClick={() => changePriority(ev, -1)}>
                          <ArrowDownwardIcon />
                        </IconButton>
                      </>
                    )}
                    {onDelete && (
                      <IconButton aria-label="delete" onClick={() => onDelete(ev.id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}
