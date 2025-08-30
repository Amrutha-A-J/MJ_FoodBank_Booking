import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerRankings from '../pages/volunteer-management/VolunteerRankings';
import {
  getVolunteerRoles,
  getVolunteerRankings,
  getVolunteerNoShowRanking,
} from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  getVolunteerRankings: jest.fn(),
  getVolunteerNoShowRanking: jest.fn(),
}));

describe('VolunteerRankings', () => {
  beforeEach(() => {
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Driver', category_name: 'Logistics', shifts: [] },
      { id: 2, name: 'Sorter', category_name: 'Warehouse', shifts: [] },
    ]);
    (getVolunteerRankings as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Alice', total: 5 },
    ]);
    (getVolunteerNoShowRanking as jest.Mock).mockResolvedValue([
      { id: 2, name: 'Bob', totalBookings: 10, noShows: 4, noShowRate: 0.4 },
    ]);
  });

  it('shows rankings and switches type', async () => {
    render(
      <MemoryRouter>
        <VolunteerRankings />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
    await waitFor(() => expect(getVolunteerRankings).toHaveBeenCalledWith(undefined));
    expect(screen.getByText('Alice')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByLabelText('Ranking'));
    fireEvent.click(screen.getByText('No Shows'));

    await waitFor(() => expect(getVolunteerNoShowRanking).toHaveBeenCalled());
    expect(screen.getByText('Bob')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByLabelText('Ranking'));
    fireEvent.click(screen.getByText('Sorter (Warehouse)'));
    await waitFor(() => expect(getVolunteerRankings).toHaveBeenCalledWith(2));
  });
});
