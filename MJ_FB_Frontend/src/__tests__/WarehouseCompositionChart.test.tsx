import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import WarehouseCompositionChart, {
  type WarehouseCompositionDatum,
} from '../components/dashboard/WarehouseCompositionChart';
import { theme } from '../theme';
import type { ReactNode } from 'react';

const capturedBars: Array<Record<string, unknown>> = [];

jest.mock('recharts', () => {
  const React = require('react');
  const ChartContext = React.createContext<WarehouseCompositionDatum[]>([]);

  function ResponsiveContainer({ children }: { children: ReactNode }) {
    return <div data-testid="responsive-container">{children}</div>;
  }

  function BarChart({ children, data }: { children: ReactNode; data: WarehouseCompositionDatum[] }) {
    return (
      <ChartContext.Provider value={data}>
        <div data-testid="bar-chart">{children}</div>
      </ChartContext.Provider>
    );
  }

  function CartesianGrid() {
    return <div data-testid="cartesian-grid" />;
  }

  function XAxis() {
    return <div data-testid="x-axis" />;
  }

  function YAxis() {
    return <div data-testid="y-axis" />;
  }

  function Legend() {
    return <div data-testid="legend" />;
  }

  function Bar(props: Record<string, unknown>) {
    const data = React.useContext(ChartContext);
    capturedBars.push(props);
    const { dataKey, name, onClick } = props as {
      dataKey: string;
      name?: string;
      onClick?: (event: { payload?: WarehouseCompositionDatum }) => void;
    };
    return (
      <button
        type="button"
        data-testid={`bar-${dataKey}`}
        onClick={() => onClick?.({ payload: data?.[0] })}
      >
        {name ?? dataKey}
      </button>
    );
  }

  return {
    ResponsiveContainer,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Legend,
    Bar,
  };
});

const sampleData: WarehouseCompositionDatum[] = [
  { month: 'Jan', donations: 1200, surplus: 300, pigPound: 150, outgoing: 800 },
];

function renderChart(onBarClick?: (data: { payload?: WarehouseCompositionDatum }) => void) {
  return render(
    <ThemeProvider theme={theme}>
      <div>
        <WarehouseCompositionChart data={sampleData} onBarClick={onBarClick} />
      </div>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  capturedBars.length = 0;
});

describe('WarehouseCompositionChart', () => {
  it('fires onBarClick when a segment is clicked', async () => {
    const onBarClick = jest.fn();
    renderChart(onBarClick);

    const donationsButton = await screen.findByRole('button', { name: /donations/i });
    await userEvent.click(donationsButton);

    expect(onBarClick).toHaveBeenCalledTimes(1);
    expect(onBarClick).toHaveBeenCalledWith({ payload: sampleData[0] });
  });

  it('uses the shared color assignments for each segment', () => {
    renderChart();

    expect(capturedBars).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataKey: 'donations', fill: theme.palette.primary.main }),
        expect.objectContaining({ dataKey: 'surplus', fill: theme.palette.warning.main }),
        expect.objectContaining({ dataKey: 'pigPound', fill: theme.palette.info.main }),
        expect.objectContaining({ dataKey: 'outgoing', fill: theme.palette.error.main }),
      ]),
    );
  });
});
