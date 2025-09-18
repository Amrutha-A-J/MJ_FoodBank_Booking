import { render, screen, fireEvent } from '@testing-library/react';
import WarehouseTrendChart, { type WarehouseTrendDatum } from '../WarehouseTrendChart';

describe('WarehouseTrendChart', () => {
  const sampleData: WarehouseTrendDatum[] = [
    { month: 'Jan', incoming: 1200, outgoing: 900 },
    { month: 'Feb', incoming: 1500, outgoing: 1100 },
  ];

  it('invokes onPointSelect when a chart point is clicked', () => {
    const handleSelect = jest.fn();
    render(<WarehouseTrendChart data={sampleData} onPointSelect={handleSelect} />);

    const chart = screen.getByTestId('warehouse-trend-chart');
    const dots = chart.querySelectorAll('.recharts-dot');

    expect(dots.length).toBeGreaterThan(0);

    fireEvent.click(dots[0]);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(sampleData[0]);
  });
});
