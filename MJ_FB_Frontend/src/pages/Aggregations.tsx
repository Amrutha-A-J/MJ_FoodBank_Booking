import { useState, useEffect } from 'react';
import { Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import Page from '../components/Page';
import { getDonorAggregations, type DonorAggregation } from '../api/donations';

export default function Aggregations() {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<DonorAggregation[]>([]);

  useEffect(() => {
    if (tab !== 0) return;
    getDonorAggregations()
      .then(setRows)
      .catch(() => setRows([]));
  }, [tab]);

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
            {months.map(m => (
              <TableRow key={m}>
                <TableCell>{m}</TableCell>
                {donors.map(d => (
                  <TableCell key={d} align="right">
                    {rows.find(r => r.month === m && r.donor === d)?.total || 0}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {tab === 1 && null}
      {tab === 2 && null}
    </Page>
  );
}
