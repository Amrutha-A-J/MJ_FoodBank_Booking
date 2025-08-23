import { Grid, Card, CardHeader, CardContent } from '@mui/material';

export default function DonorManagementDashboard() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
          <CardHeader title="Donor Management Dashboard" />
          <CardContent>{/* Placeholder for dashboard content */}</CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
