import { MemoryRouter } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import WarehouseDashboard from '../pages/warehouse-management/WarehouseDashboard';

const navigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
}));

const mockGetWarehouseOverall = jest.fn();
const mockGetWarehouseOverallYears = jest.fn();
const mockGetTopDonors = jest.fn();
const mockGetTopReceivers = jest.fn();
const mockGetEvents = jest.fn();
const mockGetDonors = jest.fn();

jest.mock('../api/warehouseOverall', () => ({
  getWarehouseOverall: (...args: unknown[]) => mockGetWarehouseOverall(...args),
  getWarehouseOverallYears: (...args: unknown[]) =>
    mockGetWarehouseOverallYears(...args),
}));

jest.mock('../api/donors', () => ({
  getTopDonors: (...args: unknown[]) => mockGetTopDonors(...args),
  getDonors: (...args: unknown[]) => mockGetDonors(...args),
}));

jest.mock('../api/outgoingReceivers', () => ({
  getTopReceivers: (...args: unknown[]) => mockGetTopReceivers(...args),
}));

jest.mock('../api/events', () => ({
  getEvents: (...args: unknown[]) => mockGetEvents(...args),
}));

jest.mock('../components/dashboard/VolunteerCoverageCard', () => () => (
  <div>Coverage</div>
));
jest.mock('../components/EventList', () => () => <div>Events</div>);
jest.mock('../components/WarehouseQuickLinks', () => () => <div />);

describe('WarehouseDashboard', () => {
  const donors = [
    {
      id: 42,
      name: 'Alice Donor',
      contact: { email: null, phone: '306-555-0100' },
      isPetFood: false,
      totalLbs: 1200,
      lastDonationISO: '2024-04-01T12:00:00Z',
    },
    {
      id: 99,
      name: 'Bob Helper',
      contact: null,
      isPetFood: false,
      totalLbs: 600,
      lastDonationISO: '2024-03-01T12:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWarehouseOverallYears.mockResolvedValue([2024]);
    mockGetWarehouseOverall.mockResolvedValue([
      { month: 1, donations: 100, surplus: 20, pigPound: 10, petFood: 5, outgoingDonations: 50 },
    ]);
    mockGetTopDonors.mockResolvedValue(donors);
    mockGetTopReceivers.mockResolvedValue([
      { name: 'Community Partner', totalLbs: 900, lastPickupISO: '2024-04-15T12:00:00Z' },
    ]);
    mockGetEvents.mockResolvedValue({ today: [], upcoming: [], past: [] });
    mockGetDonors.mockResolvedValue(donors);
  });

  function renderDashboard() {
    return renderWithProviders(
      <MemoryRouter>
        <WarehouseDashboard />
      </MemoryRouter>,
    );
  }

  it('filters donors by ID search and navigates to the selected donor profile', async () => {
    renderDashboard();

    await waitFor(() => expect(mockGetWarehouseOverallYears).toHaveBeenCalled());

    const searchInput = await screen.findByPlaceholderText(/find donor\/receiver/i);
    await userEvent.type(searchInput, '42');

    await waitFor(() => expect(mockGetDonors).toHaveBeenCalledWith('42'));

    const option = await screen.findByText('Alice Donor (ID 42 • 306-555-0100)');
    fireEvent.click(option);

    expect(navigate).toHaveBeenCalledWith('/warehouse-management/donors/42');
  });

  it('shows donor autocomplete options without phone numbers and filters donor cards by phone', async () => {
    renderDashboard();

    const searchInput = await screen.findByPlaceholderText(/find donor\/receiver/i);

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(await screen.findByText('Bob Helper (ID 99)')).toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, '555');

    await waitFor(() => expect(mockGetDonors).toHaveBeenCalledWith('555'));

    await waitFor(() => {
      expect(screen.getByText('Alice Donor')).toBeInTheDocument();
      expect(screen.queryByText('Bob Helper')).not.toBeInTheDocument();
    });
  });
});
