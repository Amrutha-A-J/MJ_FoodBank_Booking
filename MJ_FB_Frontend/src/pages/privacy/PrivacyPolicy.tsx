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
        <Typography>{t('privacy_policy_page.intro')}</Typography>
        <Typography>{t('privacy_policy_page.data_collected')}</Typography>
        <Typography>{t('privacy_policy_page.pipeda')}</Typography>
        <Typography>{t('privacy_policy_page.complaint_right')}</Typography>
        <Typography variant="h6">
          {t('privacy_policy_page.complaint_how')}
        </Typography>
        <Typography>{t('privacy_policy_page.complaint_contact')}</Typography>
        <Typography>{t('privacy_policy_page.complaint_ack')}</Typography>
        <Typography>{t('privacy_policy_page.complaint_measures')}</Typography>
        <Typography>
          {t('privacy_policy_page.contact_heading')}
          <br />
          {t('privacy_policy_page.contact_name')}
          <br />
          <Link href={`mailto:${t('privacy_policy_page.contact_email')}`}>
            {t('privacy_policy_page.contact_email')}
          </Link>
        </Typography>
      </Stack>
      {role === 'volunteer' ? <VolunteerBottomNav /> : <ClientBottomNav />}
    </Page>
  );
}
