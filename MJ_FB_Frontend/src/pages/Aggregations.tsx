import { useState, useEffect, useRef } from 'react';
import {
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
  CircularProgress,
} from '@mui/material';
import Page from '../components/Page';
import { getDonorAggregations, type DonorAggregation } from '../api/donations';
import { exportTableToExcel } from '../utils/exportTableToExcel';

export default function Aggregations() {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<DonorAggregation[]>([]);
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleExport = () => {
    if (tableRef.current) {
      exportTableToExcel(tableRef.current, `donor_aggregations_${year}`);
    }
  };

  useEffect(() => {
    if (tab !== 0) return;
    setLoading(true);
    setRows([]);
    getDonorAggregations(year)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tab, year]);

  const donors = Array.from(new Set(rows.map(r => r.donor))).sort((a, b) =>
    a.localeCompare(b)
  );
  const months = Array.from(new Set(rows.map(r => r.month))).sort();

  const dataMap = rows.reduce((acc, r) => {
    acc[r.donor] = acc[r.donor] || {};
    acc[r.donor][r.month] = r.total;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const totalsByDonor = donors.reduce((acc, d) => {
    acc[d] = months.reduce((sum, m) => sum + (dataMap[d]?.[m] || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalsByMonth = months.reduce((acc, m) => {
    acc[m] = donors.reduce((sum, d) => sum + (dataMap[d]?.[m] || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const yearTotal = Object.values(totalsByMonth).reduce((sum, t) => sum + t, 0);

  return (
    <Page title="Aggregations">
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Donor Aggregations" />
        <Tab label="Retail Program" />
        <Tab label="Overall" />
      </Tabs>
      {tab === 0 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="year-label">Year</InputLabel>
              <Select
                labelId="year-label"
                label="Year"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              >
                {years.map(y => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button size="small" variant="contained" onClick={handleExport}>
              Export
            </Button>
          </Stack>
          <Table size="small" ref={tableRef}>
            <TableHead>
              <TableRow>
                <TableCell>Donor</TableCell>
                {months.map(m => (
                  <TableCell key={m} align="right">
                    {m}
                  </TableCell>
                ))}
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={months.length + 2} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={months.length + 2} align="center">
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {donors.map(d => (
                    <TableRow key={d}>
                      <TableCell>{d}</TableCell>
                      {months.map(m => (
                        <TableCell key={m} align="right">
                          {dataMap[d]?.[m] || 0}
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {totalsByDonor[d] || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                    {months.map(m => (
                      <TableCell key={m} align="right" sx={{ fontWeight: 'bold' }}>
                        {totalsByMonth[m] || 0}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {yearTotal}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </>
      )}
      {tab === 1 && null}
      {tab === 2 && null}
    </Page>
  );
}
