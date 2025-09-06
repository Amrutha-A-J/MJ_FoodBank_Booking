import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { VisitStat } from '../../api/clientVisits';

interface Props {
  data: VisitStat[];
}

export default function ClientVisitTrendChart({ data }: Props) {
  const theme = useTheme();
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="visit-trend-chart">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          dot={false}
          name="Total"
        />
        <Line
          type="monotone"
          dataKey="adults"
          stroke={theme.palette.info.main}
          strokeWidth={2}
          dot={false}
          name="Adults"
        />
        <Line
          type="monotone"
          dataKey="children"
          stroke={theme.palette.success.main}
          strokeWidth={2}
          dot={false}
          name="Children"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
