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
import type { CategoricalChartState } from 'recharts/types/chart/generateCategoricalChart';

interface Props {
  data: VisitStat[];
  onPointSelect?: (stat: VisitStat) => void;
}

export default function ClientVisitTrendChart({ data, onPointSelect }: Props) {
  const theme = useTheme();
  const chartData =
    data.length === 1
      ? [...data, { month: '', clients: 0, adults: 0, children: 0 }]
      : data;

  const handleClick = (state: CategoricalChartState | undefined) => {
    if (!onPointSelect) return;
    const payload = state?.activePayload?.[0]?.payload as VisitStat | undefined;
    if (payload) {
      onPointSelect(payload);
    }
  };
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="visit-trend-chart">
      <LineChart data={chartData} onClick={handleClick}>
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
