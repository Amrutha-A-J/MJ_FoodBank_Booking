import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import VolunteerManagement from '../pages/volunteer-management/VolunteerManagement';
import {
  getVolunteerRoles,
  searchVolunteers,
  getVolunteerById,
  getVolunteerBookingHistory,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  updateVolunteerTrainedAreas,
  createVolunteerBookingForVolunteer,
  getVolunteerBookingsByRoles,
  resolveVolunteerBookingConflict,
  createVolunteer,
} from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  searchVolunteers: jest.fn(),
  getVolunteerById: jest.fn(),
  getVolunteerBookingHistory: jest.fn(),
  createVolunteerShopperProfile: jest.fn(),
  removeVolunteerShopperProfile: jest.fn(),
  updateVolunteerTrainedAreas: jest.fn(),
  createVolunteerBookingForVolunteer: jest.fn(),
  getVolunteerBookingsByRoles: jest.fn(),
  resolveVolunteerBookingConflict: jest.fn(),
  createVolunteer: jest.fn(),
}));

let mockVolunteer: any = {
  id: 1,
  name: 'Test Vol',
  firstName: 'Test',
  lastName: 'Vol',
  trainedAreas: [],
  hasShopper: false,
  hasPassword: false,
  clientId: null,
};

jest.mock('../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect(mockVolunteer)}>Select Volunteer</button>
));
jest.mock('../components/dashboard/Dashboard', () => () => <div>Dashboard</div>);

beforeEach(() => {
  jest.clearAllMocks();
  (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
  (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
  (createVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
  (removeVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
  (updateVolunteerTrainedAreas as jest.Mock).mockResolvedValue(undefined);
  (createVolunteerBookingForVolunteer as jest.Mock).mockResolvedValue(undefined);
  (getVolunteerBookingsByRoles as jest.Mock).mockResolvedValue([]);
  (createVolunteer as jest.Mock).mockResolvedValue(undefined);
  (getVolunteerById as jest.Mock).mockResolvedValue(mockVolunteer);
});

describe('VolunteerManagement create volunteer', () => {
  it('groups roles by master role', async () => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Greeter',
        max_volunteers: 1,
        category_name: 'Front',
        shifts: [],
      },
      {
        id: 2,
        category_id: 2,
        name: 'Driver',
        max_volunteers: 1,
        category_name: 'Back',
        shifts: [],
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/volunteers/create']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /select roles/i }));
    expect(await screen.findByText('Front')).toBeInTheDocument();
    expect(await screen.findByText('Back')).toBeInTheDocument();
  });
  it('requires email when online access enabled', async () => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Greeter',
        max_volunteers: 1,
        category_name: 'Front',
        shifts: [
          { id: 1, start_time: '09:00:00', end_time: '10:00:00' },
        ],
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/volunteers/create']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Doe' },
    });
    fireEvent.click(screen.getByRole('button', { name: /select roles/i }));
    fireEvent.click(await screen.findByLabelText('Greeter'));
    fireEvent.click(screen.getByLabelText(/online access/i));
    fireEvent.click(screen.getByRole('button', { name: /add volunteer/i }));

    await waitFor(() => expect(createVolunteer).not.toHaveBeenCalled());
  });

  it('allows setting password instead of sending setup link', async () => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Greeter',
        max_volunteers: 1,
        category_name: 'Front',
        shifts: [
          { id: 1, start_time: '09:00:00', end_time: '10:00:00' },
        ],
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/volunteers/create']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Doe' },
    });
    fireEvent.click(screen.getByRole('button', { name: /select roles/i }));
    fireEvent.click(await screen.findByLabelText('Greeter'));
    fireEvent.click(screen.getByLabelText(/online access/i));
    fireEvent.click(await screen.findByLabelText(/send password setup link/i));
    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret!1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add volunteer/i }));

    await waitFor(() =>
      expect(createVolunteer).toHaveBeenCalledWith(
        'John',
        'Doe',
        [1],
        true,
        'john@example.com',
        undefined,
        'Secret!1',
        false,
      ),
    );
  });
});

describe('VolunteerManagement shopper profile', () => {
  it('creates shopper profile for volunteer', async () => {
    mockVolunteer = {
      id: 1,
      name: 'Test Vol',
      trainedAreas: [],
      hasShopper: false,
      hasPassword: false,
      clientId: null,
    };
    (searchVolunteers as jest.Mock)
      .mockResolvedValueOnce([mockVolunteer])
      .mockResolvedValueOnce([{ ...mockVolunteer, hasShopper: true }]);
    (getVolunteerById as jest.Mock).mockResolvedValue({
      ...mockVolunteer,
      hasShopper: true,
      clientId: 123,
    });

    render(
      <MemoryRouter initialEntries={['/volunteers/search']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    const toggle = await screen.findByLabelText(/shopper profile/i);
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);

    await userEvent.type(await screen.findByLabelText(/client id/i), '123');
    expect(screen.getByText(/email invitation/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(createVolunteerShopperProfile).toHaveBeenCalledWith(
        1,
        '123',
        undefined,
        undefined,
      )
    );
    await waitFor(() => expect(screen.getByLabelText(/shopper profile/i)).toBeChecked());
  });

  it('removes shopper profile for volunteer', async () => {
    mockVolunteer = {
      id: 1,
      name: 'Test Vol',
      trainedAreas: [],
      hasShopper: true,
      hasPassword: false,
      clientId: 5,
    };
    (searchVolunteers as jest.Mock)
      .mockResolvedValueOnce([mockVolunteer])
      .mockResolvedValueOnce([{ ...mockVolunteer, hasShopper: false }]);

    render(
      <MemoryRouter initialEntries={['/volunteers/search']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    const toggle = await screen.findByLabelText(/shopper profile/i);
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() =>
      expect(removeVolunteerShopperProfile).toHaveBeenCalledWith(1)
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/shopper profile/i)).not.toBeChecked()
    );
  });
});

describe('VolunteerManagement search reset', () => {
  it('clears selected volunteer when leaving search tab', async () => {
    mockVolunteer = {
      id: 1,
      name: 'Test Vol',
      trainedAreas: [],
      hasShopper: false,
      hasPassword: false,
      clientId: null,
    };
    (searchVolunteers as jest.Mock).mockResolvedValue([mockVolunteer]);

    let navigateFn: (path: string) => void = () => {};
    function NavHelper() {
      navigateFn = useNavigate();
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/volunteers/search']}>
        <NavHelper />
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    expect(await screen.findByLabelText(/shopper profile/i)).toBeInTheDocument();

    await act(async () => {
      navigateFn('/volunteers/schedule');
    });
    await act(async () => {
      navigateFn('/volunteers/search');
    });

    expect(screen.queryByLabelText(/shopper profile/i)).not.toBeInTheDocument();
  });
});

describe('VolunteerManagement role updates', () => {
  it('saves trained roles for volunteer', async () => {
    mockVolunteer = {
      id: 1,
      name: 'Test Vol',
      trainedAreas: [],
      hasShopper: false,
      hasPassword: false,
      clientId: null,
    };
    (searchVolunteers as jest.Mock).mockResolvedValue([mockVolunteer]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 5,
        category_id: 1,
        name: 'Greeter',
        max_volunteers: 2,
        category_name: 'Front',
        shifts: [
          {
            id: 10,
            start_time: '09:00:00',
            end_time: '10:00:00',
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/volunteers/search']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    const [, select] = await screen.findAllByLabelText(/add role/i);
    fireEvent.mouseDown(select);
    fireEvent.click(await screen.findByRole('option', { name: 'Greeter' }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(updateVolunteerTrainedAreas).toHaveBeenCalledWith(1, [5]),
    );
    await waitFor(() =>
      expect(screen.getByText('Roles updated')).toBeInTheDocument(),
    );
  });
});

describe('VolunteerManagement search captions', () => {
  it('shows captions for volunteers with online accounts and shopper profiles', async () => {
    mockVolunteer = {
      id: 2,
      name: 'Shopper Vol',
      trainedAreas: [],
      hasShopper: true,
      hasPassword: true,
      clientId: 123,
    };
    (searchVolunteers as jest.Mock).mockResolvedValue([mockVolunteer]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/volunteers/search']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));

    expect(await screen.findByText('Shopper Vol')).toBeInTheDocument();
    expect(
      await screen.findByText('Volunteer has an online account')
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'This profile has a shopper profile attached to it. Client ID: 123',
      )
    ).toBeInTheDocument();
  });
});

describe('VolunteerManagement schedule statuses', () => {
  beforeEach(() => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2024-01-01T06:00:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Greeter',
        max_volunteers: 2,
        category_name: 'Front',
        shifts: [
          {
            id: 10,
            start_time: '09:00:00',
            end_time: '10:00:00',
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      },
    ]);
    (getVolunteerBookingsByRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'completed',
        role_id: 10,
        volunteer_id: 1,
        volunteer_name: 'Alice',
        date: '2024-01-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
      },
      {
        id: 2,
        status: 'no_show',
        role_id: 10,
        volunteer_id: 2,
        volunteer_name: 'Bob',
        date: '2024-01-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
      },
      {
        id: 3,
        status: 'cancelled',
        role_id: 10,
        volunteer_id: 3,
        volunteer_name: 'Carol',
        date: '2024-01-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
      },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows non-cancelled bookings on schedule', async () => {
    render(
      <MemoryRouter initialEntries={['/volunteers/schedule']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.mouseDown(screen.getByLabelText('Role'));
    fireEvent.click(await screen.findByRole('option', { name: 'Greeter' }));

    await waitFor(() => {
      expect(screen.getByText(/Alice/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob/i)).toBeInTheDocument();
      expect(screen.queryByText(/Carol/i)).not.toBeInTheDocument();
    });
  });
});

describe('VolunteerManagement schedule navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-29T19:00:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Greeter',
        max_volunteers: 1,
        category_name: 'Front',
        shifts: [
          {
            id: 10,
            start_time: '09:00:00',
            end_time: '10:00:00',
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      },
    ]);
    (getVolunteerBookingsByRoles as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resets to today when Today is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/volunteers/schedule']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.mouseDown(screen.getByLabelText('Role'));
    fireEvent.click(await screen.findByRole('option', { name: 'Greeter' }));

    const nextBtn = await screen.findByRole('button', { name: 'Next' });
    fireEvent.click(nextBtn);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        '2024-01-30',
      ),
    );

    const todayBtn = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayBtn);

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        '2024-01-29',
      ),
    );
  });
});

describe('VolunteerManagement department schedule', () => {
  beforeEach(() => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2024-01-01T19:00:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Greeter',
        max_volunteers: 1,
        category_name: 'Pantry',
        shifts: [
          { id: 10, start_time: '09:00:00', end_time: '10:00:00' },
        ],
      },
      {
        id: 2,
        category_id: 1,
        name: 'Checker',
        max_volunteers: 1,
        category_name: 'Pantry',
        shifts: [
          { id: 20, start_time: '09:00:00', end_time: '10:00:00' },
        ],
      },
    ]);
    (getVolunteerBookingsByRoles as jest.Mock).mockImplementation(
      (ids: number[]) => {
        const data: any[] = [];
        if (ids.includes(10)) {
          data.push({
            id: 1,
            status: 'approved',
            role_id: 10,
            volunteer_id: 1,
            volunteer_name: 'Alice',
            date: '2024-01-01',
            start_time: '09:00:00',
            end_time: '10:00:00',
          });
        }
        if (ids.includes(20)) {
          data.push({
            id: 2,
            status: 'approved',
            role_id: 20,
            volunteer_id: 2,
            volunteer_name: 'Bob',
            date: '2024-01-01',
            start_time: '09:00:00',
            end_time: '10:00:00',
          });
        }
        return Promise.resolve(data);
      },
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows bookings for all roles in selected department', async () => {
    render(
      <MemoryRouter initialEntries={['/volunteers/schedule']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByRole('option', { name: 'Pantry' }));

    expect(await screen.findByText('Greeter')).toBeInTheDocument();
    expect(await screen.findByText('Checker')).toBeInTheDocument();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(await screen.findByText('Bob')).toBeInTheDocument();
  });
});

