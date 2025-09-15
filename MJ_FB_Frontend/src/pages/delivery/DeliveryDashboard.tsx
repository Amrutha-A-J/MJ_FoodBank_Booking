import { Button, Grid, Stack, Typography } from '@mui/material';
import LocalShipping from '@mui/icons-material/LocalShipping';
import History from '@mui/icons-material/History';
import Info from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import SectionCard from '../../components/dashboard/SectionCard';
import Page from '../../components/Page';
import ClientBottomNav from '../../components/ClientBottomNav';

export default function DeliveryDashboard() {
  const navigate = useNavigate();

  return (
    <Page title="Delivery Dashboard">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard
              title="Request a delivery"
              icon={<LocalShipping color="primary" />}
            >
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  Tell us what you need and we will arrange a delivery with you.
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Button
                    variant="contained"
                    size="medium"
                    sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                    onClick={() => navigate('/delivery/book')}
                  >
                    Book a delivery
                  </Button>
                  <Button
                    variant="outlined"
                    size="medium"
                    sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                    onClick={() => navigate('/delivery/history')}
                  >
                    View history
                  </Button>
                </Stack>
              </Stack>
            </SectionCard>
            <SectionCard
              title="Track your requests"
              icon={<History color="primary" />}
            >
              <Stack spacing={1.5}>
                <Typography color="text.secondary">
                  Review every order, see scheduled dates, and double-check what you requested.
                </Typography>
                <Button
                  variant="text"
                  size="medium"
                  sx={{
                    textTransform: 'none',
                    alignSelf: { xs: 'stretch', sm: 'flex-start' },
                  }}
                  onClick={() => navigate('/delivery/history')}
                >
                  Go to delivery history
                </Button>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard
              title="Helpful reminders"
              icon={<Info color="primary" />}
            >
              <Stack component="ul" spacing={1.5} sx={{ pl: 2, m: 0 }}>
                <Typography component="li" color="text.secondary">
                  Keep your address, phone, and email up to date so we can reach you quickly.
                </Typography>
                <Typography component="li" color="text.secondary">
                  Submit one request at a time—place a new order after we finish the current one.
                </Typography>
                <Typography component="li" color="text.secondary">
                  Contact the food bank if you need to change or cancel a request after submitting it.
                </Typography>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
      <ClientBottomNav />
    </Page>
  );
}
