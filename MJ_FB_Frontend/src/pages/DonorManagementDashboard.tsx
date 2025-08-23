import { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import {
  getDonorAggregations,
  type DonorAggregation,
} from '../api/donations';

export default function DonorManagementDashboard() {
  const [aggregations, setAggregations] = useState<DonorAggregation[]>([]);

  useEffect(() => {
    getDonorAggregations(new Date().getFullYear())
      .then(setAggregations)
      .catch(() => {});
  }, []);

  const totalWeight = aggregations.reduce((sum, a) => sum + a.total, 0);
  const donorTotals: Record<string, number> = {};
  aggregations.forEach((a) => {
    donorTotals[a.donor] = (donorTotals[a.donor] ?? 0) + a.total;
  });
  const donors = Object.keys(donorTotals);
  const averageDonation = donors.length
    ? Math.round(totalWeight / donors.length)
    : 0;
  const topDonors = Object.entries(donorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const monthlyTotals: Record<string, number> = {};
  aggregations.forEach((a) => {
    monthlyTotals[a.month] = (monthlyTotals[a.month] ?? 0) + a.total;
  });

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
          <CardHeader title="Summary" />
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Total Donors
            </Typography>
            <Typography variant="h6">{donors.length}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2 }}
            >
              Total Donations
            </Typography>
            <Typography variant="h6">{totalWeight} lbs</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2 }}
            >
              Avg per Donor
            </Typography>
            <Typography variant="h6">{averageDonation} lbs</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
          <CardHeader title="Top Donors" />
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Donor</TableCell>
                  <TableCell align="right">Total (lbs)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topDonors.map(([donor, total]) => (
                  <TableRow key={donor}>
                    <TableCell>{donor}</TableCell>
                    <TableCell align="right">{total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
          <CardHeader title="Monthly Donations" />
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell align="right">Total (lbs)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(monthlyTotals)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, total]) => (
                  <TableRow key={month}>
                    <TableCell>{month}</TableCell>
                    <TableCell align="right">{total}</TableCell>
                  </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

