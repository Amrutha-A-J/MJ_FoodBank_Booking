import type { Shift } from '../types';
import { formatHHMM } from '../utils/time';
import { useMediaQuery, useTheme } from '@mui/material';

interface Props {
  shifts: Shift[];
}

export default function ScheduleTable({ shifts }: Props) {
  if (shifts.length === 0) {
    return <p>No shifts.</p>;
  }

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const cellStyle: React.CSSProperties = {
    padding: isSmall ? 4 : 8,
    fontSize: isSmall ? '0.75rem' : undefined,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const maxSlots = Math.max(...shifts.map((s) => s.maxVolunteers), 0);

  return (
    <table
      style={{
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
      }}
    >
      <thead>
        <tr>
          <th style={cellStyle}>Shift</th>
          {Array.from({ length: maxSlots }).map((_, i) => (
            <th key={i} style={cellStyle}>
              Slot {i + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shifts.map((shift) => (
          <tr key={shift.shiftId}>
            <td style={cellStyle}>
              {formatHHMM(shift.startTime)}–{formatHHMM(shift.endTime)}
            </td>
            {Array.from({ length: maxSlots }).map((_, i) => (
              <td
                key={i}
                style={{
                  ...cellStyle,
                  backgroundColor:
                    i >= shift.maxVolunteers ? '#eee' : undefined,
                }}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

