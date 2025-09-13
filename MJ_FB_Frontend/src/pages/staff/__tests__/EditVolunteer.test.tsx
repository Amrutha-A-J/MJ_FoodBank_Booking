import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditVolunteer from '../volunteer-management/EditVolunteer';
import {
  getVolunteerRoles,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  getVolunteerById,
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

describe('EditVolunteer volunteer info display', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
    mockVolunteer.hasPassword = false;
  });

  it('shows helper text when no volunteer is selected', () => {
    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Search and select a volunteer'),
    ).toBeInTheDocument();
  });

  it('displays volunteer name and online badge when selected', async () => {
    mockVolunteer.name = 'John Doe';
    mockVolunteer.hasPassword = true;

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));

    expect(await screen.findByTestId('volunteer-name')).toHaveTextContent(
      'John Doe',
    );
    expect(screen.getByTestId('online-badge')).toBeInTheDocument();
  });

  it('shows helper text when no roles are assigned', async () => {
    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    expect(await screen.findByText('No roles assigned yet')).toBeInTheDocument();
  });
});

describe('EditVolunteer shopper profile', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (createVolunteerShopperProfile as jest.Mock).mockReset();
    (removeVolunteerShopperProfile as jest.Mock).mockReset();
    (getVolunteerById as jest.Mock).mockReset();
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
    mockVolunteer.hasPassword = false;
  });

  it('creates shopper profile', async () => {
    mockVolunteer.id = 1;
    mockVolunteer.name = 'John Doe';
    mockVolunteer.hasShopper = false;
    mockVolunteer.clientId = null;

    (createVolunteerShopperProfile as jest.Mock).mockResolvedValue(undefined);
    (getVolunteerById as jest.Mock).mockResolvedValue({
      ...mockVolunteer,
      hasShopper: true,
      clientId: 123,
    });

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    const toggle = screen.getByTestId('shopper-toggle');
    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-1234' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(createVolunteerShopperProfile).toHaveBeenCalledWith(
        1,
        '123',
        'test@example.com',
        '555-1234',
      ),
    );
    expect(getVolunteerById).toHaveBeenCalledWith(1);
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

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    const toggle = screen.getByTestId('shopper-toggle');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() =>
      expect(removeVolunteerShopperProfile).toHaveBeenCalledWith(2),
    );
    expect(getVolunteerById).toHaveBeenCalledWith(2);
  });
});

describe('EditVolunteer role selection', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockReset();
    (createVolunteerShopperProfile as jest.Mock).mockReset();
    (removeVolunteerShopperProfile as jest.Mock).mockReset();
    (getVolunteerById as jest.Mock).mockReset();
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
    mockVolunteer.hasPassword = false;
  });

  it('adds role via dropdown', async () => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Role A',
        max_volunteers: 1,
        category_name: 'Master 1',
        shifts: [],
      },
      {
        id: 2,
        category_id: 1,
        name: 'Role B',
        max_volunteers: 1,
        category_name: 'Master 1',
        shifts: [],
      },
    ]);
    mockVolunteer.trainedAreas = [];

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    expect(screen.getByTestId('roles-select')).toBeInTheDocument();
    expect(screen.getByTestId('save-button')).toBeDisabled();
    expect(screen.getByText('No roles assigned yet')).toBeInTheDocument();
    fireEvent.mouseDown(
      screen.getByTestId('roles-select').querySelector('[role="combobox"]')!
    );
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role A'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    expect(await screen.findByTestId('role-chip-role-a')).toBeInTheDocument();
    expect(screen.getByTestId('save-button')).toBeEnabled();
    expect(screen.queryByText('No roles assigned yet')).not.toBeInTheDocument();
  });

  it('removes role via chip delete', async () => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Role A',
        max_volunteers: 1,
        category_name: 'Master 1',
        shifts: [],
      },
    ]);
    mockVolunteer.trainedAreas = [];

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    fireEvent.mouseDown(
      screen.getByTestId('roles-select').querySelector('[role="combobox"]')!
    );
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role A'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    const chip = await screen.findByTestId('role-chip-role-a');
    const deleteBtn = within(chip).getByTestId('CancelIcon');
    fireEvent.click(deleteBtn);
    expect(screen.queryByTestId('role-chip-role-a')).not.toBeInTheDocument();
    expect(screen.getByText('No roles assigned yet')).toBeInTheDocument();
  });

  it('renders multiple role chips in a grid container', async () => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Role A',
        max_volunteers: 1,
        category_name: 'Master 1',
        shifts: [],
      },
      {
        id: 2,
        category_id: 1,
        name: 'Role B',
        max_volunteers: 1,
        category_name: 'Master 1',
        shifts: [],
      },
    ]);
    mockVolunteer.name = 'John Doe';
    mockVolunteer.hasShopper = false;
    mockVolunteer.clientId = null;
    mockVolunteer.trainedAreas = [1, 2];

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Select Volunteer'));
    const chipA = await screen.findByTestId('role-chip-role-a');
    const chipB = await screen.findByTestId('role-chip-role-b');
    expect(chipA).toBeInTheDocument();
    expect(chipB).toBeInTheDocument();

    const grid = chipA.parentElement?.parentElement;
    expect(grid).toHaveClass('MuiGrid-container');
  });
});

describe('EditVolunteer history', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        role_name: 'Role A',
        date: '2024-01-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
        status: 'approved',
      },
    ]);
  });

  it('loads history when volunteer is selected', async () => {
    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    const historyAccordion = await screen.findByText('History');
    fireEvent.click(historyAccordion);

    expect(await screen.findByText('Role A')).toBeInTheDocument();
    expect(getVolunteerBookingHistory).toHaveBeenCalledWith(1);
  });
});
