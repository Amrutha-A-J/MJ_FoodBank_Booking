import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClientVisitTrendChart from '../components/dashboard/ClientVisitTrendChart';

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

test('renders three lines for clients, adults, and children', () => {
  const data = [
    { month: '2024-01', clients: 5, adults: 3, children: 2 },
    { month: '2024-02', clients: 6, adults: 4, children: 2 },
  ];
  const { container } = render(
    <ThemeProvider theme={createTheme()}>
      <ClientVisitTrendChart data={data} />
    </ThemeProvider>,
  );
  expect(container.querySelectorAll('path.recharts-line-curve').length).toBe(3);
});
