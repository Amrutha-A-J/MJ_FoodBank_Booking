import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerRankings from '../../volunteer-management/VolunteerRankings';
import { getVolunteerRoles, getVolunteerRankings } from '../../../api/volunteers';

jest.mock('../../../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  getVolunteerRankings: jest.fn(),
}));

describe('VolunteerRanking', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Greeter', category_name: 'Front Desk', shifts: [] },
      { id: 2, name: 'Sorter', category_name: 'Warehouse', shifts: [] },
    ]);
    (getVolunteerRankings as jest.Mock).mockResolvedValue({
      all: [
        { id: 1, name: 'Alice', total: 10 },
        { id: 2, name: 'Bob', total: 8 },
        { id: 3, name: 'Cara', total: 7 },
        { id: 4, name: 'Dan', total: 6 },
        { id: 5, name: 'Eve', total: 5 },
        { id: 6, name: 'Frank', total: 4 },
      ],
      departments: {
        'Front Desk': [
          { id: 1, name: 'Alice', total: 10 },
          { id: 2, name: 'Bob', total: 8 },
        ],
        Warehouse: [
          { id: 3, name: 'Cara', total: 7 },
          { id: 4, name: 'Dan', total: 6 },
          { id: 5, name: 'Eve', total: 5 },
          { id: 6, name: 'Frank', total: 4 },
        ],
      },
    });
  });

  it('shows top-five volunteers and department accordions', async () => {
    render(
      <MemoryRouter>
        <VolunteerRankings />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
    await waitFor(() => expect(getVolunteerRankings).toHaveBeenCalled());

    // Top-five list should exclude lower-ranked volunteers
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Eve')).toBeInTheDocument();
    expect(screen.queryByText('Frank')).not.toBeInTheDocument();

    // Department accordions should reveal respective volunteers
    fireEvent.click(screen.getByRole('button', { name: /warehouse/i }));
    expect(await screen.findByText('Frank')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /front desk/i }));
    expect(await screen.findByText('Alice')).toBeInTheDocument();
  });
});

