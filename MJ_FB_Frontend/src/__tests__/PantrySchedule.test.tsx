import { fireEvent, screen, waitFor } from '@testing-library/react';
import PantrySchedule from '../pages/staff/PantrySchedule';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import { getSlots, getBookings, getHolidays } from '../api/bookings';

jest.mock('../api/bookings', () => ({
  getSlots: jest.fn(),
  getBookings: jest.fn(),
  getHolidays: jest.fn(),
  createBookingForUser: jest.fn(),
  createBookingForNewClient: jest.fn(),
}));

jest.mock('../api/users', () => ({
  searchUsers: jest.fn(),
  addClientById: jest.fn(),
}));

describe('PantrySchedule Today button', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-29T19:00:00Z'));
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getBookings as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns to today and refetches slots', async () => {
    (getSlots as jest.Mock)
      .mockResolvedValueOnce([
        { id: 't1', startTime: '09:00:00', endTime: '09:30:00', maxCapacity: 1 },
      ])
      .mockResolvedValueOnce([
        { id: 't2', startTime: '10:00:00', endTime: '10:30:00', maxCapacity: 1 },
      ])
      .mockResolvedValueOnce([
        { id: 't3', startTime: '11:00:00', endTime: '11:30:00', maxCapacity: 1 },
      ]);

    renderWithProviders(<PantrySchedule />);

    await waitFor(() => expect(getSlots).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('9:00 AM - 9:30 AM')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));

    await waitFor(() => expect(getSlots).toHaveBeenCalledWith('2024-01-30', true));
    expect(await screen.findByText('10:00 AM - 10:30 AM')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    await waitFor(() => expect(getSlots).toHaveBeenCalledWith('2024-01-29', true));
    expect(await screen.findByText('11:00 AM - 11:30 AM')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2024-01-29');
  });
});

