import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerManagement from '../VolunteerManagement';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';

describe('VolunteerManagement tabs', () => {
  it('renders volunteer management tabs', () => {
    renderWithProviders(
      <MemoryRouter>
        <VolunteerManagement />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('tab', { name: /search volunteer/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /delete/i })).toBeInTheDocument();
  });
});
