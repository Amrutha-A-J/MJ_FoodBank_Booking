import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FoodBankTrends from '../pages/aggregations/FoodBankTrends';
import '../../tests/mockUrl';

const mockGetPantryMonthly = jest.fn();
const mockGetEvents = jest.fn();
const mockGetWarehouseOverallYears = jest.fn();
const mockGetWarehouseOverall = jest.fn();
const mockGetTopDonors = jest.fn();
const mockGetTopReceivers = jest.fn();

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

describe('FoodBankTrends page', () => {
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
        outgoingDonations: 800,
      },
    ]);

    mockGetTopDonors.mockResolvedValue([
      {
        id: 1,
        firstName: 'Donor',
        lastName: 'One',
        email: 'donor@example.com',
        phone: null,
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

    expect(await screen.findByText(/Monthly Visits/i)).toBeInTheDocument();
    expect(screen.getByText(/Adults vs Children/i)).toBeInTheDocument();
    expect(await screen.findByText('Community Food Drive')).toBeInTheDocument();
    expect(screen.getByText(/Warehouse Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Trend/i)).toBeInTheDocument();
    expect(screen.getByText(/Composition/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Donors/i)).toBeInTheDocument();
    expect(await screen.findByText(/Donor One/)).toBeInTheDocument();
    expect(screen.getByText(/Top Receivers/i)).toBeInTheDocument();
    expect(await screen.findByText(/Community Partner/)).toBeInTheDocument();
  });
});
