import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientHistory from '../pages/agency/ClientHistory';

jest.mock('../api/agencies', () => ({
  getMyAgencyClients: jest.fn(),
}));

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn(),
  cancelBooking: jest.fn(),
}));

jest.mock('../components/EntitySearch', () => (props: any) => (
  <button
    onClick={() =>
      props.onSelect({ name: 'Client One', client_id: 1, hasPassword: false })
    }
  >
    select client
  </button>
));

jest.mock('../components/RescheduleDialog', () => () => <div>RescheduleDialog</div>);

const originalMatchMedia = window.matchMedia;
function setScreen(matches: boolean) {
  window.matchMedia = () => ({
    matches,
    media: '',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
}
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('Agency ClientHistory', () => {
  it('cancels a booking', async () => {
    const { getMyAgencyClients } = require('../api/agencies');
    const { getBookingHistory, cancelBooking } = require('../api/bookings');
    (getMyAgencyClients as jest.Mock).mockResolvedValue([
      { client_id: 1, name: 'Client One' },
    ]);
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 10,
        status: 'approved',
        date: '2024-01-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
        created_at: '2024-01-01',
        slot_id: 1,
        is_staff_booking: false,
        reschedule_token: 'tok',
      },
    ]);
    (cancelBooking as jest.Mock).mockResolvedValue(undefined);
    window.confirm = jest.fn(() => true);

    render(<ClientHistory />);

    fireEvent.click(screen.getByText('select client'));
    await screen.findByText(/Client One/);
    await screen.findByText('Cancel');
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(cancelBooking).toHaveBeenCalledWith('10'));
    expect(getBookingHistory).toHaveBeenCalledTimes(2);
  });

  it('shows both client and staff notes', async () => {
    const { getMyAgencyClients } = require('../api/agencies');
    const { getBookingHistory } = require('../api/bookings');
    (getMyAgencyClients as jest.Mock).mockResolvedValue([
      { client_id: 1, name: 'Client One' },
    ]);
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'visited',
        date: '2024-01-01',
        start_time: null,
        end_time: null,
        created_at: '2024-01-01',
        slot_id: null,
        is_staff_booking: false,
        reschedule_token: null,
        client_note: 'client note',
        staff_note: 'staff note',
      },
    ]);

    render(<ClientHistory />);

    fireEvent.click(screen.getByText('select client'));

    await waitFor(() =>
      expect(getBookingHistory).toHaveBeenCalledWith({
        userId: 1,
        includeVisits: true,
        includeStaffNotes: true,
      }),
    );
    expect(screen.queryByText(/client note/i)).not.toBeInTheDocument();
    expect(screen.getByText(/staff note/i, { selector: 'p' })).toBeInTheDocument();
  });

  it('renders table on large screens', async () => {
    setScreen(false);
    const { getMyAgencyClients } = require('../api/agencies');
    const { getBookingHistory } = require('../api/bookings');
    (getMyAgencyClients as jest.Mock).mockResolvedValue([
      { client_id: 1, name: 'Client One' },
    ]);
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    render(<ClientHistory />);
    fireEvent.click(screen.getByText('select client'));
    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders cards on small screens', async () => {
    setScreen(true);
    const { getMyAgencyClients } = require('../api/agencies');
    const { getBookingHistory } = require('../api/bookings');
    (getMyAgencyClients as jest.Mock).mockResolvedValue([
      { client_id: 1, name: 'Client One' },
    ]);
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        date: '2024-01-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
        created_at: '2024-01-01',
        slot_id: 1,
        is_staff_booking: false,
        reschedule_token: 'tok',
      },
    ]);
    render(<ClientHistory />);
    fireEvent.click(screen.getByText('select client'));
    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(await screen.findByText(/cancel/i)).toBeInTheDocument();
  });
});
