import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DonorDashboard from '../DonorDashboard';
import useMonetaryDonorInsights from '../../../hooks/useMonetaryDonorInsights';

jest.mock('../../../hooks/useMonetaryDonorInsights');

jest.mock('../../../components/dashboard/MonetaryDonationTrendChart', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown }) => (
    <div data-testid="mock-donation-trend">{JSON.stringify(data)}</div>
  ),
}));

jest.mock('../../../components/dashboard/MonetaryGivingTierChart', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown }) => (
    <div data-testid="mock-giving-tier">{JSON.stringify(data)}</div>
  ),
}));

const mockUseMonetaryDonorInsights = useMonetaryDonorInsights as jest.MockedFunction<
  typeof useMonetaryDonorInsights
>;

describe('DonorDashboard', () => {
  const fullData = {
    window: { startMonth: '2024-01', endMonth: '2024-03', months: 3 },
    monthly: [
      { month: '2024-01', totalAmount: 1200, donationCount: 6, donorCount: 4, averageGift: 200 },
      { month: '2024-02', totalAmount: 1500, donationCount: 8, donorCount: 5, averageGift: 187.5 },
    ],
    ytd: {
      totalAmount: 4200,
      donationCount: 20,
      donorCount: 12,
      averageGift: 210,
      averageDonationsPerDonor: 1.7,
      lastDonationISO: '2024-03-18T00:00:00Z',
    },
    topDonors: [
      {
        id: 1,
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'alex@example.com',
        windowAmount: 2500,
        lifetimeAmount: 7200,
        lastDonationISO: '2024-03-10T00:00:00Z',
      },
    ],
    givingTiers: {
      currentMonth: {
        month: '2024-03',
        tiers: {
          '1-100': { donorCount: 4, totalAmount: 250 },
          '101-500': { donorCount: 3, totalAmount: 900 },
          '501-1000': { donorCount: 1, totalAmount: 650 },
          '1001-10000': { donorCount: 0, totalAmount: 0 },
          '10001-30000': { donorCount: 0, totalAmount: 0 },
        },
      },
      previousMonth: {
        month: '2024-02',
        tiers: {
          '1-100': { donorCount: 2, totalAmount: 150 },
          '101-500': { donorCount: 2, totalAmount: 600 },
          '501-1000': { donorCount: 1, totalAmount: 700 },
          '1001-10000': { donorCount: 0, totalAmount: 0 },
          '10001-30000': { donorCount: 0, totalAmount: 0 },
        },
      },
    },
    firstTimeDonors: [
      {
        id: 2,
        firstName: 'Jamie',
        lastName: 'Lee',
        email: null,
        firstDonationISO: '2024-03-05T00:00:00Z',
        amount: 300,
      },
    ],
    pantryImpact: {
      families: 85,
      adults: 210,
      children: 140,
      pounds: 3250,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders donor insights when data loads', () => {
    mockUseMonetaryDonorInsights.mockReturnValue({
      data: fullData,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/donor-management']}>
        <DonorDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText('Year-to-date overview')).toBeInTheDocument();
    expect(screen.getByText('$4,200.00')).toBeInTheDocument();
    expect(screen.getByText('Donations recorded')).toBeInTheDocument();
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText(/First gift on/)).toHaveTextContent('Mar');
    expect(screen.getByText('Families supported')).toBeInTheDocument();
    expect(screen.getByTestId('mock-donation-trend')).toBeInTheDocument();
    expect(screen.getByTestId('mock-giving-tier')).toBeInTheDocument();
  });

  it('shows loading skeletons while insights load', () => {
    mockUseMonetaryDonorInsights.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/donor-management']}>
        <DonorDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('donor-dashboard-loading')).toBeInTheDocument();
  });

  it('shows empty states when datasets are empty', () => {
    mockUseMonetaryDonorInsights.mockReturnValue({
      data: {
        ...fullData,
        monthly: [],
        topDonors: [],
        firstTimeDonors: [],
        givingTiers: {
          currentMonth: {
            month: '2024-03',
            tiers: {
              '1-100': { donorCount: 0, totalAmount: 0 },
              '101-500': { donorCount: 0, totalAmount: 0 },
              '501-1000': { donorCount: 0, totalAmount: 0 },
              '1001-10000': { donorCount: 0, totalAmount: 0 },
              '10001-30000': { donorCount: 0, totalAmount: 0 },
            },
          },
          previousMonth: {
            month: '2024-02',
            tiers: {
              '1-100': { donorCount: 0, totalAmount: 0 },
              '101-500': { donorCount: 0, totalAmount: 0 },
              '501-1000': { donorCount: 0, totalAmount: 0 },
              '1001-10000': { donorCount: 0, totalAmount: 0 },
              '10001-30000': { donorCount: 0, totalAmount: 0 },
            },
          },
        },
        pantryImpact: { families: 0, adults: 0, children: 0, pounds: 0 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/donor-management']}>
        <DonorDashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('No giving trends to display yet. Record donations to see momentum over time.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tier data will appear once donors start giving this month.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No top donors for this period yet. Donations will appear here as they come in.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('We’ll highlight first-time donors once new supporters give during this window.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Pantry impact metrics will populate once donations fund pantry programs.'),
    ).toBeInTheDocument();
  });

  it('displays access error messaging for forbidden responses', async () => {
    mockUseMonetaryDonorInsights.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: Object.assign(new Error('Forbidden'), { status: 403 }),
    });

    render(
      <MemoryRouter initialEntries={['/donor-management']}>
        <DonorDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(
          'You do not have access to donor insights. Ask an administrator to grant donor management access.',
        ),
      ).not.toHaveLength(0);
    });
    expect(screen.getByTestId('donor-dashboard-error')).toBeInTheDocument();
  });
});

