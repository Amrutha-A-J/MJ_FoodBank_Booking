import { Stack, Typography, Link } from '@mui/material';
import Page from '../../components/Page';
import ClientBottomNav from '../../components/ClientBottomNav';
import VolunteerBottomNav from '../../components/VolunteerBottomNav';
import { useAuth } from '../../hooks/useAuth';

export default function PrivacyPolicy() {
  const { role } = useAuth();
  return (
    <Page title="Privacy Policy">
      <Stack spacing={2}>
        <Typography>
          Moose Jaw Food Bank is committed to protecting your privacy. This policy
          explains how we collect, use, and safeguard personal information.
        </Typography>
        <Typography>
          We collect only the details needed to provide our services, such as your
          name, contact information, and appointment history.
        </Typography>
        <Typography>
          Our practices follow the Personal Information Protection and Electronic
          Documents Act (PIPEDA) and all applicable laws.
        </Typography>
        <Typography>
          You have the right to file a complaint if you believe your personal
          information has been misused.
        </Typography>
        <Typography variant="h6">How to file a complaint</Typography>
        <Typography>
          Send your complaint in writing to our Privacy Officer.
        </Typography>
        <Typography>
          We will acknowledge your complaint within ten business days.
        </Typography>
        <Typography>
          If the complaint is valid, we will take appropriate steps to resolve the
          issue.
        </Typography>
        <Typography>
          Contact Information
          <br />
          Privacy Officer, Moose Jaw Food Bank
          <br />
          <Link href="mailto:privacy@mjfoodbank.org">
            privacy@mjfoodbank.org
          </Link>
        </Typography>
      </Stack>
      {role === 'volunteer' ? <VolunteerBottomNav /> : <ClientBottomNav />}
    </Page>
  );
}
