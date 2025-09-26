import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditVolunteer from '../volunteer-management/EditVolunteer';
import type { VolunteerSearchResult } from '../../../api/volunteers';

const mockVolunteer: VolunteerSearchResult = {
  id: 42,
  name: 'Jane Volunteer',
  firstName: 'Jane',
  lastName: 'Volunteer',
  email: undefined,
  phone: undefined,
  trainedAreas: [],
  hasShopper: false,
  hasPassword: false,
  clientId: null,
};

jest.mock('../../../components/EntitySearch', () =>
  function MockEntitySearch(props: any) {
    return (
      <button type="button" onClick={() => props.onSelect(mockVolunteer)}>
        Select Volunteer
      </button>
    );
  },
);

describe('EditVolunteer search', () => {
  function renderWithRouter() {
    return render(
      <MemoryRouter initialEntries={[{ pathname: '/volunteer-management' }] as any}>
        <Routes>
          <Route path="/volunteer-management" element={<EditVolunteer />} />
          <Route
            path="/volunteer-management/volunteers/:volunteerId"
            element={<div data-testid="volunteer-profile" />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('shows search instructions', () => {
    renderWithRouter();
    expect(
      screen.getByText(
        'Find a volunteer to open their profile, manage roles, and review stats.',
      ),
    ).toBeInTheDocument();
  });

  it('navigates to the volunteer profile when a result is selected', async () => {
    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: /select volunteer/i }));
    expect(await screen.findByTestId('volunteer-profile')).toBeInTheDocument();
  });
});
