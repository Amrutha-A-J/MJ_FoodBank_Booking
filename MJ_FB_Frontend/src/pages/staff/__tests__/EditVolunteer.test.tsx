import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditVolunteer from '../volunteer-management/EditVolunteer';
import {
  getVolunteerRoles,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  getVolunteerById,
  updateVolunteer,
  getVolunteerBookingHistory,
} from '../../../api/volunteers';

jest.mock('../../../api/volunteers', () => {
  const actual = jest.requireActual('../../../api/volunteers');
  return {
    ...actual,
    getVolunteerRoles: jest.fn(),
    updateVolunteerTrainedAreas: jest.fn(),
    createVolunteerShopperProfile: jest.fn(),
    removeVolunteerShopperProfile: jest.fn(),
    getVolunteerById: jest.fn(),
    updateVolunteer: jest.fn(),
    getVolunteerBookingHistory: jest.fn(),
  };
});

const mockVolunteer: any = {
  id: 1,
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  email: undefined,
  phone: undefined,
  trainedAreas: [],
  hasShopper: false,
  hasPassword: false,
  clientId: null,
};

jest.mock('../../../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect(mockVolunteer)}>Select Volunteer</button>
));

const renderEditVolunteer = () =>
  render(
    <MemoryRouter>
      <EditVolunteer />
    </MemoryRouter>,
  );

beforeEach(() => {
  (getVolunteerRoles as jest.Mock).mockReset();
  (createVolunteerShopperProfile as jest.Mock).mockReset();
  (removeVolunteerShopperProfile as jest.Mock).mockReset();
  (getVolunteerById as jest.Mock).mockReset();
  (updateVolunteer as jest.Mock).mockReset();
  (getVolunteerBookingHistory as jest.Mock).mockReset();

  (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
  (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);

  mockVolunteer.id = 1;
  mockVolunteer.name = 'John Doe';
  mockVolunteer.firstName = 'John';
  mockVolunteer.lastName = 'Doe';
  mockVolunteer.email = undefined;
  mockVolunteer.phone = undefined;
  mockVolunteer.trainedAreas = [];
  mockVolunteer.hasShopper = false;
  mockVolunteer.hasPassword = false;
  mockVolunteer.clientId = null;
});

describe('EditVolunteer volunteer info display', () => {
  beforeEach(async () => {
    renderEditVolunteer();
    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
  });

  it('shows helper text when no volunteer is selected', async () => {
    expect(
      await screen.findByText('Search and select a volunteer'),
    ).toBeInTheDocument();
  });

  it('displays volunteer name and online badge when selected', async () => {
    mockVolunteer.hasPassword = true;

    fireEvent.click(
      await screen.findByRole('button', { name: 'Select Volunteer' }),
    );

    expect(await screen.findByTestId('volunteer-name')).toHaveTextContent(
      'John Doe',
    );
    expect(await screen.findByTestId('online-badge')).toBeInTheDocument();
  });

  it('shows helper text when no roles are assigned', async () => {
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select Volunteer' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Roles' }));
    expect(await screen.findByText('No roles assigned yet')).toBeInTheDocument();
  });
});

describe('EditVolunteer shopper profile', () => {
  beforeEach(async () => {
    renderEditVolunteer();
    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
  });

  it('creates shopper profile', async () => {
    (createVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
    (getVolunteerById as jest.Mock).mockResolvedValue({
      ...mockVolunteer,
      hasShopper: true,
      clientId: 123,
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select Volunteer' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Roles' }));
    const toggle = await screen.findByTestId('shopper-toggle');
    fireEvent.click(toggle);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(
      within(dialog).getByLabelText(/client id/i),
      { target: { value: '123' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(/email/i),
      { target: { value: 'test@example.com' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(/phone/i),
      { target: { value: '555-1234' } },
    );
    fireEvent.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(createVolunteerShopperProfile).toHaveBeenCalledWith(
        1,
        '123',
        'test@example.com',
        '555-1234',
      );
      expect(getVolunteerById).toHaveBeenCalledWith(1);
    });
  });

  it('removes shopper profile', async () => {
    mockVolunteer.id = 2;
    mockVolunteer.name = 'Jane Doe';
    mockVolunteer.hasShopper = true;
    mockVolunteer.clientId = 456;

    (removeVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
    (getVolunteerById as jest.Mock).mockResolvedValue({
      ...mockVolunteer,
      hasShopper: false,
      clientId: null,
    });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Select Volunteer' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Roles' }));
    const toggle = await screen.findByTestId('shopper-toggle');
    fireEvent.click(toggle);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(removeVolunteerShopperProfile).toHaveBeenCalledWith(2);
      expect(getVolunteerById).toHaveBeenCalledWith(2);
    });
  });
});

describe('EditVolunteer role selection', () => {
  const roleA = {
    id: 1,
    category_id: 1,
    name: 'Role A',
    max_volunteers: 1,
    category_name: 'Master 1',
    shifts: [],
  };
  const roleB = {
    id: 2,
    category_id: 1,
    name: 'Role B',
    max_volunteers: 1,
    category_name: 'Master 1',
    shifts: [],
  };

  describe('when roles are available to assign', () => {
    beforeEach(async () => {
      (getVolunteerRoles as jest.Mock).mockResolvedValue([roleA, roleB]);
      mockVolunteer.trainedAreas = [];
      renderEditVolunteer();
      await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
    });

    it('adds role via dropdown', async () => {
      fireEvent.click(
        await screen.findByRole('button', { name: 'Select Volunteer' }),
      );
      fireEvent.click(await screen.findByRole('button', { name: 'Roles' }));

      const rolesSelect = await screen.findByTestId('roles-select');
      const saveButton = await screen.findByTestId('save-button');
      expect(saveButton).toBeDisabled();
      expect(await screen.findByText('No roles assigned yet')).toBeInTheDocument();

      fireEvent.mouseDown(
        rolesSelect.querySelector('[role="combobox"]') as HTMLElement,
      );
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('Role A'));
      fireEvent.keyDown(listbox, { key: 'Escape' });

      expect(await screen.findByTestId('role-chip-role-a')).toBeInTheDocument();
      await waitFor(() => expect(saveButton).toBeEnabled());
      await waitFor(() =>
        expect(screen.queryByText('No roles assigned yet')).not.toBeInTheDocument(),
      );
    });
  });

  describe('when a role is removed', () => {
    beforeEach(async () => {
      (getVolunteerRoles as jest.Mock).mockResolvedValue([roleA]);
      mockVolunteer.trainedAreas = [];
      renderEditVolunteer();
      await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
    });

    it('removes role via chip delete', async () => {
      fireEvent.click(
        await screen.findByRole('button', { name: 'Select Volunteer' }),
      );
      fireEvent.click(await screen.findByRole('button', { name: 'Roles' }));

      const rolesSelect = await screen.findByTestId('roles-select');
      fireEvent.mouseDown(
        rolesSelect.querySelector('[role="combobox"]') as HTMLElement,
      );
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('Role A'));
      fireEvent.keyDown(listbox, { key: 'Escape' });

      const chip = await screen.findByTestId('role-chip-role-a');
      fireEvent.click(within(chip).getByTestId('CancelIcon'));

      await waitFor(() =>
        expect(screen.queryByTestId('role-chip-role-a')).not.toBeInTheDocument(),
      );
      expect(await screen.findByText('No roles assigned yet')).toBeInTheDocument();
    });
  });

  describe('when multiple roles are already selected', () => {
    beforeEach(async () => {
      (getVolunteerRoles as jest.Mock).mockResolvedValue([roleA, roleB]);
      mockVolunteer.trainedAreas = [1, 2];
      renderEditVolunteer();
      await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
    });

    it('renders multiple role chips in a grid container', async () => {
      fireEvent.click(
        await screen.findByRole('button', { name: 'Select Volunteer' }),
      );
      fireEvent.click(await screen.findByRole('button', { name: 'Roles' }));

      const chipA = await screen.findByTestId('role-chip-role-a');
      const chipB = await screen.findByTestId('role-chip-role-b');
      expect(chipA).toBeInTheDocument();
      expect(chipB).toBeInTheDocument();

      const grid = chipA.parentElement?.parentElement;
      expect(grid).toHaveClass('MuiGrid-container');
    });
  });
});

describe('EditVolunteer profile editing', () => {
  beforeEach(async () => {
    (updateVolunteer as jest.Mock).mockResolvedValue(undefined);
    (getVolunteerById as jest.Mock).mockResolvedValue({
      ...mockVolunteer,
      email: 'new@example.com',
    });
    renderEditVolunteer();
    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
  });

  it('saves updated email', async () => {
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select Volunteer' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Profile' }));

    const emailInput = await screen.findByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    fireEvent.click(await screen.findByTestId('save-profile-button'));

    await waitFor(() => {
      expect(updateVolunteer).toHaveBeenCalledWith(1, {
        firstName: 'John',
        lastName: 'Doe',
        email: 'new@example.com',
        phone: undefined,
      });
      expect(getVolunteerById).toHaveBeenCalledWith(1);
    });
    await waitFor(() =>
      expect(screen.getByLabelText(/email/i)).toHaveValue('new@example.com'),
    );
  });
});

describe('EditVolunteer booking history', () => {
  beforeEach(async () => {
    renderEditVolunteer();
    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
  });

  it('loads history when a volunteer is selected', async () => {
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        date: '2024-01-01',
        start_time: '09:00',
        end_time: '10:00',
        status: 'approved',
        role_name: 'Greeter',
      },
    ]);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Select Volunteer' }),
    );
    await waitFor(() =>
      expect(getVolunteerBookingHistory).toHaveBeenCalledWith(1),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'History' }));
    expect(await screen.findByText('approved')).toBeInTheDocument();
  });
});
