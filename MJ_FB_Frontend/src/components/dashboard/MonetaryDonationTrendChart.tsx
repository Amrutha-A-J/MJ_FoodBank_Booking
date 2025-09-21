import { useTheme } from '@mui/material/styles';
import { format, parse } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { CategoricalChartFunc } from 'recharts/types/chart/types';
import type { MouseHandlerDataParam } from 'recharts/types/synchronisation/types';

export interface MonetaryDonationTrendDatum {
  month: string;
  amount: number;
  donationCount: number;
  donorCount: number;
  averageGift: number;
}

type ChartState = MouseHandlerDataParam & {
  activePayload?: Array<{ payload?: unknown }>;
};

interface ChartDatumWithLabel extends MonetaryDonationTrendDatum {
  monthLabel: string;
}

interface Props<T extends MonetaryDonationTrendDatum = MonetaryDonationTrendDatum> {
  data: T[];
  onPointSelect?: (datum: T) => void;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

function formatMonthLabel(month: string) {
  const parsed = parse(month, 'yyyy-MM', new Date());
  if (Number.isNaN(parsed.getTime())) {
    return month;
  }
  return format(parsed, 'MMM yyyy');
}

function buildChartData<T extends MonetaryDonationTrendDatum>(data: T[]): ChartDatumWithLabel[] {
  const chartData = data.map(datum => ({
    ...datum,
    monthLabel: formatMonthLabel(datum.month),
  }));

  if (chartData.length === 1) {
    const single = chartData[0];
    return [
      single,
      {
        ...single,
        month: '',
        monthLabel: '',
        amount: 0,
        donationCount: 0,
        donorCount: 0,
        averageGift: 0,
      },
    ];
  }

  return chartData;
}

function TrendTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const datum = payload[0]?.payload as ChartDatumWithLabel | undefined;

  if (!datum) return null;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        padding: '0.75rem',
        borderRadius: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <strong>{label}</strong>
      <div>Amount: {currencyFormatter.format(datum.amount)}</div>
      <div>Donations: {datum.donationCount}</div>
      <div>Donors: {datum.donorCount}</div>
      <div>Avg. Gift: {currencyFormatter.format(datum.averageGift)}</div>
    </div>
  );
}

export default function MonetaryDonationTrendChart<T extends MonetaryDonationTrendDatum>({
  data,
  onPointSelect,
}: Props<T>) {
  const theme = useTheme();
  const chartData = buildChartData(data);

  const handleClick: CategoricalChartFunc = state => {
    if (!onPointSelect) return;
    const payload = (state as ChartState | undefined)?.activePayload?.[0]?.payload as T | undefined;
    if (payload) {
      onPointSelect(payload);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={320} data-testid="monetary-donation-trend-chart">
      <LineChart data={chartData} onClick={handleClick}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="monthLabel" />
        <YAxis
          yAxisId="amount"
          tickFormatter={value => currencyFormatter.format(value as number)}
          width={90}
        />
        <YAxis yAxisId="count" orientation="right" allowDecimals={false} />
        <Tooltip content={<TrendTooltip />} />
        <Legend />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="amount"
          name="Amount"
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          yAxisId="amount"
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="averageGift"
          name="Average Gift"
          stroke={theme.palette.success.main}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          yAxisId="amount"
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="donationCount"
          name="Donations"
          stroke={theme.palette.info.main}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          yAxisId="count"
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="donorCount"
          name="Donors"
          stroke={theme.palette.warning.main}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          yAxisId="count"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
