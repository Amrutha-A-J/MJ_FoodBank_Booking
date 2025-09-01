import { screen } from '@testing-library/react';
import App from '../App';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

describe('AgencyManagement', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = mockFetch();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });
    localStorage.clear();
  });

  afterEach(() => {
    restoreFetch();
    jest.resetAllMocks();
  });

  it('shows tabs for adding agencies and managing clients', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['pantry']));
    window.history.pushState({}, '', '/pantry/agency-management');
    renderWithProviders(<App />);
    expect(
      await screen.findByRole('tab', { name: /add agency/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /add client to agency/i }),
    ).toBeInTheDocument();
  });
});
