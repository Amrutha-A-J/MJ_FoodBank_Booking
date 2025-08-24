import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  useMediaQuery,
  useTheme,
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
  const slotWidth = `calc((100% - 160px) / ${maxSlots})`;
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table
        size="small"
        sx={{
          tableLayout: 'fixed',
          width: '100%',
          '& .MuiTableCell-root': {
            p: isSmall ? 0.5 : 1,
            fontSize: isSmall ? '0.75rem' : 'inherit',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      >
        <colgroup>
          <col style={{ width: 160 }} />
          {Array.from({ length: maxSlots }).map((_, i) => (
            <col key={i} style={{ width: slotWidth }} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
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
                      cursor: cell.onClick ? 'pointer' : 'default',
                      backgroundColor: cell.backgroundColor,
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

