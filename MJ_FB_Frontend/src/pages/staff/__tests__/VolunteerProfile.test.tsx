import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  deleteVolunteer,
} from '../../../api/volunteers';
import { requestPasswordReset } from '../../../api/users';
import type { VolunteerSearchResult } from '../../../api/volunteers';
import type { VolunteerBooking } from '../../../types';

jest.mock('../../../components/VolunteerQuickLinks', () => () => (
  <div data-testid="quick-links" />
));

jest.mock('../../../api/volunteers', () => ({
  getVolunteerById: jest.fn(),
  getVolunteerStatsById: jest.fn(),
  getVolunteerRoles: jest.fn(),
  getVolunteerBookingHistory: jest.fn(),
  updateVolunteerTrainedAreas: jest.fn(),
  updateVolunteer: jest.fn(),
  createVolunteerShopperProfile: jest.fn(),
  removeVolunteerShopperProfile: jest.fn(),
  deleteVolunteer: jest.fn(),
}));

jest.mock('../../../api/users', () => ({
  requestPasswordReset: jest.fn(),
}));

const baseVolunteer: VolunteerSearchResult = {
  id: 7,
  name: 'Sam Helper',
  firstName: 'Sam',
  lastName: 'Helper',
  email: 'sam@example.com',
  phone: '306-555-0199',
  trainedAreas: [1],
  hasShopper: false,
  hasPassword: true,
  clientId: null,
};

const mockStats = {
  volunteerId: 7,
  lifetime: { hours: 120, shifts: 60 },
  yearToDate: { hours: 40, shifts: 20 },
  monthToDate: { hours: 10, shifts: 5 },
  mostBookedRoles: [
    { roleId: 1, roleName: 'Pantry Support', shifts: 30, hours: 60 },
    { roleId: 2, roleName: 'Warehouse', shifts: 20, hours: 40 },
  ],
  lastCompletedShift: {
    date: '2024-04-01',
    roleId: 1,
    roleName: 'Pantry Support',
    hours: 3,
  },
};

const mockRoles = [
  {
    id: 1,
    name: 'Pantry Support',
    category_name: 'Pantry',
    category_id: 10,
    master_role_id: 1,
    description: '',
    shift_count: 0,
    active: true,
  },
  {
    id: 2,
    name: 'Warehouse',
    category_name: 'Warehouse',
    category_id: 11,
    master_role_id: 2,
    description: '',
    shift_count: 0,
    active: true,
  },
];

const mockHistory: VolunteerBooking[] = [
  {
    id: 11,
    date: '2024-03-01',
    start_time: '09:00:00',
    end_time: '12:00:00',
    status: 'completed',
    role_name: 'Pantry Support',
    reason: null,
    staff_note: null,
    recurring_id: null,
    slot_id: null,
  },
];

const renderProfile = () =>
  render(
    <MemoryRouter initialEntries={[`/volunteer-management/volunteers/${baseVolunteer.id}`]}>
      <Routes>
        <Route
          path="/volunteer-management/volunteers/:volunteerId"
          element={<VolunteerProfile />}
        />
        <Route path="/volunteer-management" element={<div data-testid="volunteer-search" />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  (getVolunteerById as jest.Mock).mockResolvedValue(baseVolunteer);
  (getVolunteerStatsById as jest.Mock).mockResolvedValue(mockStats);
  (getVolunteerRoles as jest.Mock).mockResolvedValue(mockRoles);
  (getVolunteerBookingHistory as jest.Mock).mockResolvedValue(mockHistory);
  (updateVolunteerTrainedAreas as jest.Mock).mockResolvedValue(undefined);
  (updateVolunteer as jest.Mock).mockResolvedValue(undefined);
  (createVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
  (removeVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
  (deleteVolunteer as jest.Mock).mockResolvedValue(undefined);
  (requestPasswordReset as jest.Mock).mockResolvedValue(undefined);
});

describe('VolunteerProfile', () => {
  it('renders stats for the volunteer', async () => {
    renderProfile();
    expect(await screen.findByTestId('stats-month')).toHaveTextContent('5 shifts · 10 hrs');
    expect(screen.getByTestId('stats-ytd')).toHaveTextContent('20 shifts · 40 hrs');
    expect(screen.getByTestId('stats-lifetime')).toHaveTextContent('60 shifts · 120 hrs');
    expect(screen.getAllByTestId('stats-top-role')).toHaveLength(2);
    expect(screen.getByTestId('stats-last-shift')).toHaveTextContent('Pantry Support');
  });

  it('opens the edit modal and saves profile changes', async () => {
    (getVolunteerById as jest.Mock)
      .mockResolvedValueOnce(baseVolunteer)
      .mockResolvedValueOnce({ ...baseVolunteer, firstName: 'Samuel', name: 'Samuel Helper' });

    renderProfile();
    fireEvent.click(await screen.findByRole('button', { name: /edit volunteer/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const firstNameField = screen.getByLabelText('First Name');
    fireEvent.change(firstNameField, { target: { value: 'Samuel' } });

    fireEvent.click(screen.getByTestId('save-profile-button'));

    await waitFor(() =>
      expect(updateVolunteer).toHaveBeenCalledWith(
        baseVolunteer.id,
        expect.objectContaining({ firstName: 'Samuel' }),
      ),
    );
  });

  it('saves trained roles changes', async () => {
    (getVolunteerById as jest.Mock).mockResolvedValue({ ...baseVolunteer, trainedAreas: [] });

    renderProfile();
    fireEvent.mouseDown(await screen.findByLabelText('Roles'));
    fireEvent.click(await screen.findByRole('option', { name: 'Pantry Support' }));
    fireEvent.click(screen.getByTestId('roles-save-button'));

    await waitFor(() =>
      expect(updateVolunteerTrainedAreas).toHaveBeenCalledWith(baseVolunteer.id, [1]),
    );
  });

  it('creates a shopper profile when toggled on', async () => {
    (getVolunteerById as jest.Mock)
      .mockResolvedValueOnce({ ...baseVolunteer, hasShopper: false })
      .mockResolvedValueOnce({ ...baseVolunteer, hasShopper: true });

    renderProfile();
    const toggle = await screen.findByTestId('shopper-toggle');
    fireEvent.click(toggle);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: 'shopper@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Phone (optional)'), {
      target: { value: '306-555-0000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(createVolunteerShopperProfile).toHaveBeenCalledWith(
        baseVolunteer.id,
        '123',
        'shopper@example.com',
        '306-555-0000',
      ),
    );
  });

  it('removes the shopper profile when toggled off', async () => {
    (getVolunteerById as jest.Mock)
      .mockResolvedValueOnce({ ...baseVolunteer, hasShopper: true })
      .mockResolvedValueOnce({ ...baseVolunteer, hasShopper: false });

    renderProfile();
    const toggle = await screen.findByTestId('shopper-toggle');
    fireEvent.click(toggle);

    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() =>
      expect(removeVolunteerShopperProfile).toHaveBeenCalledWith(baseVolunteer.id),
    );
  });

  it('deletes the volunteer from the profile page', async () => {
    renderProfile();

    fireEvent.click(await screen.findByRole('button', { name: /delete volunteer/i }));

    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(deleteVolunteer).toHaveBeenCalledWith(baseVolunteer.id));
    await waitFor(() => expect(screen.getByTestId('volunteer-search')).toBeInTheDocument());
  });
});
