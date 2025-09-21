import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  renderWithProviders,
  screen,
} from '../../../../testUtils/renderWithProviders';
import DonorDashboard from '../DonorDashboard';
import useMonetaryDonorInsights from '../../../hooks/useMonetaryDonorInsights';
import type { MonetaryDonorInsightsResponse } from '../../../api/monetaryDonorInsights';
import type { ApiError } from '../../../api/client';

jest.mock('../../../hooks/useMonetaryDonorInsights');

const mockUseMonetaryDonorInsights = useMonetaryDonorInsights as jest.MockedFunction<
  typeof useMonetaryDonorInsights
>;

const baseInsights: MonetaryDonorInsightsResponse = {
  window: { startMonth: '2024-01', endMonth: '2024-06', months: 6 },
  monthly: [
    { month: '2024-01', totalAmount: 1200, donationCount: 10, donorCount: 8, averageGift: 120 },
    { month: '2024-02', totalAmount: 1800, donationCount: 12, donorCount: 9, averageGift: 150 },
  ],
  ytd: {
    totalAmount: 5000,
    donationCount: 45,
    donorCount: 30,
    averageGift: 111.11,
    averageDonationsPerDonor: 1.5,
    lastDonationISO: '2024-06-15',
  },
  topDonors: [
    {
      id: 1,
      firstName: 'Alex',
      lastName: 'Smith',
      email: 'alex@example.com',
      windowAmount: 2500,
      lifetimeAmount: 6000,
      lastDonationISO: '2024-06-10',
    },
    {
      id: 2,
      firstName: 'Jamie',
      lastName: 'Lee',
      email: 'jamie@example.com',
      windowAmount: 1500,
      lifetimeAmount: 3500,
      lastDonationISO: '2024-05-22',
    },
  ],
  givingTiers: {
    currentMonth: {
      month: '2024-06',
      tiers: {
        '1-100': { donorCount: 5, totalAmount: 400 },
        '101-500': { donorCount: 4, totalAmount: 900 },
        '501-1000': { donorCount: 2, totalAmount: 1200 },
        '1001-10000': { donorCount: 1, totalAmount: 1000 },
        '10001-30000': { donorCount: 0, totalAmount: 0 },
      },
    },
    previousMonth: {
      month: '2024-05',
      tiers: {
        '1-100': { donorCount: 3, totalAmount: 300 },
        '101-500': { donorCount: 2, totalAmount: 600 },
        '501-1000': { donorCount: 1, totalAmount: 700 },
        '1001-10000': { donorCount: 0, totalAmount: 0 },
        '10001-30000': { donorCount: 0, totalAmount: 0 },
      },
    },
  },
  firstTimeDonors: [
    {
      id: 3,
      firstName: 'Taylor',
      lastName: 'Morgan',
      email: 'taylor@example.com',
      firstDonationISO: '2024-06-05',
      amount: 200,
    },
  ],
  pantryImpact: {
    families: 120,
    adults: 340,
    children: 210,
    pounds: 12345,
  },
};

function renderDashboard() {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/donor-management"]}>
      <Routes>
        <Route path="/donor-management" element={<DonorDashboard />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DonorDashboard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders donor insights data', () => {
    mockUseMonetaryDonorInsights.mockReturnValue({
      insights: baseInsights,
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      error: null,
    });

    renderDashboard();

    expect(screen.getByText(/\$5,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText(/Alex Smith/)).toBeInTheDocument();
    expect(screen.getByText(/Jamie Lee/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Welcome gifts will be highlighted/, { exact: false })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Taylor Morgan/)).toBeInTheDocument();
    expect(screen.getByText('Families supported')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'No donation history yet. Trends will appear after donations are recorded.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Comparing Jun 2024 with May 2024')).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', () => {
    mockUseMonetaryDonorInsights.mockReturnValue({
      insights: undefined,
      isLoading: true,
      isRefetching: false,
      refetch: jest.fn(),
      error: null,
    });

    renderDashboard();

    expect(screen.getByTestId('ytd-loading')).toBeInTheDocument();
    expect(screen.getByTestId('trend-loading')).toBeInTheDocument();
    expect(screen.getByTestId('top-donors-loading')).toBeInTheDocument();
  });

  it('renders empty states when datasets are empty', () => {
    mockUseMonetaryDonorInsights.mockReturnValue({
      insights: {
        ...baseInsights,
        monthly: [],
        topDonors: [],
        firstTimeDonors: [],
        pantryImpact: { families: 0, adults: 0, children: 0, pounds: 0 },
        givingTiers: {
          currentMonth: {
            month: '2024-06',
            tiers: {
              '1-100': { donorCount: 0, totalAmount: 0 },
              '101-500': { donorCount: 0, totalAmount: 0 },
              '501-1000': { donorCount: 0, totalAmount: 0 },
              '1001-10000': { donorCount: 0, totalAmount: 0 },
              '10001-30000': { donorCount: 0, totalAmount: 0 },
            },
          },
          previousMonth: {
            month: '2024-05',
            tiers: {
              '1-100': { donorCount: 0, totalAmount: 0 },
              '101-500': { donorCount: 0, totalAmount: 0 },
              '501-1000': { donorCount: 0, totalAmount: 0 },
              '1001-10000': { donorCount: 0, totalAmount: 0 },
              '10001-30000': { donorCount: 0, totalAmount: 0 },
            },
          },
        },
      },
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      error: null,
    });

    renderDashboard();

    expect(
      screen.getByText('Impact statistics will appear after donations are recorded.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Welcome gifts will be highlighted here once new donors give.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Once donations arrive, top supporters will appear here.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'No donation history yet. Trends will appear after donations are recorded.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tier comparisons will appear after at least one month of giving data is available.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a permission error message', async () => {
    const error: Partial<ApiError> = { status: 403, message: 'Forbidden' };
    mockUseMonetaryDonorInsights.mockReturnValue({
      insights: undefined,
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      error: error as ApiError,
    });

    renderDashboard();

    expect(
      await screen.findByText('You do not have permission to view donor insights.'),
    ).toBeInTheDocument();
  });
});
