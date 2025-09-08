import {
  Box,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { ReactNode, Ref } from 'react';

export interface Column<T extends object> {
  /** Unique field identifier */
  field: keyof T & string;
  /** Header label */
  header: string;
  /** Optional renderer for cell/field content */
  render?: (row: T) => ReactNode;
}

interface Props<T extends object> {
  columns: Column<T>[];
  rows: T[];
  /** Returns a unique key for each row */
  getRowKey?: (row: T, index: number) => React.Key;
  /** Optional ref to the underlying table element */
  tableRef?: Ref<HTMLTableElement>;
}

export default function ResponsiveTable<T extends object>({
  columns,
  rows,
  getRowKey,
  tableRef,
}: Props<T>) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const rowKey = (row: T, index: number) =>
    getRowKey ? getRowKey(row, index) : index;

  if (isSmall) {
    return (
      <>
        {rows.map((row, rowIndex) => (
          <Card key={rowKey(row, rowIndex)} sx={{ mb: 2 }} data-testid="responsive-table-card">
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {columns.map((col) => (
                <Stack key={col.field} direction="row" spacing={1}>
                  <Typography variant="subtitle2">{col.header}</Typography>
                  <Box sx={{ flex: 1 }}>
                    {col.render
                      ? col.render(row)
                      : ((row?.[col.field] ?? '') as ReactNode)}
                  </Box>
                </Stack>
              ))}
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <Table size="small" data-testid="responsive-table-table" ref={tableRef}>
      <TableHead>
        <TableRow>
          {columns.map((col) => (
            <TableCell key={col.field}>{col.header}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow key={rowKey(row, rowIndex)}>
            {columns.map((col) => (
              <TableCell key={col.field}>
                {col.render
                  ? col.render(row)
                  : ((row?.[col.field] ?? '') as ReactNode)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

