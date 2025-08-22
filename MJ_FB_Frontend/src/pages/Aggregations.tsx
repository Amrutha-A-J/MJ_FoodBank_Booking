import { useState, useEffect } from 'react';
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
} from '@mui/material';
import Page from '../components/Page';
import { getDonorAggregations, type DonorAggregation } from '../api/donations';

export default function Aggregations() {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<DonorAggregation[]>([]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (tab !== 0) return;
    setRows([]);
    getDonorAggregations(year)
      .then(setRows)
      .catch(() => setRows([]));
  }, [tab, year]);

  const donors = Array.from(new Set(rows.map(r => r.donor))).sort((a, b) => a.localeCompare(b));
  const months = Array.from(new Set(rows.map(r => r.month))).sort();

  return (
    <Page title="Aggregations">
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Donor Aggregations" />
        <Tab label="Retail Program" />
        <Tab label="Overall" />
      </Tabs>
      {tab === 0 && (
        <>
          <FormControl size="small" sx={{ mb: 2, minWidth: 120 }}>
            <InputLabel id="year-label">Year</InputLabel>
            <Select
              labelId="year-label"
              label="Year"
              value={year}
              onChange={e => {
                setYear(Number(e.target.value));
                setRows([]);
              }}
            >
              {years.map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                {donors.map(d => (
                  <TableCell key={d} align="right">
                    {d}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={donors.length + 1} align="center">
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                months.map(m => (
                  <TableRow key={m}>
                    <TableCell>{m}</TableCell>
                    {donors.map(d => (
                      <TableCell key={d} align="right">
                        {rows.find(r => r.month === m && r.donor === d)?.total || 0}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
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
