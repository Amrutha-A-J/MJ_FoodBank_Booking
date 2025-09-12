import { Typography, Link } from '@mui/material';
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
      <Typography paragraph>
        We collect only the personal information we need to manage your account and bookings. Your data stays with Moose Jaw Food Bank and is never sold or shared.
      </Typography>
      <Typography paragraph>
        To delete your account, email Amrutha Adiyath at{' '}
        <Link href="mailto:amrutha.laxman@mjfoodbank.org">amrutha.laxman@mjfoodbank.org</Link>.
      </Typography>
      {role === 'shopper' ? <ClientBottomNav /> : role === 'volunteer' ? <VolunteerBottomNav /> : null}
    </Page>
  );
}
