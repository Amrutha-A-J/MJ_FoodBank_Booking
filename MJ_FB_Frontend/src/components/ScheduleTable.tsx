import type { Shift } from '../types';
import { formatHHMM } from '../utils/time';

interface Props {
  shifts: Shift[];
}

export default function ScheduleTable({ shifts }: Props) {
  if (shifts.length === 0) {
    return <p>No shifts.</p>;
  }

  const maxSlots = Math.max(...shifts.map((s) => s.maxVolunteers), 0);

  return (
    <table>
      <thead>
        <tr>
          <th>Shift</th>
          {Array.from({ length: maxSlots }).map((_, i) => (
            <th key={i}>Slot {i + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shifts.map((shift) => (
          <tr key={shift.shiftId}>
            <td>
              {formatHHMM(shift.startTime)}–{formatHHMM(shift.endTime)}
            </td>
            {Array.from({ length: maxSlots }).map((_, i) => (
              <td
                key={i}
                style={
                  i >= shift.maxVolunteers
                    ? { backgroundColor: '#eee' }
                    : undefined
                }
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

