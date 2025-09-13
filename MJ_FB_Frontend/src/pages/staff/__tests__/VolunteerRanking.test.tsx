import { MemoryRouter } from 'react-router-dom';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import VolunteerRanking from '../volunteer-management/VolunteerRanking';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getVolunteerRoles, getVolunteerRankings } from '../../../api/volunteers';

jest.mock('../../../api/volunteers');

const mockGetVolunteerRoles = getVolunteerRoles as jest.MockedFunction<typeof getVolunteerRoles>;
const mockGetVolunteerRankings = getVolunteerRankings as jest.MockedFunction<typeof getVolunteerRankings>;

describe('VolunteerRanking', () => {
  beforeEach(() => {
    mockGetVolunteerRoles.mockReset();
    mockGetVolunteerRankings.mockReset();
  });

  it('shows top five volunteers overall and per department', async () => {
    const roles = [
      { id: 1, category_id: 10, name: 'Sorter', max_volunteers: 5, category_name: 'Pantry', shifts: [] },
      { id: 2, category_id: 10, name: 'Packer', max_volunteers: 5, category_name: 'Pantry', shifts: [] },
      { id: 3, category_id: 20, name: 'Reception', max_volunteers: 5, category_name: 'Office', shifts: [] },
    ];
    mockGetVolunteerRoles.mockResolvedValue(roles);

    const overall = [
      { id: 101, name: 'Gina', total: 100 },
      { id: 102, name: 'Hank', total: 90 },
      { id: 103, name: 'Ivy', total: 80 },
      { id: 104, name: 'Jack', total: 70 },
      { id: 105, name: 'Ken', total: 60 },
      { id: 106, name: 'Liam', total: 50 },
    ];

    const byRole: Record<number, typeof overall> = {
      1: [
        { id: 101, name: 'Gina', total: 3 },
        { id: 102, name: 'Hank', total: 2 },
      ],
      2: [
        { id: 101, name: 'Gina', total: 1 },
        { id: 103, name: 'Ivy', total: 5 },
      ],
      3: [
        { id: 104, name: 'Jack', total: 7 },
        { id: 105, name: 'Ken', total: 4 },
        { id: 106, name: 'Liam', total: 3 },
      ],
    } as Record<number, any>;

    mockGetVolunteerRankings.mockImplementation(async (roleId?: number) => {
      if (roleId) return byRole[roleId];
      return overall;
    });

    renderWithProviders(
      <MemoryRouter>
        <VolunteerRanking />
      </MemoryRouter>,
    );

    // overall ranking only shows top five
    expect(await screen.findByText('1. Gina')).toBeInTheDocument();
    const allDeptAccordion = screen.getByText('All Departments').closest('.MuiAccordion-root')!;
    const allDeptItems = within(allDeptAccordion).getAllByRole('listitem');
    expect(allDeptItems).toHaveLength(5);
    expect(screen.queryByText('6. Liam')).not.toBeInTheDocument();

    const user = userEvent.setup();

    // Pantry department aggregates roles 1 and 2
    await user.click(screen.getByRole('button', { name: 'Pantry' }));
    expect(await screen.findByText('1. Ivy')).toBeInTheDocument();
    let item = screen.getByText('1. Ivy').closest('li');
    expect(within(item!).getByText('5 shifts')).toBeInTheDocument();
    item = screen.getByText('2. Gina').closest('li');
    expect(within(item!).getByText('4 shifts')).toBeInTheDocument();
    item = screen.getByText('3. Hank').closest('li');
    expect(within(item!).getByText('2 shifts')).toBeInTheDocument();

    // Office department
    await user.click(screen.getByRole('button', { name: 'Office' }));
    expect(await screen.findByText('1. Jack')).toBeInTheDocument();
    item = screen.getByText('1. Jack').closest('li');
    expect(within(item!).getByText('7 shifts')).toBeInTheDocument();
    item = screen.getByText('2. Ken').closest('li');
    expect(within(item!).getByText('4 shifts')).toBeInTheDocument();
    item = screen.getByText('3. Liam').closest('li');
    expect(within(item!).getByText('3 shifts')).toBeInTheDocument();
  });
});
