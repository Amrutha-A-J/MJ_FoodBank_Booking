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
}));

jest.mock('../api/clientVisits', () => ({
  createClientVisit: jest.fn(),
}));

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
  });

  it('records visit when marking booking visited', async () => {
    const onClose = jest.fn();
    const onUpdated = jest.fn();
    (createClientVisit as jest.Mock).mockResolvedValue({});

    render(
      <MemoryRouter>
        <ManageBookingDialog
          open
          booking={{ id: 1, client_id: 5, user_id: 1, visits_this_month: 1, approved_bookings_this_month: 1, date: '2024-02-01', reschedule_token: '', user_name: 'Client', profile_link: 'https://portal.link2feed.ca/org/1605/intake/5' }}
          onClose={onClose}
          onUpdated={onUpdated}
        />
      </MemoryRouter>
    );

    fireEvent.mouseDown(screen.getByLabelText(/status/i));
    fireEvent.click(await screen.findByRole('option', { name: /visited/i }));
    fireEvent.change(screen.getByLabelText(/weight with cart/i), { target: { value: '30' } });

    await waitFor(() =>
      expect(screen.getByLabelText(/weight without cart/i)).toHaveValue(3)
    );

    fireEvent.change(screen.getByLabelText(/pet item/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: 'bring ID' } });

    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() =>
      expect(createClientVisit).toHaveBeenCalledWith({
        date: '2024-02-01',
        clientId: 5,
        anonymous: false,
        weightWithCart: 30,
        weightWithoutCart: 3,
        petItem: 1,
        note: 'bring ID',
      })
    );
    expect(onUpdated).toHaveBeenCalledWith('Visit recorded', 'success');
  });
  it('shows client info', () => {
    render(
      <MemoryRouter>
        <ManageBookingDialog
          open
          booking={{ id: 1, client_id: 5, user_id: 1, visits_this_month: 3, approved_bookings_this_month: 1, date: '2024-02-01', reschedule_token: '', user_name: 'Client', profile_link: 'https://portal.link2feed.ca/org/1605/intake/5', note: 'remember ID' }}
          onClose={() => {}}
          onUpdated={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Client: Client')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '5' });
    expect(link).toHaveAttribute('href', 'https://portal.link2feed.ca/org/1605/intake/5');
    expect(screen.getByText('Monthly usage: 4')).toBeInTheDocument();
    expect(
      screen.getByText('Visits: 3, Approved bookings: 1'),
    ).toBeInTheDocument();
    expect(screen.getByText('Note: remember ID')).toBeInTheDocument();
  });
  it('renders note when provided', () => {
    render(
      <MemoryRouter>
        <ManageBookingDialog
          open
          booking={{ id: 2, client_id: 6, user_id: 1, visits_this_month: 0, approved_bookings_this_month: 0, date: '2024-02-02', reschedule_token: '', user_name: 'Another', profile_link: 'https://portal.link2feed.ca/org/1605/intake/6', note: 'bring cart' }}
          onClose={() => {}}
          onUpdated={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Note: bring cart')).toBeInTheDocument();
  });

  it('omits note when not provided', () => {
    render(
      <MemoryRouter>
        <ManageBookingDialog
          open
          booking={{ id: 3, client_id: 7, user_id: 1, visits_this_month: 0, approved_bookings_this_month: 0, date: '2024-02-03', reschedule_token: '', user_name: 'None', profile_link: 'https://portal.link2feed.ca/org/1605/intake/7' }}
          onClose={() => {}}
          onUpdated={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Note:/)).toBeNull();
  });
  it('calculates monthly usage when counts are strings', () => {
    render(
      <MemoryRouter>
        <ManageBookingDialog
          open
          booking={{
            id: 1,
            client_id: 5,
            user_id: 1,
            visits_this_month: '1' as any,
            approved_bookings_this_month: '1' as any,
            date: '2024-02-01',
            reschedule_token: '',
            user_name: 'Client',
            profile_link: 'https://portal.link2feed.ca/org/1605/intake/5',
          }}
          onClose={() => {}}
          onUpdated={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Monthly usage: 2')).toBeInTheDocument();
  });
});

