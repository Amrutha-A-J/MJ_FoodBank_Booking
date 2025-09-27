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
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(
      screen.getByRole('tab', { name: /search volunteer/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ranking/i })).toBeInTheDocument();
  });
});
