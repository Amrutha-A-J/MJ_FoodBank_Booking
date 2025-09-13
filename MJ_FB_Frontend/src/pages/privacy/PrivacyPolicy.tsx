import { Stack, Typography, Link } from '@mui/material';
import Page from '../../components/Page';
import ClientBottomNav from '../../components/ClientBottomNav';
import VolunteerBottomNav from '../../components/VolunteerBottomNav';
import { useAuth } from '../../hooks/useAuth';

export default function PrivacyPolicy() {
  const { role } = useAuth();
    return (
    <Page title={"Privacy Policy"}>
      <Stack spacing={2}>
        <Typography>{"Moose Jaw Food Bank collects personal information only to manage accounts and appointments."}</Typography>
        <Typography>{"We collect your name, contact information, family size, appointment and volunteer history, and any notes you provide. This information lets us manage bookings, coordinate services, communicate with you, and meet reporting requirements. Basic analytics help us improve the service."}</Typography>
        <Typography>{"We are committed to protecting your personal information in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA)."}</Typography>
        <Typography>{"If you believe that your personal information has been collected, used, or disclosed in a way that is inconsistent with this Privacy Policy or with PIPEDA requirements, you have the right to file a complaint."}</Typography>
        <Typography variant="h6">
          {"How to Submit a Complaint:"}
        </Typography>
        <Typography>{"You may contact our Privacy Officer in writing with details of your concern."}</Typography>
        <Typography>{"We will acknowledge receipt of your complaint within a reasonable timeframe and investigate promptly."}</Typography>
        <Typography>{"If the complaint is found to be justified, we will take appropriate corrective measures."}</Typography>
        <Typography>
          {"Contact Information:"}
          <br />
          {"Amrutha Adiyath"}
          <br />
          <Link href={`mailto:${"amrutha.laxman@mjfoodbank.org"}`}>
            {"amrutha.laxman@mjfoodbank.org"}
          </Link>
        </Typography>
      </Stack>
      {role === 'volunteer' ? <VolunteerBottomNav /> : <ClientBottomNav />}
    </Page>
  );
}
