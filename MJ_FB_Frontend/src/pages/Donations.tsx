import { Grid, Card, CardHeader, CardContent } from '@mui/material';

export default function Donations() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
          <CardHeader title="Monetary Donations" />
          <CardContent>{/* Placeholder for donations */}</CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
