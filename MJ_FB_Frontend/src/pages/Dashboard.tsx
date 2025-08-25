import Dashboard, { type DashboardProps } from '../components/dashboard/Dashboard';

export default function DashboardPage(props: DashboardProps) {
  return <Dashboard masterRoleFilter={['Pantry']} {...props} />;
}

export { type DashboardProps };
