import { Stack, Typography, Link } from '@mui/material';
import Page from '../../components/Page';
import ClientBottomNav from '../../components/ClientBottomNav';
import VolunteerBottomNav from '../../components/VolunteerBottomNav';
import { useAuth } from '../../hooks/useAuth';

export default function PrivacyPolicy() {
  const { role, isAuthenticated } = useAuth();
  return (
    <Page
      title="Privacy Policy – Harvest Pantry Booking App"
      sx={{ pb: { xs: 'calc(72px + env(safe-area-inset-bottom))' } }}
    >
      <Stack spacing={2}>
        <Typography>Last updated: September 13, 2025</Typography>

        <Typography variant="h6">1. Purpose</Typography>
        <Typography>
          This Privacy Policy explains how the Moose Jaw & District Food Bank (
          "we," "our," "us") collects, uses, and protects your personal
          information when you use our Harvest Pantry booking app (the "App").
          The App is provided to make booking appointments easier for clients
          already registered in the Link2Feed system.
        </Typography>

        <Typography variant="h6">2. Consent</Typography>
        <Typography>
          When you first registered to use the Food Bank, you gave consent
          through the Link2Feed system for us to collect and use your
          information in order to provide food bank services. The App does not
          collect any new categories of personal information beyond what is
          necessary for booking and managing your visits.
        </Typography>

        <Typography variant="h6">3. Information We Collect</Typography>
        <Typography>Through the booking app, we collect and store:</Typography>
        <Typography component="ul" sx={{ pl: 2, listStyleType: 'disc' }}>
          <li>First and last name (primary account holder)</li>
          <li>Email address</li>
          <li>Phone number (optional)</li>
          <li>
            Visit history (used only to calculate eligibility, since clients
            may use the Food Bank a maximum of 2 times per month)
          </li>
        </Typography>
        <Typography>
          We do not collect sensitive information (such as financial, health,
          or immigration details) through this app.
        </Typography>

        <Typography variant="h6">4. How We Use Your Information</Typography>
        <Typography>Your information is used only to:</Typography>
        <Typography component="ul" sx={{ pl: 2, listStyleType: 'disc' }}>
          <li>Allow you to create and manage bookings</li>
          <li>Verify your eligibility for visits (up to 2 times per month)</li>
          <li>Communicate important information (e.g., booking confirmations, service updates)</li>
          <li>Improve service delivery and reporting</li>
        </Typography>
        <Typography>We do not sell, rent, or share your information with third parties.</Typography>

        <Typography variant="h6">5. Data Storage and Security</Typography>
        <Typography>
          Your personal information is stored securely and access is restricted
          to authorized staff and volunteers who need it to provide service. We
          use reasonable safeguards (technical, organizational, and
          administrative) to protect your information against loss, theft,
          unauthorized access, or disclosure.
        </Typography>

        <Typography variant="h6">6. Sharing of Information</Typography>
        <Typography>
          Your data may be shared internally with the Link2Feed system to
          ensure consistency of records, but is never shared externally unless
          required by law.
        </Typography>

        <Typography variant="h6">7. Retention of Information</Typography>
        <Typography>
          We retain your information only as long as necessary to provide food
          bank services and comply with legal or reporting obligations.
        </Typography>

        <Typography variant="h6">8. Your Rights</Typography>
        <Typography>You have the right to:</Typography>
        <Typography component="ul" sx={{ pl: 2, listStyleType: 'disc' }}>
          <li>Access the information we hold about you</li>
          <li>Request corrections to inaccurate or incomplete information</li>
          <li>Withdraw your consent for optional contact methods (such as phone or email)</li>
        </Typography>
        <Typography>
          Requests can be made to the Privacy Officer listed below.
        </Typography>

        <Typography variant="h6">9. Privacy Officer</Typography>
        <Typography>
          If you have questions, concerns, or complaints about how your
          information is handled, please contact:
          <br />
          Privacy Officer: Amrutha Adiyath
          <br />
          Email:{' '}
          <Link href="mailto:amrutha.laxman@mjfoodbank.org">
            amrutha.laxman@mjfoodbank.org
          </Link>
        </Typography>
      </Stack>
      {isAuthenticated &&
        (role === 'volunteer' ? <VolunteerBottomNav /> : <ClientBottomNav />)}
    </Page>
  );
}
