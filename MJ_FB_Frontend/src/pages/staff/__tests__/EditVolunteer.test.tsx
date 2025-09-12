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

const slug = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

jest.mock('../../../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect(mockVolunteer)}>Select Volunteer</button>
));

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
    fireEvent.mouseDown(
      within(screen.getByTestId('roles-select')).getByRole('combobox'),
    );
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role A'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    expect(
      await screen.findByTestId(`role-chip-${slug('Role A')}`),
    ).toBeInTheDocument();
    expect(screen.getByTestId('save-button')).toBeInTheDocument();
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
      within(screen.getByTestId('roles-select')).getByRole('combobox'),
    );
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role A'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    const chip = await screen.findByTestId(`role-chip-${slug('Role A')}`);
    const deleteBtn = within(chip).getByTestId('CancelIcon');
    fireEvent.click(deleteBtn);
    expect(screen.queryByTestId(`role-chip-${slug('Role A')}`)).toBeNull();
  });
});

describe('EditVolunteer helpers and badges', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    mockVolunteer.trainedAreas = [];
    mockVolunteer.hasPassword = false;
  });

  it('shows helper text when no volunteer selected', () => {
    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/select a volunteer to edit/i),
    ).toBeInTheDocument();
  });

  it('shows helper text when no roles assigned', () => {
    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Select Volunteer'));
    expect(
      screen.getByText(/select at least one role/i),
    ).toBeInTheDocument();
  });

  it('shows online account badge when volunteer has password', () => {
    mockVolunteer.hasPassword = true;

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    expect(screen.getByTestId('online-badge')).toBeInTheDocument();
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

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Select Volunteer'));
    fireEvent.mouseDown(
      within(screen.getByTestId('roles-select')).getByRole('combobox'),
    );
    let listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role A'));
    fireEvent.click(within(listbox).getByText('Role B'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    const chipA = await screen.findByTestId(`role-chip-${slug('Role A')}`);
    const chipB = await screen.findByTestId(`role-chip-${slug('Role B')}`);
    const container = chipA.parentElement as HTMLElement;
    expect(container).toHaveStyle('display: grid');
    expect(container).toContainElement(chipB);
  });
});
