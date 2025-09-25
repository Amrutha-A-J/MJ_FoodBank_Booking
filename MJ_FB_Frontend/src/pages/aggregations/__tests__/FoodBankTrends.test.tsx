import type { VisitStat } from '../../../api/clientVisits';
import type { MonetaryDonorInsightsResponse } from '../../../api/monetaryDonors';

type TrendDatum = { month: string; incoming: number; outgoing: number; petFood: number };

const mockVisitTrendChart = jest.fn();
const mockVisitBreakdownChart = jest.fn();
const mockDonationTrendChart = jest.fn();

jest.mock('../../../components/dashboard/ClientVisitTrendChart', () => ({
  __esModule: true,
  default: (props: { data: VisitStat[] }) => {
    mockVisitTrendChart(props);
    return <div data-testid="visit-trend-chart" />;
  },
}));

jest.mock('../../../components/dashboard/ClientVisitBreakdownChart', () => ({
  __esModule: true,
  default: (props: { data: VisitStat[] }) => {
    mockVisitBreakdownChart(props);
    return <div data-testid="visit-breakdown-chart" />;
  },
}));

jest.mock('../../../components/dashboard/MonetaryDonationTrendChart', () => ({
  __esModule: true,
  default: ({ onPointSelect }: { onPointSelect?: (datum: { month: string }) => void }) => {
    mockDonationTrendChart();
    return (
      <button
        type="button"
        data-testid="monetary-donation-trend-chart"
        onClick={() => onPointSelect?.({ month: '2024-07' })}
      >
        Donation Trend
      </button>
    );
  },
}));

jest.mock('../../../components/dashboard/MonetaryGivingTierChart', () => ({
  __esModule: true,
  default: () => <div data-testid="monetary-giving-tier-chart" />,
}));

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

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../hooks/useMonetaryDonorInsights', () => ({
  __esModule: true,
  default: jest.fn(),
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
import { useAuth } from '../../../hooks/useAuth';
import useMonetaryDonorInsights from '../../../hooks/useMonetaryDonorInsights';

describe('FoodBankTrends', () => {
  const fakeNow = new Date('2024-08-15T12:00:00Z');
  const currentYear = fakeNow.getFullYear();
  const currentMonth = fakeNow.getMonth() + 1;
  const futureMonth = currentMonth + 1;
  const previousYear = currentYear - 1;

  const warehouseTotals = [
    { month: 1, donations: 1000, surplus: 150, pigPound: 50, petFood: 120, outgoingDonations: 700 },
    { month: 2, donations: 900, surplus: 100, pigPound: 40, petFood: 90, outgoingDonations: 650 },
  ];

  const baseDonorInsights: MonetaryDonorInsightsResponse = {
    window: { startMonth: '2023-09', endMonth: '2024-08', months: 12 },
    monthly: [
      { month: '2024-07', totalAmount: 5500, donationCount: 11, donorCount: 8, averageGift: 500 },
      { month: '2024-08', totalAmount: 6000, donationCount: 12, donorCount: 9, averageGift: 500 },
    ],
    ytd: {
      totalAmount: 30000,
      donationCount: 55,
      donorCount: 40,
      averageGift: 545,
      averageDonationsPerDonor: 1.38,
      lastDonationISO: '2024-08-10T00:00:00Z',
    },
    topDonors: [],
    givingTiers: {
      currentMonth: {
        month: '2024-08',
        tiers: {
          '1-100': { donorCount: 5, totalAmount: 400 },
          '101-500': { donorCount: 3, totalAmount: 900 },
          '501-1000': { donorCount: 2, totalAmount: 1200 },
          '1001-10000': { donorCount: 1, totalAmount: 2000 },
          '10001-30000': { donorCount: 0, totalAmount: 0 },
        },
      },
      previousMonth: {
        month: '2024-07',
        tiers: {
          '1-100': { donorCount: 4, totalAmount: 350 },
          '101-500': { donorCount: 4, totalAmount: 1100 },
          '501-1000': { donorCount: 1, totalAmount: 600 },
          '1001-10000': { donorCount: 1, totalAmount: 1800 },
          '10001-30000': { donorCount: 0, totalAmount: 0 },
        },
      },
    },
    firstTimeDonors: [],
    pantryImpact: { families: 0, adults: 0, children: 0, pounds: 0 },
  };

  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockUseMonetaryDonorInsights = useMonetaryDonorInsights as jest.MockedFunction<
    typeof useMonetaryDonorInsights
  >;

  const selectTrend = async (optionLabel: RegExp | string) => {
    const select = await screen.findByRole('combobox', { name: /trend view/i });
    fireEvent.mouseDown(select);
    const option = await screen.findByRole('option', { name: optionLabel });
    fireEvent.click(option);
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVisitTrendChart.mockClear();
    mockVisitBreakdownChart.mockClear();
    mockDonationTrendChart.mockClear();

    (getPantryMonthly as jest.Mock).mockImplementation((year: number) => {
      if (year === currentYear) {
        return Promise.resolve([
          { month: currentMonth, orders: 20, adults: 35, children: 12 },
          { month: futureMonth, orders: 999, adults: 999, children: 999 },
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
    mockUseAuth.mockReturnValue(
      { role: 'staff', access: ['donor_management'] } as unknown as ReturnType<typeof useAuth>,
    );
    mockUseMonetaryDonorInsights.mockReturnValue({
      data: baseDonorInsights,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    mockTrendPoint = {
      month: 'Jan',
      incoming:
        warehouseTotals[0].donations +
        warehouseTotals[0].surplus +
        warehouseTotals[0].pigPound +
        warehouseTotals[0].petFood,
      outgoing: warehouseTotals[0].outgoingDonations,
      petFood: warehouseTotals[0].petFood,
    };
  });

  it('shows warehouse totals after clicking the trend chart', async () => {
    render(
      <MemoryRouter>
        <FoodBankTrends />
      </MemoryRouter>,
    );

    await selectTrend(/warehouse trends/i);
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

  it('excludes future months from visit charts', async () => {
    render(
      <MemoryRouter>
        <FoodBankTrends />
      </MemoryRouter>,
    );

    await screen.findByTestId('visit-trend-chart');

    const trendCall = mockVisitTrendChart.mock.calls.at(-1)?.[0];
    const breakdownCall = mockVisitBreakdownChart.mock.calls.at(-1)?.[0];
    expect(Array.isArray(trendCall?.data)).toBe(true);
    expect(Array.isArray(breakdownCall?.data)).toBe(true);

    const hasFutureMonth = (stats: VisitStat[] | undefined) =>
      !!stats?.some(stat => stat.month === `${currentYear}-${String(futureMonth).padStart(2, '0')}`);

    expect(hasFutureMonth(trendCall?.data)).toBe(false);
    expect(hasFutureMonth(breakdownCall?.data)).toBe(false);
    expect(screen.queryByText('Total visits: 999')).not.toBeInTheDocument();
  });

  it('shows monetary donor insights when staff is signed in', async () => {
    render(
      <MemoryRouter>
        <FoodBankTrends />
      </MemoryRouter>,
    );

    await selectTrend(/donation trends/i);
    expect(mockUseMonetaryDonorInsights).toHaveBeenCalledWith({ months: 12, enabled: true });

    const ytdChip = await screen.findByTestId('donation-ytd-total');
    expect(ytdChip).toHaveTextContent('YTD total: $30,000.00');
    expect(screen.getByTestId('donation-trend-amount')).toHaveTextContent('Amount: $6,000.00');
    expect(screen.getByTestId('monetary-donation-trend-chart')).toBeInTheDocument();
    expect(screen.getByTestId('monetary-giving-tier-chart')).toBeInTheDocument();
  });

  it('shows monetary donor insights when an admin is signed in', async () => {
    mockUseAuth.mockReturnValue(
      { role: 'admin', access: [] } as unknown as ReturnType<typeof useAuth>,
    );

    render(
      <MemoryRouter>
        <FoodBankTrends />
      </MemoryRouter>,
    );

    await selectTrend(/donation trends/i);
    expect(mockUseMonetaryDonorInsights).toHaveBeenCalledWith({ months: 12, enabled: true });
    expect(await screen.findByTestId('donation-ytd-total')).toHaveTextContent('YTD total: $30,000.00');
  });

  it('shows monetary donor insights for staff without donor management access', async () => {
    mockUseAuth.mockReturnValue(
      { role: 'staff', access: [] } as unknown as ReturnType<typeof useAuth>,
    );

    render(
      <MemoryRouter>
        <FoodBankTrends />
      </MemoryRouter>,
    );

    await selectTrend(/donation trends/i);
    expect(mockUseMonetaryDonorInsights).toHaveBeenCalledWith({ months: 12, enabled: true });
    expect(await screen.findByTestId('donation-ytd-total')).toHaveTextContent('YTD total: $30,000.00');
    expect(screen.queryByText('You do not have permission to view monetary donor insights.')).not.toBeInTheDocument();
  });

  it('shows a permission notice when the insights request returns 403', async () => {
    mockUseMonetaryDonorInsights.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: Object.assign(new Error('Forbidden'), { status: 403 }),
    });

    render(
      <MemoryRouter>
        <FoodBankTrends />
      </MemoryRouter>,
    );

    await selectTrend(/donation trends/i);
    expect(
      await screen.findByText('You do not have permission to view monetary donor insights.'),
    ).toBeInTheDocument();
  });
});
