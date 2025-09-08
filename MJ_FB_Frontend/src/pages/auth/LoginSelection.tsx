import { Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Page from '../../components/Page';
import { useTranslation } from 'react-i18next';

export default function LoginSelection() {
  const { t } = useTranslation();
  return (
    <Page title={t('login')}>
      <Stack spacing={2} alignItems="flex-start">
        <Button component={RouterLink} to="/login/user" variant="contained" size="small">
          {t('client_login')}
        </Button>
        <Button component={RouterLink} to="/login/volunteer" variant="contained" size="small">
          {t('volunteer_login')}
        </Button>
        <Button component={RouterLink} to="/login/staff" variant="contained" size="small">
          {t('staff_login')}
        </Button>
        <Button component={RouterLink} to="/login/agency" variant="contained" size="small">
          {t('agency_login')}
        </Button>
      </Stack>
    </Page>
  );
}
