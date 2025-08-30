import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import VolunteerManagement from '../pages/volunteer-management/VolunteerManagement';
import {
  getVolunteerRoles,
  searchVolunteers,
  getVolunteerBookingHistory,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  updateVolunteerTrainedAreas,
  createVolunteerBookingForVolunteer,
  getVolunteerBookingsByRole,
  updateVolunteerBookingStatus,
  resolveVolunteerBookingConflict,
} from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  searchVolunteers: jest.fn(),
  getVolunteerBookingHistory: jest.fn(),
  createVolunteerShopperProfile: jest.fn(),
  removeVolunteerShopperProfile: jest.fn(),
  updateVolunteerTrainedAreas: jest.fn(),
  createVolunteerBookingForVolunteer: jest.fn(),
  getVolunteerBookingsByRole: jest.fn(),
  updateVolunteerBookingStatus: jest.fn(),
  resolveVolunteerBookingConflict: jest.fn(),
}));

let mockVolunteer: any = { id: 1, name: 'Test Vol', trainedAreas: [], hasShopper: false };

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
  (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([]);
  (updateVolunteerBookingStatus as jest.Mock).mockResolvedValue(undefined);
});

describe('VolunteerManagement shopper profile', () => {
  it('creates shopper profile for volunteer', async () => {
    mockVolunteer = { id: 1, name: 'Test Vol', trainedAreas: [], hasShopper: false };
    (searchVolunteers as jest.Mock)
      .mockResolvedValueOnce([mockVolunteer])
      .mockResolvedValueOnce([{ ...mockVolunteer, hasShopper: true }]);

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

    fireEvent.change(await screen.findByLabelText(/client id/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(createVolunteerShopperProfile).toHaveBeenCalledWith(
        1,
        '123',
        'pass',
        undefined,
        undefined,
      )
    );
    await waitFor(() => expect(screen.getByLabelText(/shopper profile/i)).toBeChecked());
  });

  it('removes shopper profile for volunteer', async () => {
    mockVolunteer = { id: 1, name: 'Test Vol', trainedAreas: [], hasShopper: true };
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
    mockVolunteer = { id: 1, name: 'Test Vol', trainedAreas: [], hasShopper: false };
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

    act(() => navigateFn('/volunteers/schedule'));
    act(() => navigateFn('/volunteers/search'));

    expect(screen.queryByLabelText(/shopper profile/i)).not.toBeInTheDocument();
  });
});

describe('VolunteerManagement role updates', () => {
  it('saves trained roles for volunteer', async () => {
    mockVolunteer = { id: 1, name: 'Test Vol', trainedAreas: [], hasShopper: false };
    (searchVolunteers as jest.Mock).mockResolvedValue([mockVolunteer]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 5,
        category_id: 1,
        name: 'Greeter',
        max_volunteers: 2,
        category_name: 'Front',
        shifts: [],
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
    const input = await screen.findByLabelText(/add role/i);
    fireEvent.change(input, { target: { value: 'Greeter' } });
    fireEvent.click(await screen.findByText('Greeter'));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(updateVolunteerTrainedAreas).toHaveBeenCalledWith(1, [5]),
    );
    await waitFor(() =>
      expect(screen.getByText('Roles updated')).toBeInTheDocument(),
    );
  });
});

describe('VolunteerManagement pending approvals', () => {
  it('removes booking from pending list after approval', async () => {
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
            end_time: '12:00:00',
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      },
    ]);
    (getVolunteerBookingsByRole as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 1,
          role_id: 5,
          volunteer_id: 2,
          volunteer_name: 'Alice',
          role_name: 'Greeter',
          date: '2024-01-01',
          start_time: '09:00:00',
          end_time: '12:00:00',
          status: 'pending',
        },
      ])
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/volunteers/pending']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Pending Volunteer Bookings');
    await screen.findByText('Alice');

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() =>
      expect(updateVolunteerBookingStatus).toHaveBeenCalledWith(1, 'approved', undefined),
    );

    await waitFor(() =>
      expect(screen.queryByText('Alice')).not.toBeInTheDocument(),
    );
  });
});
