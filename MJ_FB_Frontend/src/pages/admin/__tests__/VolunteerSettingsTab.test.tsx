import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerSettingsTab from '../settings/VolunteerSettingsTab';

jest.mock('../../../api/volunteers', () => ({
  getVolunteerMasterRoles: jest.fn(),
  getVolunteerRoles: jest.fn(),
  createVolunteerMasterRole: jest.fn(),
  createVolunteerRole: jest.fn(),
  deleteVolunteerRole: jest.fn(),
  restoreVolunteerRoles: jest.fn(),
}));

const {
  getVolunteerMasterRoles,
  getVolunteerRoles,
  createVolunteerMasterRole,
  createVolunteerRole,
  deleteVolunteerRole,
  restoreVolunteerRoles,
} = jest.requireMock('../../../api/volunteers');

describe('VolunteerSettingsTab', () => {
  beforeEach(() => {
    jest.useFakeTimers();
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

  afterEach(() => {
    jest.useRealTimers();
  });

  async function flushScrollTimers() {
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
  }

  it('renders master role sections with buttons', async () => {
    render(
      <MemoryRouter>
        <VolunteerSettingsTab />
      </MemoryRouter>
    );

    await flushScrollTimers();

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
        <VolunteerSettingsTab />
      </MemoryRouter>
    );

    await flushScrollTimers();

    fireEvent.click(await screen.findByText('Add Master Role'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'Drivers' },
    });
    fireEvent.click(within(dialog).getByText('Save'));

    await flushScrollTimers();

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
        <VolunteerSettingsTab />
      </MemoryRouter>
    );

    await flushScrollTimers();

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

    await flushScrollTimers();

    await waitFor(() =>
      expect(createVolunteerRole).toHaveBeenCalledWith(
        undefined,
        'Sorter',
        1,
        '09:00:00',
        '12:00:00',
        2,
        false,
        true
      )
    );
    await flushScrollTimers();
  });

  it('adds shift to existing sub-role', async () => {
    (createVolunteerRole as jest.Mock).mockResolvedValue({});

    render(
      <MemoryRouter>
        <VolunteerSettingsTab />
      </MemoryRouter>
    );

    await flushScrollTimers();

    fireEvent.click(await screen.findByText('Add Shift'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Name')).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Start Time'), {
      target: { value: '13:00:00' },
    });
    fireEvent.change(within(dialog).getByLabelText('End Time'), {
      target: { value: '15:00:00' },
    });
    fireEvent.click(within(dialog).getByText('Save'));

    await flushScrollTimers();

    await waitFor(() =>
      expect(createVolunteerRole).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        '13:00:00',
        '15:00:00',
        3,
        false,
        true
      )
    );
    await flushScrollTimers();
  });

  it('shows validation errors for required fields', async () => {
    render(
      <MemoryRouter>
        <VolunteerSettingsTab />
      </MemoryRouter>
    );

    await flushScrollTimers();

    fireEvent.click(await screen.findByText('Add Sub-role'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Max Volunteers'), {
      target: { value: '' },
    });
    fireEvent.click(within(dialog).getByText('Save'));

    await waitFor(() =>
      expect(within(dialog).getAllByText('Required')).toHaveLength(4)
    );
    expect(createVolunteerRole).not.toHaveBeenCalled();
  });

  it('shows API error when creating role fails', async () => {
    (createVolunteerRole as jest.Mock).mockRejectedValue(
      new Error('Slot times overlap existing slots')
    );

    render(
      <MemoryRouter>
        <VolunteerSettingsTab />
      </MemoryRouter>
    );

    await flushScrollTimers();

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

    await flushScrollTimers();

    expect(await screen.findByText('Slot times overlap existing slots'))
      .toBeInTheDocument();
  });

  it('restores roles and reloads data', async () => {
    (restoreVolunteerRoles as jest.Mock).mockResolvedValue({});

    render(
      <MemoryRouter>
        <VolunteerSettingsTab />
      </MemoryRouter>
    );

    await flushScrollTimers();

    fireEvent.click(await screen.findByText('Restore Original Roles & Shifts'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByText('Restore'));

    await flushScrollTimers();

    await waitFor(() => expect(restoreVolunteerRoles).toHaveBeenCalled());
    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalledTimes(2));
  });

  it('confirms before deleting shift', async () => {
    (deleteVolunteerRole as jest.Mock).mockResolvedValue({});

    render(
      <MemoryRouter>
        <VolunteerSettingsTab />
      </MemoryRouter>
    );

    await flushScrollTimers();

    const deleteButtons = await screen.findAllByLabelText('delete');
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    const dialog = await screen.findByText('Delete shift');
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await flushScrollTimers();

    await waitFor(() => expect(deleteVolunteerRole).toHaveBeenCalledWith(10));
  });
});
