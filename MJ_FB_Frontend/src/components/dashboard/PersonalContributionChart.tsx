import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface ContributionDatum {
  month: string;
  count: number;
}

interface PersonalContributionChartProps {
  data: ContributionDatum[];
}

export default function PersonalContributionChart({ data }: PersonalContributionChartProps) {
  const theme = useTheme();
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="contribution-chart">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="count" name="Shifts" stroke={theme.palette.primary.main} />
      </LineChart>
    </ResponsiveContainer>
  );
}
