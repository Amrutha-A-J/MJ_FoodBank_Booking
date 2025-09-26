import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditVolunteer from '../volunteer-management/EditVolunteer';
import type { VolunteerSearchResult } from '../../../api/volunteers';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockVolunteer: VolunteerSearchResult = {
  id: 42,
  name: 'Jordan Volunteer',
  firstName: 'Jordan',
  lastName: 'Volunteer',
  email: 'jordan@example.com',
  phone: '555-0100',
  trainedAreas: [],
  hasShopper: false,
  hasPassword: false,
  clientId: null,
};

jest.mock('../../../components/EntitySearch', () =>
  function MockEntitySearch(props: { onSelect: (volunteer: VolunteerSearchResult) => void }) {
    return (
      <button onClick={() => props.onSelect(mockVolunteer)} data-testid="entity-search-mock">
        Select Volunteer
      </button>
    );
  },
);

describe('EditVolunteer', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders helper text about navigating to profiles', () => {
    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Search for a volunteer to view their profile and make updates.'),
    ).toBeInTheDocument();
  });

  it('navigates to the volunteer profile when a volunteer is selected', () => {
    render(
      <MemoryRouter>
        <EditVolunteer />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('entity-search-mock'));

    expect(mockNavigate).toHaveBeenCalledWith('/volunteer-management/volunteers/42');
  });
});
