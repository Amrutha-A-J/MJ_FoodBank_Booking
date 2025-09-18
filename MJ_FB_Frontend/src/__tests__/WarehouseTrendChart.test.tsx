import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import WarehouseTrendChart, {
  type WarehouseTrendPoint,
} from '../components/dashboard/WarehouseTrendChart';

jest.mock('recharts', () => {
  const Recharts = jest.requireActual('recharts');
  return {
    ...Recharts,
    ResponsiveContainer: ({ children }: any) => (
      <div className="recharts-wrapper" style={{ width: 800, height: 300 }}>
        {React.cloneElement(children, { width: 800, height: 300 })}
      </div>
    ),
    LineChart: ({ children, onClick, data }: any) => (
      <div data-testid="line-chart" onClick={() => onClick?.({ activePayload: [{ payload: data?.[0] }] })}>
        {children}
      </div>
    ),
    Tooltip: () => null,
  };
});

const data: WarehouseTrendPoint[] = [
  { month: 'Jan', incoming: 150, outgoing: 120 },
  { month: 'Feb', incoming: 180, outgoing: 140 },
];

test('calls onPointSelect when a data point is clicked', () => {
  const handleSelect = jest.fn();
  const { getByTestId } = render(
    <ThemeProvider theme={createTheme()}>
      <WarehouseTrendChart data={data} onPointSelect={handleSelect} />
    </ThemeProvider>,
  );

  fireEvent.click(getByTestId('line-chart'));

  expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining(data[0]));
});
