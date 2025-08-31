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
import { ReactNode } from 'react';
import InfoTooltip from './InfoTooltip';
import { useTranslation } from 'react-i18next';

interface Cell {
  content: ReactNode;
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
  legend?: ReactNode;
}

export default function VolunteerScheduleTable({ maxSlots, rows, legend }: Props) {
  const safeMaxSlots = Math.max(1, maxSlots);
  const slotWidth = `calc((100% - 160px) / ${safeMaxSlots})`;
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();
  const legendText = legend ?? t('tooltip_schedule_legend');
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
          {Array.from({ length: safeMaxSlots }).map((_, i) => (
            <col key={i} style={{ width: slotWidth }} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell>
              Time
              <InfoTooltip title={legendText} sx={{ ml: 0.5 }} />
            </TableCell>
            {Array.from({ length: safeMaxSlots }).map((_, i) => (
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
                {Array.from({ length: safeMaxSlots - used }).map((_, i) => (
                  <TableCell key={`empty-${i}`} />
                ))}
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={safeMaxSlots + 1} align="center">
                No bookings.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

