import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

export interface WarehouseCompositionDatum {
  month: string;
  donations: number;
  surplus: number;
  pigPound: number;
  petFood: number;
  outgoing: number;
}

export interface WarehouseCompositionChartProps {
  data: WarehouseCompositionDatum[];
  onBarClick?: (data: { payload?: WarehouseCompositionDatum } | undefined) => void;
}

export default function WarehouseCompositionChart({ data, onBarClick }: WarehouseCompositionChartProps) {
  const theme = useTheme();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Legend />
        <Bar
          dataKey="donations"
          name="Donations"
          stackId="a"
          fill={theme.palette.primary.main}
          onClick={onBarClick}
        />
        <Bar
          dataKey="surplus"
          name="Surplus"
          stackId="a"
          fill={theme.palette.warning.main}
          onClick={onBarClick}
        />
        <Bar
          dataKey="pigPound"
          name="Pig Pound"
          stackId="a"
          fill={theme.palette.info.main}
          onClick={onBarClick}
        />
        <Bar
          dataKey="petFood"
          name="Pet Food"
          stackId="a"
          fill={theme.palette.secondary.main}
          onClick={onBarClick}
        />
        <Bar
          dataKey="outgoing"
          name="Outgoing"
          stackId="a"
          fill={theme.palette.error.main}
          onClick={onBarClick}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
