import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FoodBankTrends from '../pages/aggregations/FoodBankTrends';
import '../../tests/mockUrl';
import type { MonetaryDonorInsightsResponse } from '../api/monetaryDonors';
import { useAuth } from '../hooks/useAuth';
import useMonetaryDonorInsights from '../hooks/useMonetaryDonorInsights';

const mockGetPantryMonthly = jest.fn();
const mockGetEvents = jest.fn();
const mockGetWarehouseOverallYears = jest.fn();
const mockGetWarehouseOverall = jest.fn();
const mockGetTopDonors = jest.fn();
const mockGetTopReceivers = jest.fn();
const mockUseAuth = jest.fn();
const mockUseMonetaryDonorInsights = jest.fn();

jest.mock('../api/pantryAggregations', () => ({
  getPantryMonthly: (...args: unknown[]) => mockGetPantryMonthly(...args),
}));

jest.mock('../api/events', () => ({
  getEvents: (...args: unknown[]) => mockGetEvents(...args),
}));

jest.mock('../api/warehouseOverall', () => ({
  getWarehouseOverallYears: (...args: unknown[]) => mockGetWarehouseOverallYears(...args),
  getWarehouseOverall: (...args: unknown[]) => mockGetWarehouseOverall(...args),
}));

jest.mock('../api/donors', () => ({
  getTopDonors: (...args: unknown[]) => mockGetTopDonors(...args),
}));

jest.mock('../api/outgoingReceivers', () => ({
  getTopReceivers: (...args: unknown[]) => mockGetTopReceivers(...args),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../hooks/useMonetaryDonorInsights', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseMonetaryDonorInsights(...args),
}));

jest.mock('../components/dashboard/WarehouseCompositionChart', () => ({
  __esModule: true,
  default: ({
    onBarClick,
  }: {
    onBarClick?: (data: { payload?: Record<string, unknown> }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onBarClick?.({
          payload: {
            month: 'Jan',
            donations: 1200,
            surplus: 300,
            pigPound: 150,
            petFood: 100,
            outgoing: 800,
          },
        })
      }
    >
      Open Composition
    </button>
  ),
}));

jest.mock('../components/dashboard/MonetaryDonationTrendChart', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-monetary-donation-trend-chart" />,
}));

jest.mock('../components/dashboard/MonetaryGivingTierChart', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-giving-tier-chart" />,
}));

describe('FoodBankTrends page', () => {
  const donorInsightsFixture: MonetaryDonorInsightsResponse = {
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
      averageDonationsPerDonor: 1.3,
      lastDonationISO: '2024-08-12T00:00:00Z',
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

  beforeEach(() => {
    jest.clearAllMocks();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    mockGetPantryMonthly.mockResolvedValueOnce([
      { month: currentMonth, orders: 18, adults: 28, children: 12 },
    ]);
    mockGetPantryMonthly.mockResolvedValueOnce([
      { month: currentMonth, orders: 12, adults: 20, children: 8 },
    ]);

    mockGetEvents.mockResolvedValue({
      today: [],
      upcoming: [
        {
          id: 1,
          title: 'Community Food Drive',
          startDate: '2024-05-01T12:00:00Z',
          endDate: '2024-05-01T13:00:00Z',
          createdBy: 1,
          createdByName: 'Staff Member',
          priority: 1,
        },
      ],
      past: [],
    });

    mockGetWarehouseOverallYears.mockResolvedValue([currentYear]);
    mockGetWarehouseOverall.mockResolvedValue([
      {
        month: currentMonth,
        donations: 1200,
        surplus: 300,
        pigPound: 150,
        petFood: 100,
        outgoingDonations: 800,
      },
    ]);

    mockGetTopDonors.mockResolvedValue([
      {
        id: 1,
        name: 'Donor One',
        email: 'donor@example.com',
        phone: null,
        isPetFood: false,
        totalLbs: 420,
        lastDonationISO: '2024-04-01T12:00:00Z',
      },
    ]);

    mockGetTopReceivers.mockResolvedValue([
      {
        name: 'Community Partner',
        totalLbs: 610,
        lastPickupISO: '2024-04-15T18:00:00Z',
      },
    ]);

    mockUseAuth.mockReturnValue({
      role: 'staff',
      access: ['donor_management'],
    } as ReturnType<typeof useAuth>);
    mockUseMonetaryDonorInsights.mockReturnValue({
      data: donorInsightsFixture,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useMonetaryDonorInsights>);
  });

  it('requests pantry, events, warehouse, donor, and receiver data and renders sections', async () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    render(
      <MemoryRouter>
        <FoodBankTrends />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockGetPantryMonthly).toHaveBeenCalledTimes(2));
    expect(mockGetPantryMonthly).toHaveBeenNthCalledWith(1, currentYear, currentMonth);
    expect(mockGetPantryMonthly).toHaveBeenNthCalledWith(2, currentYear - 1, currentMonth);

    await waitFor(() => expect(mockGetEvents).toHaveBeenCalled());
    await waitFor(() => expect(mockGetWarehouseOverallYears).toHaveBeenCalled());
    await waitFor(() => expect(mockGetWarehouseOverall).toHaveBeenCalledWith(currentYear));
    await waitFor(() => expect(mockGetTopDonors).toHaveBeenCalled());
    await waitFor(() => expect(mockGetTopReceivers).toHaveBeenCalled());

    const trendSelect = await screen.findByRole('combobox', { name: /trend view/i });
    expect(trendSelect).toHaveTextContent(/Pantry trends/i);

    expect(await screen.findByText(/Monthly Visits/i)).toBeInTheDocument();
    expect(screen.getByText(/Adults vs Children/i)).toBeInTheDocument();
    expect(screen.queryByText(/Monetary Donations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Warehouse Overview/i)).not.toBeInTheDocument();
    expect(await screen.findByText('Community Food Drive')).toBeInTheDocument();

    fireEvent.mouseDown(trendSelect);
    await userEvent.click(await screen.findByRole('option', { name: /donation trends/i }));

    expect(await screen.findByText(/Monetary Donations/i)).toBeInTheDocument();
    expect(screen.getByTestId('donation-ytd-total')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /trend view/i }));
    await userEvent.click(await screen.findByRole('option', { name: /warehouse trends/i }));

    expect(await screen.findByText(/Warehouse Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Trend/i)).toBeInTheDocument();
    expect(screen.getByText(/^Composition$/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Donors/i)).toBeInTheDocument();
    expect(await screen.findByText(/Donor One/)).toBeInTheDocument();
    expect(screen.getByText(/Top Receivers/i)).toBeInTheDocument();
    expect(await screen.findByText(/Community Partner/)).toBeInTheDocument();
  });

  it('surfaces the warehouse composition breakdown when a bar is clicked', async () => {
    const currentYear = new Date().getFullYear();

    render(
      <MemoryRouter>
        <FoodBankTrends />
      </MemoryRouter>,
    );

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /trend view/i }));
    await userEvent.click(await screen.findByRole('option', { name: /warehouse trends/i }));

    const openButton = await screen.findByRole('button', { name: /open composition/i });
    await userEvent.click(openButton);

    expect(
      await screen.findByText(`Composition for Jan ${currentYear}`),
    ).toBeInTheDocument();
    expect(screen.getByText('Donations')).toBeInTheDocument();
    expect(screen.getByText('1,200 lbs')).toBeInTheDocument();
    expect(screen.getByText('Surplus')).toBeInTheDocument();
    expect(screen.getByText('300 lbs')).toBeInTheDocument();
    expect(screen.getByText('Pig Pound')).toBeInTheDocument();
    expect(screen.getByText('150 lbs')).toBeInTheDocument();
    expect(screen.getByText('Pet Food')).toBeInTheDocument();
    expect(screen.getByText('100 lbs')).toBeInTheDocument();
    expect(screen.getByText('Outgoing')).toBeInTheDocument();
    expect(screen.getByText('800 lbs')).toBeInTheDocument();
  });
});
