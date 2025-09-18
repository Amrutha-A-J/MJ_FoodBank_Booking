import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditVolunteer from '../volunteer-management/EditVolunteer';
import {
  getVolunteerRoles,
  getVolunteerById,
  updateVolunteer,
  getVolunteerBookingHistory,
} from '../../../api/volunteers';

jest.mock('../../../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  updateVolunteerTrainedAreas: jest.fn(),
  getVolunteerById: jest.fn(),
  updateVolunteer: jest.fn(),
  getVolunteerBookingHistory: jest.fn(),
}));

jest.mock('../../../api/users', () => ({
  requestPasswordReset: jest.fn(),
}));

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

describe('EditVolunteer save button', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockReset();
    (getVolunteerById as jest.Mock).mockResolvedValue(mockVolunteer);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
  });

  it('is disabled until roles change', async () => {
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

    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Select Volunteer'));
    await waitFor(() => expect(getVolunteerBookingHistory).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Roles' }));
    const saveBtn = await screen.findByTestId('save-button');
    expect(saveBtn).toBeDisabled();

    fireEvent.mouseDown(
      screen.getByTestId('roles-select').querySelector('[role="combobox"]')!,
    );
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role A'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    expect(saveBtn).not.toBeDisabled();
  });
});
