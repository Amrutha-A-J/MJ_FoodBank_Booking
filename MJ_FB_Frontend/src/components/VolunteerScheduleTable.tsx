import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material';

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

export default function VolunteerScheduleTable({ maxSlots, rows }: Props) {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 160 }}>Time</TableCell>
            {Array.from({ length: maxSlots }).map((_, i) => (
              <TableCell key={i}>Slot {i + 1}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => {
            const used = row.cells.reduce((sum, c) => sum + (c.colSpan || 1), 0);
            return (
              <TableRow key={idx}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.time}</TableCell>
                {row.cells.map((cell, i) => (
                  <TableCell
                    key={i}
                    colSpan={cell.colSpan}
                    onClick={cell.onClick}
                    sx={{
                      textAlign: 'center',
                      backgroundColor: cell.backgroundColor,
                      cursor: cell.onClick ? 'pointer' : 'default',
                    }}
                  >
                    {cell.content}
                  </TableCell>
                ))}
                {Array.from({ length: maxSlots - used }).map((_, i) => (
                  <TableCell key={`empty-${i}`} />
                ))}
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={maxSlots + 1} align="center">
                No bookings.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

