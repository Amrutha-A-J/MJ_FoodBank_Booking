import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClientVisitTrendChart from '../components/dashboard/ClientVisitTrendChart';
import ClientVisitBreakdownChart from '../components/dashboard/ClientVisitBreakdownChart';

jest.mock('recharts', () => {
  const Recharts = jest.requireActual('recharts');
  return {
    ...Recharts,
    ResponsiveContainer: ({ children }: any) => (
      <div className="recharts-wrapper" style={{ width: 800, height: 300 }}>
        {React.cloneElement(children, { width: 800, height: 300 })}
      </div>
    ),
  };
});

const data = [
  { month: '2024-01', clients: 5, adults: 3, children: 2 },
  { month: '2024-02', clients: 6, adults: 4, children: 2 },
];

const singleMonthData = [{ month: '2024-01', clients: 5, adults: 3, children: 2 }];

test('renders one line for total clients', () => {
  const { container } = render(
    <ThemeProvider theme={createTheme()}>
      <ClientVisitTrendChart data={data} />
    </ThemeProvider>,
  );
  expect(container.querySelectorAll('path.recharts-line-curve').length).toBe(1);
});

test('renders two lines for adults and children', () => {
  const { container } = render(
    <ThemeProvider theme={createTheme()}>
      <ClientVisitBreakdownChart data={data} />
    </ThemeProvider>,
  );
  expect(container.querySelectorAll('path.recharts-line-curve').length).toBe(2);
});

test('renders dots for single-month trend data', () => {
  const { container } = render(
    <ThemeProvider theme={createTheme()}>
      <ClientVisitTrendChart data={singleMonthData} />
    </ThemeProvider>,
  );
  expect(container.querySelectorAll('circle.recharts-line-dot').length).toBeGreaterThan(0);
});

test('renders dots for single-month breakdown data', () => {
  const { container } = render(
    <ThemeProvider theme={createTheme()}>
      <ClientVisitBreakdownChart data={singleMonthData} />
    </ThemeProvider>,
  );
  expect(container.querySelectorAll('circle.recharts-line-dot').length).toBeGreaterThan(0);
});
