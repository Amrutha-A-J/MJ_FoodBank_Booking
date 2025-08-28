import Dashboard, { type DashboardProps } from '../components/dashboard/Dashboard';
import Page from '../components/Page';

export default function DashboardPage(props: DashboardProps) {
  return (
    <Page title="Dashboard">
      <Dashboard {...props} masterRoleFilter={['Pantry']} />
    </Page>
  );
}

export { type DashboardProps };
