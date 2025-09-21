type TrendDatum = { month: string; incoming: number; outgoing: number; petFood: number };

let mockTrendPoint: TrendDatum = { month: 'Jan', incoming: 0, outgoing: 0, petFood: 0 };

jest.mock('../../../api/warehouseOverall', () => ({
  getWarehouseOverall: jest.fn(),
  getWarehouseOverallYears: jest.fn(),
}));

jest.mock('../../../api/donors', () => ({
  getTopDonors: jest.fn(),
  getDonors: jest.fn(),
}));

jest.mock('../../../api/outgoingReceivers', () => ({
  getTopReceivers: jest.fn(),
}));

jest.mock('../../../api/events', () => ({
  getEvents: jest.fn(),
}));

jest.mock('../../../components/dashboard/WarehouseTrendChart', () => ({
  __esModule: true,
  default: ({ onPointSelect }: { onPointSelect?: (datum: TrendDatum) => void }) => (
    <button type="button" data-testid="mock-trend-chart" onClick={() => onPointSelect?.(mockTrendPoint)}>
      Trend Chart
    </button>
  ),
}));

jest.mock('../../../components/dashboard/VolunteerCoverageCard', () => ({
  __esModule: true,
  default: () => <div data-testid="volunteer-coverage-card" />,
}));

jest.mock('../../../components/WarehouseQuickLinks', () => ({
  __esModule: true,
  default: () => null,
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WarehouseDashboard from '../WarehouseDashboard';
import {
  getWarehouseOverall,
  getWarehouseOverallYears,
} from '../../../api/warehouseOverall';
import { getTopDonors, getDonors } from '../../../api/donors';
import { getTopReceivers } from '../../../api/outgoingReceivers';
import { getEvents } from '../../../api/events';

describe('WarehouseDashboard', () => {
  const mockTotals = [
    { month: 1, donations: 1000, surplus: 200, pigPound: 50, petFood: 110, outgoingDonations: 800 },
    { month: 2, donations: 1200, surplus: 150, pigPound: 60, petFood: 90, outgoingDonations: 900 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (getWarehouseOverallYears as jest.Mock).mockResolvedValue([2024]);
    (getWarehouseOverall as jest.Mock).mockResolvedValue(mockTotals);
    (getTopDonors as jest.Mock).mockResolvedValue([]);
    (getTopReceivers as jest.Mock).mockResolvedValue([]);
    (getDonors as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    mockTrendPoint = {
      month: 'Jan',
      incoming:
        mockTotals[0].donations +
        mockTotals[0].surplus +
        mockTotals[0].pigPound +
        mockTotals[0].petFood,
      outgoing: mockTotals[0].outgoingDonations,
      petFood: mockTotals[0].petFood,
    };
  });

  it('shows monthly totals after clicking the trend chart', async () => {
    render(
      <MemoryRouter>
        <WarehouseDashboard />
      </MemoryRouter>,
    );

    await screen.findByText('Click a point to view totals for that month.');

    const chartButton = await screen.findByTestId('mock-trend-chart');
    fireEvent.click(chartButton);

    const incomingChip = await screen.findByTestId('warehouse-trend-incoming');
    const outgoingChip = await screen.findByTestId('warehouse-trend-outgoing');
    const petFoodChip = await screen.findByTestId('warehouse-trend-pet-food');

    const incomingValue = Number((incomingChip.textContent ?? '').replace(/[^0-9]/g, ''));
    const outgoingValue = Number((outgoingChip.textContent ?? '').replace(/[^0-9]/g, ''));
    const petFoodValue = Number((petFoodChip.textContent ?? '').replace(/[^0-9]/g, ''));

    expect(incomingValue).toBe(mockTrendPoint.incoming);
    expect(outgoingValue).toBe(mockTrendPoint.outgoing);
    expect(petFoodValue).toBe(mockTrendPoint.petFood);
  }, 15000);
});
