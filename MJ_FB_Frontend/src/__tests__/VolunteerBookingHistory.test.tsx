import { renderWithProviders, screen, fireEvent } from '../../testUtils/renderWithProviders';
import { MemoryRouter } from 'react-router-dom';
import VolunteerBookingHistory from '../pages/volunteer-management/VolunteerBookingHistory';
import { getMyVolunteerBookings, getVolunteerRolesForVolunteer } from '../api/volunteers';
import { formatTime } from '../utils/time';

jest.mock('../api/volunteers', () => ({
  getMyVolunteerBookings: jest.fn(),
  cancelVolunteerBooking: jest.fn(),
  cancelRecurringVolunteerBooking: jest.fn(),
  rescheduleVolunteerBookingByToken: jest.fn(),
  getVolunteerRolesForVolunteer: jest.fn(),
}));

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

describe('VolunteerBookingHistory', () => {
  beforeEach(() => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        role_id: 1,
        date: '2024-02-01',
        start_time: '09:00:00',
        end_time: '12:00:00',
        role_name: 'Pantry',
        reschedule_token: 'abc',
      },
    ]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 2,
        role_id: 1,
        name: 'Pantry',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 1,
        booked: 1,
        available: 0,
        status: 'open',
        date: '2024-02-02',
        category_id: 1,
        category_name: 'Pantry',
        is_wednesday_slot: false,
      },
      {
        id: 3,
        role_id: 1,
        name: 'Pantry',
        start_time: '12:00:00',
        end_time: '15:00:00',
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: 'open',
        date: '2024-02-02',
        category_id: 1,
        category_name: 'Pantry',
        is_wednesday_slot: false,
      },
    ]);
  });

  it('renders table on large screens', async () => {
    setScreen(false);
    renderWithProviders(
      <MemoryRouter>
        <VolunteerBookingHistory />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('renders cards on small screens', async () => {
    setScreen(true);
    renderWithProviders(
      <MemoryRouter>
        <VolunteerBookingHistory />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(await screen.findByText(/cancel/i)).toBeInTheDocument();
  });

  it('shows only available slots in reschedule dialog', async () => {
    renderWithProviders(
      <MemoryRouter>
        <VolunteerBookingHistory />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /reschedule/i }));

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2024-02-02' },
    });

    fireEvent.mouseDown(await screen.findByLabelText(/role/i));

    expect(
      screen.queryByText(
        `Pantry ${formatTime('09:00:00')}–${formatTime('12:00:00')}`,
      ),
    ).toBeNull();
    expect(
      await screen.findByText(
        `Pantry ${formatTime('12:00:00')}–${formatTime('15:00:00')}`,
      ),
    ).toBeInTheDocument();
  });
});

