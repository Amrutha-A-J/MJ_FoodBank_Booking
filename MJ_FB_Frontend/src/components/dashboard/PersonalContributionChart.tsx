import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Shifts" fill={theme.palette.primary.main} />
      </BarChart>
    </ResponsiveContainer>
  );
}
