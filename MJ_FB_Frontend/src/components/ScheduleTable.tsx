interface Cell {
  content: string;
  backgroundColor?: string;
  onClick?: () => void;
  colSpan?: number;
}

interface Row {
  time: string;
  cells: Cell[];
}

interface Props {
  maxSlots: number;
  rows: Row[];
}

export default function ScheduleTable({ maxSlots, rows }: Props) {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th style={{ border: '1px solid #ccc', padding: 8, width: 120 }}>Time</th>
          {Array.from({ length: maxSlots }).map((_, i) => (
            <th key={i} style={{ border: '1px solid #ccc', padding: 8 }}>
              Slot {i + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const used = row.cells.reduce((sum, c) => sum + (c.colSpan || 1), 0);
          return (
            <tr key={idx}>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.time}</td>
              {row.cells.map((cell, i) => (
                <td
                  key={i}
                  colSpan={cell.colSpan}
                  onClick={cell.onClick}
                  style={{
                    border: '1px solid #ccc',
                    padding: 8,
                    textAlign: 'center',
                    backgroundColor: cell.backgroundColor,
                    cursor: cell.onClick ? 'pointer' : 'default',
                  }}
                >
                  {cell.content}
                </td>
              ))}
              {Array.from({ length: maxSlots - used }).map((_, i) => (
                <td key={`empty-${i}`} style={{ border: '1px solid #ccc', padding: 8 }} />
              ))}
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={maxSlots + 1} style={{ textAlign: 'center', padding: 8 }}>
              No bookings.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

