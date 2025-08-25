import Dashboard, { type DashboardProps } from '../components/dashboard/Dashboard';

export default function DashboardPage(props: DashboardProps) {
  return <Dashboard {...props} />;
}

export { type DashboardProps };
