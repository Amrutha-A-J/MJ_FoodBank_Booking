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

export interface WarehouseTrendDatum {
  month: string;
  incoming: number;
  outgoing: number;
  petFood: number;
}

type ChartState = MouseHandlerDataParam & {
  activePayload?: Array<{ payload?: unknown }>;
};

interface Props<T extends WarehouseTrendDatum> {
  data: T[];
  onPointSelect?: (datum: T) => void;
}

export default function WarehouseTrendChart<T extends WarehouseTrendDatum>({
  data,
  onPointSelect,
}: Props<T>) {
  const theme = useTheme();
  const chartData =
    data.length === 1
      ? [...data, { month: '', incoming: 0, outgoing: 0, petFood: 0 } as T]
      : data;

  const handleClick: CategoricalChartFunc = state => {
    if (!onPointSelect) return;
    const payload = (state as ChartState | undefined)?.activePayload?.[0]?.payload as T | undefined;
    if (payload) {
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
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="outgoing"
          name="Outgoing"
          stroke={theme.palette.error.main}
          strokeWidth={2}
          dot={{ r: 4, cursor: 'pointer' }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="petFood"
          name="Pet Food"
          stroke={theme.palette.secondary.main}
          strokeWidth={2}
          dot={{ r: 4, cursor: 'pointer' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
