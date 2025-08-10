import VolunteerSchedule from './VolunteerSchedule';
import Page from './Page';

export default function VolunteerDashboard({ token }: { token: string }) {
  return (
    <Page title="Volunteer Dashboard">
      <VolunteerSchedule token={token} />
    </Page>
  );
}

