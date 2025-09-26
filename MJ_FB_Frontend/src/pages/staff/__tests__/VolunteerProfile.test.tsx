import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VolunteerProfile from '../volunteer-management/VolunteerProfile';
import {
  createVolunteerShopperProfile,
  getVolunteerBookingHistory,
  getVolunteerById,
  getVolunteerRoles,
  getVolunteerStatsById,
  removeVolunteerShopperProfile,
  updateVolunteer,
  updateVolunteerTrainedAreas,
} from '../../../api/volunteers';
import { requestPasswordReset } from '../../../api/users';
import type { VolunteerBooking } from '../../../types';

jest.mock('../../../api/volunteers', () => {
  const actual = jest.requireActual('../../../api/volunteers');
  return {
    ...actual,
    createVolunteerShopperProfile: jest.fn(),
    getVolunteerBookingHistory: jest.fn(),
    getVolunteerById: jest.fn(),
    getVolunteerRoles: jest.fn(),
    getVolunteerStatsById: jest.fn(),
    removeVolunteerShopperProfile: jest.fn(),
    updateVolunteer: jest.fn(),
    updateVolunteerTrainedAreas: jest.fn(),
  };
});

jest.mock('../../../api/users', () => ({
  requestPasswordReset: jest.fn(),
}));

const mockVolunteer = {
  id: 1,
  name: 'Jordan Volunteer',
  firstName: 'Jordan',
  lastName: 'Volunteer',
  email: 'jordan@example.com',
  phone: '555-0100',
  trainedAreas: [1],
  hasShopper: false,
  hasPassword: false,
  clientId: null,
};

const mockRoles = [
  {
    id: 1,
    category_id: 10,
    category_name: 'Pantry',
    name: 'Pantry Support',
    max_volunteers: 4,
    shifts: [],
  },
  {
    id: 2,
    category_id: 10,
    category_name: 'Pantry',
    name: 'Warehouse',
    max_volunteers: 4,
    shifts: [],
  },
];

const mockHistory: VolunteerBooking[] = [
  {
    id: 5,
    status: 'completed',
    role_id: 1,
    date: '2024-05-01',
    start_time: '09:00:00',
    end_time: '12:00:00',
    role_name: 'Pantry Support',
    note: null,
  },
];

const mockStats = {
  volunteerId: 1,
  lifetime: { hours: 120, shifts: 80 },
  yearToDate: { hours: 30, shifts: 20 },
  monthToDate: { hours: 5, shifts: 3 },
  topRoles: [
    { roleName: 'Pantry Support', hours: 80, shifts: 50 },
    { roleName: 'Warehouse', hours: 40, shifts: 30 },
  ],
  lastCompletedShift: { roleName: 'Warehouse', date: '2024-04-10', hours: 3 },
};

const renderProfile = () =>
  render(
    <MemoryRouter initialEntries={['/volunteer-management/volunteers/1']}>
      <Routes>
        <Route path="/volunteer-management/volunteers/:volunteerId" element={<VolunteerProfile />} />
      </Routes>
    </MemoryRouter>,
  );

describe('VolunteerProfile', () => {
  beforeEach(() => {
    (getVolunteerById as jest.Mock).mockResolvedValue({ ...mockVolunteer });
    (getVolunteerRoles as jest.Mock).mockResolvedValue(mockRoles);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue(mockHistory);
    (getVolunteerStatsById as jest.Mock).mockResolvedValue(mockStats);
    (updateVolunteer as jest.Mock).mockResolvedValue(undefined);
    (updateVolunteerTrainedAreas as jest.Mock).mockResolvedValue(undefined);
    (createVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
    (removeVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
    (requestPasswordReset as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders stats card with totals and top roles', async () => {
    renderProfile();

    await waitFor(() => expect(getVolunteerById).toHaveBeenCalledWith(1));
    await screen.findByRole('button', { name: /edit volunteer/i });

    expect(
      await screen.findByText(/5 hours\s*·\s*3 shifts/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/30 hours\s*·\s*20 shifts/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/120 hours\s*·\s*80 shifts/i),
    ).toBeInTheDocument();
    expect(await screen.findByText('Top roles')).toBeInTheDocument();
    expect(await screen.findByText(/Pantry Support —/)).toBeInTheDocument();
    expect(await screen.findByText(/Last shift:/i)).toBeInTheDocument();
  });

  it('saves profile changes through the edit modal', async () => {
    renderProfile();

    await waitFor(() => expect(getVolunteerById).toHaveBeenCalledWith(1));
    const editButton = await screen.findByRole('button', { name: /edit volunteer/i });

    fireEvent.click(editButton);

    const dialog = await screen.findByRole('dialog');
    const emailInput = within(dialog).getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    fireEvent.click(within(dialog).getByTestId('save-profile-button'));

    await waitFor(() =>
      expect(updateVolunteer).toHaveBeenCalledWith(1, {
        firstName: 'Jordan',
        lastName: 'Volunteer',
        email: 'new@example.com',
        phone: '555-0100',
        onlineAccess: false,
      }),
    );
    await waitFor(() => expect(getVolunteerById).toHaveBeenCalledTimes(2));
  });

  it('saves trained roles', async () => {
    renderProfile();
    await waitFor(() => expect(getVolunteerById).toHaveBeenCalledWith(1));
    await screen.findByRole('button', { name: /edit volunteer/i });

    const select = await screen.findByTestId('roles-select');
    fireEvent.mouseDown(select.querySelector('[role="combobox"]') as HTMLElement);
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Warehouse'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    fireEvent.click(screen.getByTestId('save-button'));

    await waitFor(() =>
      expect(updateVolunteerTrainedAreas).toHaveBeenCalledWith(1, [1, 2]),
    );
  });

  it('creates a shopper profile when toggled on', async () => {
    renderProfile();
    await waitFor(() => expect(getVolunteerById).toHaveBeenCalledWith(1));
    await screen.findByRole('button', { name: /edit volunteer/i });

    const toggle = await screen.findByRole('switch', { name: /shopper profile/i });
    fireEvent.click(toggle);

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/client id/i), {
      target: { value: '123' },
    });
    fireEvent.change(within(dialog).getByLabelText(/email/i), {
      target: { value: 'shopper@example.com' },
    });
    fireEvent.change(within(dialog).getByLabelText(/phone/i), {
      target: { value: '555-9999' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(createVolunteerShopperProfile).toHaveBeenCalledWith(
        1,
        '123',
        'shopper@example.com',
        '555-9999',
      ),
    );
  });

  it('removes a shopper profile when toggled off and confirmed', async () => {
    (getVolunteerById as jest.Mock).mockResolvedValueOnce({
      ...mockVolunteer,
      hasShopper: true,
    });

    renderProfile();
    await waitFor(() => expect(getVolunteerById).toHaveBeenCalledWith(1));
    await screen.findByRole('button', { name: /edit volunteer/i });

    const toggle = await screen.findByRole('switch', { name: /shopper profile/i });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);

    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() =>
      expect(removeVolunteerShopperProfile).toHaveBeenCalledWith(1),
    );
  });
});
