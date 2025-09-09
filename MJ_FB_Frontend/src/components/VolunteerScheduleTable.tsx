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
  ButtonBase,
} from '@mui/material';
import type { ReactNode } from 'react';
import i18n from '../i18n';

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
}

export default function VolunteerScheduleTable({ maxSlots, rows }: Props) {
  const safeMaxSlots = Math.max(1, maxSlots);
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const timeColumnWidth = isSmall ? 100 : 160;
  const slotWidth = `calc((100% - ${timeColumnWidth}px) / ${safeMaxSlots})`;
  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%' }}>
        <Table
          stickyHeader={false}
          sx={{
            tableLayout: 'fixed',
            width: '100%',
            '& .MuiTableCell-root': {
              p: isSmall ? 1 : 1.5,
              fontSize: isSmall ? '0.875rem' : 'inherit',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
            '& tbody tr:hover': {
              backgroundColor: 'inherit',
            },
          }}
        >
        <colgroup>
          <col style={{ width: timeColumnWidth }} />
          {Array.from({ length: safeMaxSlots }).map((_, i) => (
            <col key={i} style={{ width: slotWidth }} />
          ))}
        </colgroup>
        <TableHead
          sx={{
            '& .MuiTableCell-head': {
              position: 'static',
              top: 'auto',
              zIndex: 'auto',
            },
          }}
        >
          <TableRow>
            <TableCell>Time</TableCell>
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
                    sx={{
                      textAlign: 'center',
                      backgroundColor: cell.backgroundColor,
                      p: cell.onClick ? 0 : undefined,
                    }}
                  >
                    {cell.onClick ? (
                      <ButtonBase
                        onClick={cell.onClick}
                        sx={{
                          width: '100%',
                          height: '100%',
                          p: isSmall ? 1 : 1.5,
                          display: 'block',
                        }}
                      >
                        {cell.content ?? i18n.t('sign_up')}
                      </ButtonBase>
                    ) : (
                      cell.content
                    )}
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

