import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerSettings from '../VolunteerSettings';

jest.mock('../../../api/volunteers', () => ({
  getVolunteerMasterRoles: jest.fn(),
  getVolunteerRoles: jest.fn(),
  createVolunteerMasterRole: jest.fn(),
  createVolunteerRole: jest.fn(),
}));

const {
  getVolunteerMasterRoles,
  getVolunteerRoles,
  createVolunteerMasterRole,
  createVolunteerRole,
} = jest.requireMock('../../../api/volunteers');

describe('VolunteerSettings page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVolunteerMasterRoles as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Food Prep' },
    ]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Packing',
        max_volunteers: 3,
        category_id: 1,
        is_wednesday_slot: false,
        is_active: true,
        category_name: 'Food Prep',
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
  });

  it('renders master role sections with buttons', async () => {
    render(
      <MemoryRouter>
        <VolunteerSettings />
      </MemoryRouter>
    );

    expect(await screen.findByText('Food Prep')).toBeInTheDocument();
    expect(screen.getByText('Packing')).toBeInTheDocument();

    const subButtons = screen.getAllByText('Add Sub-role');
    expect(subButtons).toHaveLength(1);

    expect(screen.getByRole('button', { name: 'Add Master Role' })).toBeInTheDocument();
  });

  it('handles master role dialog flow', async () => {
    (createVolunteerMasterRole as jest.Mock).mockResolvedValue({ id: 2, name: 'Drivers' });

    render(
      <MemoryRouter>
        <VolunteerSettings />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('Add Master Role'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'Drivers' },
    });
    fireEvent.click(within(dialog).getByText('Save'));

    await waitFor(() => expect(createVolunteerMasterRole).toHaveBeenCalledWith('Drivers'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(getVolunteerMasterRoles).toHaveBeenCalledTimes(1);

    const summary = await screen.findByRole('button', { name: 'Drivers' });
    expect(summary).toHaveAttribute('aria-expanded', 'true');
  });

  it('handles sub-role dialog flow', async () => {
    (createVolunteerRole as jest.Mock).mockResolvedValue({});

    render(
      <MemoryRouter>
        <VolunteerSettings />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('Add Sub-role'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'Sorter' },
    });
    fireEvent.change(within(dialog).getByLabelText('Start Time'), {
      target: { value: '09:00:00' },
    });
    fireEvent.change(within(dialog).getByLabelText('End Time'), {
      target: { value: '12:00:00' },
    });
    fireEvent.change(within(dialog).getByLabelText('Max Volunteers'), {
      target: { value: '2' },
    });
    fireEvent.click(within(dialog).getByText('Save'));

    await waitFor(() =>
      expect(createVolunteerRole).toHaveBeenCalledWith(
        'Sorter',
        '09:00:00',
        '12:00:00',
        2,
        1,
        false,
        true
      )
    );
  });
});
