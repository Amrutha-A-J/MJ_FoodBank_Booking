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
import type { MonetaryDonorMonthlySummary } from '../../api/monetaryDonorInsights';

interface ChartState extends MouseHandlerDataParam {
  activePayload?: Array<{ payload?: unknown }>;
}

interface Props {
  data: MonetaryDonorMonthlySummary[];
  onPointSelect?: (datum: MonetaryDonorMonthlySummary) => void;
}

export default function MonetaryDonationTrendChart({ data, onPointSelect }: Props) {
  const theme = useTheme();
  const chartData =
    data.length === 1
      ? [...data, { month: '', totalAmount: 0, donationCount: 0, donorCount: 0, averageGift: 0 }]
      : data;

  const handleClick: CategoricalChartFunc = state => {
    if (!onPointSelect) return;
    const payload = (state as ChartState | undefined)?.activePayload?.[0]?.payload as
      | MonetaryDonorMonthlySummary
      | undefined;
    if (payload) {
      onPointSelect(payload);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={300} data-testid="monetary-donation-trend-chart">
      <LineChart data={chartData} onClick={handleClick}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip trigger="click" />
        <Legend />
        <Line
          type="monotone"
          dataKey="totalAmount"
          name="Total donations"
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          dot={{ r: 4, cursor: 'pointer' }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="donationCount"
          name="Donations"
          stroke={theme.palette.success.main}
          strokeWidth={2}
          dot={{ r: 4, cursor: 'pointer' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
