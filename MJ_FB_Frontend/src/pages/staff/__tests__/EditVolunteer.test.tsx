import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditVolunteer from '../volunteer-management/EditVolunteer';
import {
  getVolunteerRoles,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  getVolunteerById,
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

describe('EditVolunteer page', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
  });

  it('shows helper text when no volunteer selected', () => {
    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    expect(screen.getByText('Select a volunteer to begin')).toBeInTheDocument();
    expect(screen.queryByTestId('save-button')).not.toBeInTheDocument();
  });

  it('shows online account badge when hasPassword true', () => {
    mockVolunteer.hasPassword = true;

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    expect(screen.getByTestId('online-badge')).toBeInTheDocument();
    mockVolunteer.hasPassword = false;
  });
});

describe('EditVolunteer shopper profile', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (createVolunteerShopperProfile as jest.Mock).mockReset();
    (removeVolunteerShopperProfile as jest.Mock).mockReset();
    (getVolunteerById as jest.Mock).mockReset();
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
    expect(screen.getByTestId('volunteer-name')).toHaveTextContent('John Doe');
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
  });

  it('shows helper text when no roles assigned', async () => {
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
    expect(screen.getByTestId('roles-select')).toBeInTheDocument();
    expect(screen.getByText('No roles assigned yet')).toBeInTheDocument();
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
    expect(screen.getByText('No roles assigned yet')).toBeInTheDocument();
    fireEvent.mouseDown(
      screen.getByTestId('roles-select').querySelector('[role="combobox"]')!
    );
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role A'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    expect(await screen.findByTestId('role-chip-role-a')).toBeInTheDocument();
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

  it('renders role chips in a grid container', async () => {
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
    const select = screen.getByTestId('roles-select');
    fireEvent.mouseDown(select.querySelector('[role="combobox"]')!);
    let listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role A'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    fireEvent.mouseDown(select.querySelector('[role="combobox"]')!);
    listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role B'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    const chipA = await screen.findByTestId('role-chip-role-a');
    const chipB = await screen.findByTestId('role-chip-role-b');
    const container = chipA.closest('.MuiGrid-container');
    expect(container).toBeInTheDocument();
    expect(container).toContainElement(chipB);
  });
});
