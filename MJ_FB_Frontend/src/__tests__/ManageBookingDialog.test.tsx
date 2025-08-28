import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManageBookingDialog from '../components/ManageBookingDialog';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../api/bookings', () => ({
  getSlots: jest.fn(),
  rescheduleBookingByToken: jest.fn(),
  cancelBooking: jest.fn(),
  markBookingNoShow: jest.fn(),
  markBookingVisited: jest.fn(),
}));

jest.mock('../api/clientVisits', () => ({
  createClientVisit: jest.fn(),
}));

const { markBookingVisited } = jest.requireMock('../api/bookings');
const { createClientVisit } = jest.requireMock('../api/clientVisits');

describe('ManageBookingDialog', () => {
  beforeAll(() => {
    window.matchMedia =
      window.matchMedia ||
      ((() => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
      })) as any);
  });

  beforeEach(() => {
    (createClientVisit as jest.Mock).mockReset();
    (markBookingVisited as jest.Mock).mockReset();
  });

  it('records visit when marking booking visited', async () => {
    const onClose = jest.fn();
    const onUpdated = jest.fn();
    (createClientVisit as jest.Mock).mockResolvedValue({});
    (markBookingVisited as jest.Mock).mockResolvedValue({});

    render(
      <MemoryRouter>
        <ManageBookingDialog
          open
          booking={{ id: 1, client_id: 5, user_id: 1, bookings_this_month: 2, date: '2024-02-01', reschedule_token: '', user_name: 'Client' }}
          onClose={onClose}
          onUpdated={onUpdated}
        />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'visited' } });
    fireEvent.change(screen.getByLabelText(/weight with cart/i), { target: { value: '30' } });

    await waitFor(() =>
      expect(screen.getByLabelText(/weight without cart/i)).toHaveValue('3')
    );

    fireEvent.change(screen.getByLabelText(/pet item/i), { target: { value: '1' } });

    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() =>
      expect(createClientVisit).toHaveBeenCalledWith({
        date: '2024-02-01',
        clientId: 5,
        anonymous: false,
        weightWithCart: 30,
        weightWithoutCart: 3,
        petItem: 1,
      })
    );
    await waitFor(() => expect(markBookingVisited).toHaveBeenCalledWith(1));
    expect(onUpdated).toHaveBeenCalledWith('Visit recorded', 'success');
  });
  it('shows client info', () => {
    render(
      <MemoryRouter>
        <ManageBookingDialog
          open
          booking={{ id: 1, client_id: 5, user_id: 1, bookings_this_month: 3, date: '2024-02-01', reschedule_token: '', user_name: 'Client' }}
          onClose={() => {}}
          onUpdated={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Client: Client')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '5' });
    expect(link).toHaveAttribute('href', '/pantry/client-management?tab=history&id=1&name=Client&clientId=5');
    expect(screen.getByText('Visits this month: 3')).toBeInTheDocument();
  });
});

