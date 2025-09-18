type TrendDatum = { month: string; incoming: number; outgoing: number };

let mockTrendPoint: TrendDatum = { month: 'Jan', incoming: 0, outgoing: 0 };

jest.mock('../../../api/pantryAggregations', () => ({
  getPantryMonthly: jest.fn(),
}));

jest.mock('../../../api/events', () => ({
  getEvents: jest.fn(),
}));

jest.mock('../../../api/warehouseOverall', () => ({
  getWarehouseOverall: jest.fn(),
  getWarehouseOverallYears: jest.fn(),
}));

jest.mock('../../../api/donors', () => ({
  getTopDonors: jest.fn(),
}));

jest.mock('../../../api/outgoingReceivers', () => ({
  getTopReceivers: jest.fn(),
}));

jest.mock('../../../components/dashboard/WarehouseTrendChart', () => ({
  __esModule: true,
  default: ({ onPointSelect }: { onPointSelect?: (datum: TrendDatum) => void }) => (
    <button type="button" data-testid="mock-trend-chart" onClick={() => onPointSelect?.(mockTrendPoint)}>
      Trend Chart
    </button>
  ),
}));

jest.mock('../../../components/dashboard/WarehouseCompositionChart', () => ({
  __esModule: true,
  default: () => <div data-testid="composition-chart" />,
}));

jest.mock('../../../components/EventList', () => ({
  __esModule: true,
  default: () => <div data-testid="event-list" />,
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FoodBankTrends from '../FoodBankTrends';
import { getPantryMonthly } from '../../../api/pantryAggregations';
import { getEvents } from '../../../api/events';
import {
  getWarehouseOverall,
  getWarehouseOverallYears,
} from '../../../api/warehouseOverall';
import { getTopDonors } from '../../../api/donors';
import { getTopReceivers } from '../../../api/outgoingReceivers';

describe('FoodBankTrends', () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const previousYear = currentYear - 1;

  const warehouseTotals = [
    { month: 1, donations: 1000, surplus: 150, pigPound: 50, outgoingDonations: 700 },
    { month: 2, donations: 900, surplus: 100, pigPound: 40, outgoingDonations: 650 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (getPantryMonthly as jest.Mock).mockImplementation((year: number) => {
      if (year === currentYear) {
        return Promise.resolve([
          { month: currentMonth, orders: 20, adults: 35, children: 12 },
        ]);
      }
      if (year === previousYear) {
        return Promise.resolve([
          { month: currentMonth, orders: 18, adults: 30, children: 10 },
        ]);
      }
      return Promise.resolve([]);
    });

    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getWarehouseOverallYears as jest.Mock).mockResolvedValue([2024]);
    (getWarehouseOverall as jest.Mock).mockResolvedValue(warehouseTotals);
    (getTopDonors as jest.Mock).mockResolvedValue([]);
    (getTopReceivers as jest.Mock).mockResolvedValue([]);
    mockTrendPoint = {
      month: 'Jan',
      incoming: warehouseTotals[0].donations + warehouseTotals[0].surplus + warehouseTotals[0].pigPound,
      outgoing: warehouseTotals[0].outgoingDonations,
    };
  });

  it('shows warehouse totals after clicking the trend chart', async () => {
    render(
      <MemoryRouter>
        <FoodBankTrends />
      </MemoryRouter>,
    );

    await screen.findByText('Click a point to view totals for that month.');

    const chartButton = await screen.findByTestId('mock-trend-chart');
    fireEvent.click(chartButton);

    const incomingChip = await screen.findByTestId('warehouse-trend-incoming');
    const outgoingChip = await screen.findByTestId('warehouse-trend-outgoing');

    const incomingValue = Number((incomingChip.textContent ?? '').replace(/[^0-9]/g, ''));
    const outgoingValue = Number((outgoingChip.textContent ?? '').replace(/[^0-9]/g, ''));

    expect(incomingValue).toBe(mockTrendPoint.incoming);
    expect(outgoingValue).toBe(mockTrendPoint.outgoing);
  }, 15000);
});
