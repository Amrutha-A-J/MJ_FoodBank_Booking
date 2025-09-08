import { Card, CardContent, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, useMediaQuery, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

interface Column<T> {
  /** Unique field identifier */
  field: keyof T & string;
  /** Header label */
  header: string;
  /** Optional renderer for cell/field content */
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  /** Returns a unique key for each row */
  getRowKey?: (row: T, index: number) => React.Key;
  /** Called when a row/card is clicked */
  onRowClick?: (row: T) => void;
}

export default function ResponsiveTable<T>({ columns, rows, getRowKey, onRowClick }: Props<T>) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const rowKey = (row: T, index: number) =>
    getRowKey ? getRowKey(row, index) : index;

  if (isSmall) {
    return (
      <>
        {rows.map((row, rowIndex) => (
          <Card
            key={rowKey(row, rowIndex)}
            sx={{ mb: 2, cursor: onRowClick ? 'pointer' : undefined }}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            data-testid="responsive-table-card"
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {columns.map((col) => (
                <Stack key={col.field} direction="row" spacing={1}>
                  <Typography variant="subtitle2">{col.header}</Typography>
                  <Typography sx={{ flex: 1 }}>
                    {col.render ? col.render(row) : String(row[col.field])}
                  </Typography>
                </Stack>
              ))}
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <Table size="small" data-testid="responsive-table-table">
      <TableHead>
        <TableRow>
          {columns.map((col) => (
            <TableCell key={col.field}>{col.header}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow
            key={rowKey(row, rowIndex)}
            hover={!!onRowClick}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            sx={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {columns.map((col) => (
              <TableCell key={col.field}>
                {col.render ? col.render(row) : (row as any)[col.field]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

