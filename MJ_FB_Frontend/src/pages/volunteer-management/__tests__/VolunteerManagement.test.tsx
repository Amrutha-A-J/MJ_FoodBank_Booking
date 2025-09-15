import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VolunteerManagement from '../VolunteerManagement';
import {
  getVolunteerRoles,
  searchVolunteers,
  getVolunteerBookingsByRoles,
  updateVolunteerTrainedAreas,
  createVolunteerBookingForVolunteer,
} from '../../../api/volunteers';

jest.mock('../../../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  searchVolunteers: jest.fn(),
  getVolunteerBookingsByRoles: jest.fn(),
  updateVolunteerTrainedAreas: jest.fn(),
  createVolunteerBookingForVolunteer: jest.fn(),
}));

describe('VolunteerManagement force booking', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.useFakeTimers();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        category_name: 'Front',
        name: 'Greeter',
        max_volunteers: 1,
        shifts: [
          {
            id: 1,
            start_time: '09:00:00',
            end_time: '10:00:00',
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      },
    ]);
    (getVolunteerBookingsByRoles as jest.Mock).mockResolvedValue([]);
    (searchVolunteers as jest.Mock).mockResolvedValue([
      {
        id: 5,
        name: 'Test Vol',
        trainedAreas: [1],
      },
    ]);
    (createVolunteerBookingForVolunteer as jest.Mock)
      .mockRejectedValueOnce(new Error('Role is full'))
      .mockResolvedValueOnce(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    cleanup();
  });

  it('confirms increasing capacity before forcing booking', async () => {
    render(
      <MemoryRouter initialEntries={['/volunteers/schedule']}>
        <Routes>
          <Route path="/volunteers/:tab" element={<VolunteerManagement />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
    await act(async () => {});

    fireEvent.mouseDown(screen.getByLabelText('Role'));
    await act(async () => {
      fireEvent.click(await screen.findByRole('option', { name: 'Greeter' }));
    });

    fireEvent.click(await screen.findByText('Available'));

    await user.type(await screen.findByLabelText('Search'), 'Test');
    fireEvent.click(await screen.findByRole('button', { name: 'Assign' }));

    expect(
      await screen.findByText('Role is full. Force booking and increase capacity?'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(createVolunteerBookingForVolunteer).toHaveBeenNthCalledWith(
        1,
        5,
        1,
        expect.any(String),
        false,
      );
      expect(createVolunteerBookingForVolunteer).toHaveBeenNthCalledWith(
        2,
        5,
        1,
        expect.any(String),
        true,
      );
    });
  });
});
