import { Stack, Typography, Link } from '@mui/material';
import Page from '../../components/Page';
import ClientBottomNav from '../../components/ClientBottomNav';
import VolunteerBottomNav from '../../components/VolunteerBottomNav';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { role } = useAuth();
  const { t } = useTranslation();
  return (
    <Page title={t('privacy_policy')}>
      <Stack spacing={2}>
        <Typography>
          Moose Jaw Food Bank collects personal information only to manage accounts and
          appointments. We do not share your information with third parties except as
          required by law. Basic analytics help improve the service.
        </Typography>
        <Typography>
          To request deletion of your account or for any privacy questions, contact
          Amrutha Adiyath at{' '}
          <Link href="mailto:amrutha.laxman@mjfoodbank.org">
            amrutha.laxman@mjfoodbank.org
          </Link>
          .
        </Typography>
      </Stack>
      {role === 'volunteer' ? <VolunteerBottomNav /> : <ClientBottomNav />}
    </Page>
  );
}
