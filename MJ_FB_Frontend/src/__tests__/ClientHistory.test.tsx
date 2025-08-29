import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientHistory from '../pages/agency/ClientHistory';
import { getBookingHistory } from '../api/bookings';
import { getMyAgencyClients } from '../api/agencies';

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn(),
}));

jest.mock('../api/agencies', () => ({
  getMyAgencyClients: jest.fn(),
}));

beforeEach(() => {
  (window as any).IntersectionObserver = jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  }));
});

describe('ClientHistory', () => {
  it('appends bookings when loading more', async () => {
    (getMyAgencyClients as jest.Mock).mockResolvedValue([{ id: 1, name: 'Alice' }]);
    (getBookingHistory as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 1,
          status: 'approved',
          date: '2024-01-01',
          start_time: '09:00:00',
          end_time: '10:00:00',
          created_at: '2024-01-01',
          slot_id: 1,
          is_staff_booking: false,
          reschedule_token: 't',
          client_id: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          status: 'approved',
          date: '2024-01-02',
          start_time: '09:00:00',
          end_time: '10:00:00',
          created_at: '2024-01-02',
          slot_id: 1,
          is_staff_booking: false,
          reschedule_token: 't',
          client_id: 1,
        },
      ]);

    render(<ClientHistory />);

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(getBookingHistory).toHaveBeenCalledWith({
      clientIds: [1],
      status: 'approved',
      limit: 10,
      offset: 0,
    });

    fireEvent.click(await screen.findByText('Load more'));
    await waitFor(() => expect(getBookingHistory).toHaveBeenCalledTimes(2));
    expect(getBookingHistory).toHaveBeenLastCalledWith({
      clientIds: [1],
      status: 'approved',
      limit: 10,
      offset: 1,
    });

    expect(screen.getAllByText('approved')).toHaveLength(2);
  });

  it('filters bookings by status', async () => {
    (getMyAgencyClients as jest.Mock).mockResolvedValue([{ id: 1, name: 'Alice' }]);
    (getBookingHistory as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 1,
          status: 'approved',
          date: '2024-01-01',
          start_time: '09:00:00',
          end_time: '10:00:00',
          created_at: '2024-01-01',
          slot_id: 1,
          is_staff_booking: false,
          reschedule_token: 't',
          client_id: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          status: 'visited',
          date: '2024-01-02',
          start_time: '09:00:00',
          end_time: '10:00:00',
          created_at: '2024-01-02',
          slot_id: 1,
          is_staff_booking: false,
          reschedule_token: 't',
          client_id: 1,
        },
      ]);

    render(<ClientHistory />);

    expect(await screen.findByText('approved')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Status') as HTMLInputElement, {
      target: { value: 'visited' },
    });

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalledTimes(2));
    expect(getBookingHistory).toHaveBeenLastCalledWith({
      clientIds: [1],
      status: 'visited',
      limit: 10,
      offset: 0,
    });

    expect(screen.getByText('visited')).toBeInTheDocument();
    expect(screen.queryByText('approved')).not.toBeInTheDocument();
  });
});

