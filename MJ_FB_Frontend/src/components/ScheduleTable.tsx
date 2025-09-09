import type { Shift } from '../types';
import { formatHHMM } from '../utils/time';
import {
  useMediaQuery,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from '@mui/material';

interface Props {
  shifts: Shift[];
}

export default function ScheduleTable({ shifts }: Props) {
  if (shifts.length === 0) {
    return <p>No shifts.</p>;
  }

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const cellSx = {
    p: isSmall ? 0.5 : 1,
    fontSize: isSmall ? '0.75rem' : undefined,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const;

  const maxSlots = Math.max(...shifts.map((s) => s.maxVolunteers), 0);

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table
        
        sx={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
        }}
      >
      <TableHead>
        <TableRow>
          <TableCell sx={cellSx}>Shift</TableCell>
          {Array.from({ length: maxSlots }).map((_, i) => (
            <TableCell key={i} sx={cellSx}>
              Slot {i + 1}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {shifts.map((shift) => (
          <TableRow key={shift.shiftId}>
            <TableCell sx={cellSx}>
              {formatHHMM(shift.startTime)}–{formatHHMM(shift.endTime)}
            </TableCell>
            {Array.from({ length: maxSlots }).map((_, i) => (
              <TableCell
                key={i}
                sx={{
                  ...cellSx,
                  backgroundColor:
                    i >= shift.maxVolunteers
                      ? theme.palette.grey[200]
                      : 'transparent',
                }}
              />
            ))}
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </TableContainer>
  );
}

