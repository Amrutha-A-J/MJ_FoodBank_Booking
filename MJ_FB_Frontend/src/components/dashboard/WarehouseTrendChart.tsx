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
import type { CategoricalChartFunc } from 'recharts/types/chart/types';
import type { MouseHandlerDataParam } from 'recharts/types/synchronisation/types';

export interface WarehouseTrendPoint {
  month: string;
  incoming: number;
  outgoing: number;
}

type ChartState = MouseHandlerDataParam & {
  activePayload?: Array<{ payload?: unknown }>;
};

interface Props {
  data: WarehouseTrendPoint[];
  onPointSelect?: (point: WarehouseTrendPoint) => void;
}

export default function WarehouseTrendChart({ data, onPointSelect }: Props) {
  const theme = useTheme();
  const chartData =
    data.length === 1
      ? [...data, { month: '', incoming: 0, outgoing: 0 }]
      : data;

  const handleClick: CategoricalChartFunc = state => {
    if (!onPointSelect) return;
    const payload = (state as ChartState | undefined)?.activePayload?.[0]?.payload as
      | WarehouseTrendPoint
      | undefined;
    if (payload && payload.month) {
      onPointSelect(payload);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={300} data-testid="warehouse-trend-chart">
      <LineChart data={chartData} onClick={handleClick}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip trigger="click" />
        <Legend />
        <Line
          type="monotone"
          dataKey="incoming"
          name="Incoming"
          stroke={theme.palette.success.main}
          strokeWidth={2}
          dot={{ r: 4, cursor: 'pointer' }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="outgoing"
          name="Outgoing"
          stroke={theme.palette.error.main}
          strokeWidth={2}
          dot={{ r: 4, cursor: 'pointer' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
