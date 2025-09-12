import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditVolunteer from '../volunteer-management/EditVolunteer';
import { getVolunteerRoles, getVolunteerById } from '../../../api/volunteers';

jest.mock('../../../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  updateVolunteerTrainedAreas: jest.fn(),
  getVolunteerById: jest.fn(),
}));

const mockVolunteer: any = {
  id: 1,
  name: 'John Doe',
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

    fireEvent.click(screen.getByText('Select Volunteer'));
    const saveBtn = await screen.findByTestId('save-button');
    expect(saveBtn).toBeDisabled();

    fireEvent.mouseDown(screen.getByLabelText(/roles/i));
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Role A'));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    expect(saveBtn).not.toBeDisabled();
  });
});
