import { Grid, Card, CardHeader, CardContent } from '@mui/material';

export default function DonorSearch() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
          <CardHeader title="Donor Search" />
          <CardContent>{/* Placeholder for donor search */}</CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
