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
  total: number;
  [role: string]: number | string;
}

interface PersonalContributionChartProps {
  data: ContributionDatum[];
  roles: string[];
}

function roleColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}

export default function PersonalContributionChart({ data, roles }: PersonalContributionChartProps) {
  const theme = useTheme();
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="contribution-chart">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="total"
          name="Total Shifts"
          stroke={theme.palette.primary.main}
          strokeWidth={3}
          dot={false}
        />
        {roles.map(role => (
          <Line
            key={role}
            type="monotone"
            dataKey={role}
            name={role}
            stroke={roleColor(role)}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
