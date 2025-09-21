import { alpha, useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import type { LabelProps } from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';

export interface MonetaryGivingTierDatum {
  tierLabel: string;
  donorCount: number;
  amount: number;
  deltaFromPreviousMonth?: number;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

function TierTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const datum = payload[0]?.payload as MonetaryGivingTierDatum | undefined;

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
      <div>Donors: {datum.donorCount}</div>
      {typeof datum.deltaFromPreviousMonth === 'number' && (
        <div>
          Change: {datum.deltaFromPreviousMonth > 0 ? '+' : ''}
          {datum.deltaFromPreviousMonth}
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ value, x = 0, y = 0, width = 0, height = 0 }: LabelProps) {
  if (typeof value !== 'number') {
    return null;
  }

  const theme = useTheme();
  const fill =
    value > 0
      ? theme.palette.success.main
      : value < 0
        ? theme.palette.error.main
        : theme.palette.info.main;

  const badgeText = `${value > 0 ? '+' : ''}${value}`;
  const badgeWidth = badgeText.length * 7 + 20;
  const badgeHeight = 22;
  const numericX = typeof x === 'number' ? x : parseFloat(x ?? '0');
  const numericY = typeof y === 'number' ? y : parseFloat(y ?? '0');
  const numericWidth = typeof width === 'number' ? width : parseFloat(width ?? '0');
  const numericHeight = typeof height === 'number' ? height : parseFloat(height ?? '0');
  const badgeX = numericX + numericWidth + 12;
  const badgeY = numericY + (numericHeight ? numericHeight / 2 - badgeHeight / 2 : -badgeHeight / 2);

  return (
    <g>
      <rect
        x={badgeX}
        y={badgeY}
        width={badgeWidth}
        height={badgeHeight}
        rx={badgeHeight / 2}
        ry={badgeHeight / 2}
        fill={alpha(fill, 0.12)}
        stroke={fill}
      />
      <text
        x={badgeX + badgeWidth / 2}
        y={badgeY + badgeHeight / 2 + 4}
        fill={fill}
        fontSize={12}
        fontWeight={600}
        textAnchor="middle"
      >
        {badgeText}
      </text>
    </g>
  );
}

export default function MonetaryGivingTierChart({ data }: { data: MonetaryGivingTierDatum[] }) {
  const theme = useTheme();

  return (
    <ResponsiveContainer width="100%" height={320} data-testid="monetary-giving-tier-chart">
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 48 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={value => currencyFormatter.format(value as number)} />
        <YAxis type="category" dataKey="tierLabel" width={140} />
        <Tooltip content={<TierTooltip />} />
        <Legend />
        <Bar
          isAnimationActive={false}
          dataKey="amount"
          name="Amount"
          fill={theme.palette.primary.main}
          radius={[0, 8, 8, 0]}
        >
          <LabelList
            dataKey="donorCount"
            position="insideLeft"
            offset={12}
            formatter={value => `${value} donors`}
            fill="#fff"
          />
          <LabelList dataKey="deltaFromPreviousMonth" content={props => <DeltaBadge {...props} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
