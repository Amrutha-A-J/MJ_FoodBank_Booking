import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from 'recharts';
import type { VisitStat } from '../../api/clientVisits';

interface Props {
  data: VisitStat[];
}

export default function ClientVisitTrendChart({ data }: Props) {
  const theme = useTheme();
  const chartData =
    data.length === 1
      ? [...data, { month: '', clients: 0, adults: 0, children: 0 }]
      : data;
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="visit-trend-chart">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis allowDecimals={false} />
        <Tooltip trigger="click" />
        <Legend />
        <Line
          type="monotone"
          dataKey="clients"
          stroke={theme.palette.error.main}
          strokeWidth={2}
          dot={{ r: 4, cursor: 'pointer' }}
          name="Total"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
