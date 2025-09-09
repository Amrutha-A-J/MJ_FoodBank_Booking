import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditVolunteer from '../EditVolunteer';
import { renderWithProviders } from '../../../../../testUtils/renderWithProviders';
import { getVolunteerRoles } from '../../../../api/volunteers';

jest.mock('../../../../api/volunteers');

const mockVolunteer = { id: 1, name: 'Jane Doe', trainedAreas: [1] };

jest.mock('../../../../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect(mockVolunteer)}>select volunteer</button>
));

describe('EditVolunteer role selection', () => {
  const roles = [
    {
      id: 1,
      category_id: 1,
      name: 'Pantry',
      max_volunteers: 1,
      category_name: 'General',
      shifts: [],
    },
    {
      id: 2,
      category_id: 1,
      name: 'Warehouse',
      max_volunteers: 1,
      category_name: 'General',
      shifts: [],
    },
  ];

  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue(roles);
  });

  it('adds chip when selecting from dropdown', async () => {
    renderWithProviders(<EditVolunteer />);
    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /select volunteer/i }));
    expect(await screen.findByText('Pantry')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Roles'));
    await userEvent.click(await screen.findByText('Warehouse'));
    await userEvent.click(document.body);

    expect(screen.getByText('Warehouse')).toBeInTheDocument();
  });

  it('removes chip on delete', async () => {
    renderWithProviders(<EditVolunteer />);
    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /select volunteer/i }));
    const chip = await screen.findByText('Pantry');
    const deleteIcon = chip.parentElement?.querySelector('svg');
    if (deleteIcon) await userEvent.click(deleteIcon);
    expect(screen.queryByText('Pantry')).not.toBeInTheDocument();
  });
});

