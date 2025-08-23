import { Grid, Card, CardContent, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Page from '../components/Page';

export default function WarehouseDashboard() {
  return (
    <Page title="Warehouse Dashboard">
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Donation Log
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Record incoming donations and details.
              </Typography>
              <Button
                size="small"
                variant="contained"
                component={RouterLink}
                to="/warehouse-management/donation-log"
              >
                Open
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Track Pigpound
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Monitor pig pound donations.
              </Typography>
              <Button
                size="small"
                variant="contained"
                component={RouterLink}
                to="/warehouse-management/track-pigpound"
              >
                Open
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Track Outgoing Donations
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Log donations sent out from the warehouse.
              </Typography>
              <Button
                size="small"
                variant="contained"
                component={RouterLink}
                to="/warehouse-management/track-outgoing-donations"
              >
                Open
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Track Surplus
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Manage surplus inventory items.
              </Typography>
              <Button
                size="small"
                variant="contained"
                component={RouterLink}
                to="/warehouse-management/track-surplus"
              >
                Open
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Aggregations
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                View yearly donation aggregates.
              </Typography>
              <Button
                size="small"
                variant="contained"
                component={RouterLink}
                to="/warehouse-management/aggregations"
              >
                Open
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Page>
  );
}
