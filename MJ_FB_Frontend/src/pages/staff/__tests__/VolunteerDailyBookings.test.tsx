import {
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../testUtils/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { setTimeout as nodeSetTimeout, clearTimeout as nodeClearTimeout } from 'node:timers';

beforeAll(() => {
  // Use real Node timers so undici fetch and userEvent work together
  (global as any).setTimeout = nodeSetTimeout;
  (global as any).clearTimeout = nodeClearTimeout;
});
import { MemoryRouter } from 'react-router-dom';
import VolunteerDailyBookings from '../VolunteerDailyBookings';
import {
  getVolunteerBookingsByDate,
  updateVolunteerBookingStatus,
} from '../../../api/volunteers';

jest.mock('../../../api/volunteers', () => ({
  getVolunteerBookingsByDate: jest.fn(),
  updateVolunteerBookingStatus: jest.fn(),
}));

const sampleBookings = [
  {
    id: 1,
    status: 'approved',
    role_id: 1,
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: '10:00:00',
    role_name: 'Stocking',
    category_name: 'Pantry',
    volunteer_name: 'Alice',
  },
  {
    id: 2,
    status: 'approved',
    role_id: 1,
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: '10:00:00',
    role_name: 'Stocking',
    category_name: 'Pantry',
    volunteer_name: 'Bob',
  },
  {
    id: 3,
    status: 'approved',
    role_id: 2,
    date: '2024-01-01',
    start_time: '10:00:00',
    end_time: '11:00:00',
    role_name: 'Serving',
    category_name: 'Pantry',
    volunteer_name: 'Carol',
  },
  {
    id: 4,
    status: 'approved',
    role_id: 3,
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: '10:00:00',
    role_name: 'Sorting',
    category_name: 'Warehouse',
    volunteer_name: 'Dave',
  },
];

describe('VolunteerDailyBookings', () => {
  it('groups bookings by category, role, and shift', async () => {
    (getVolunteerBookingsByDate as jest.Mock).mockResolvedValue(sampleBookings);
    renderWithProviders(
      <MemoryRouter>
        <VolunteerDailyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Pantry')).toBeInTheDocument();
    expect(screen.getByText('Stocking')).toBeInTheDocument();
    expect(screen.getAllByText('9:00 AM – 10:00 AM')[0]).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Warehouse')).toBeInTheDocument();
  });

  it('updates status via API', async () => {
    (getVolunteerBookingsByDate as jest.Mock).mockResolvedValue([sampleBookings[0]]);
    (updateVolunteerBookingStatus as jest.Mock).mockResolvedValue(undefined);
    renderWithProviders(
      <MemoryRouter>
        <VolunteerDailyBookings />
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    const select = await screen.findByLabelText('Status');
    await user.click(select);
    const option = await screen.findByRole('option', { name: 'Completed' });
    await user.click(option);

    await waitFor(() =>
      expect(updateVolunteerBookingStatus).toHaveBeenCalledWith(1, 'completed'),
    );
  });
});

