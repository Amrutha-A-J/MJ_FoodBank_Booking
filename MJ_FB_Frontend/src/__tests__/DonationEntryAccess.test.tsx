import { screen } from '@testing-library/react';
import App from '../App';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';

let fetchMock: jest.Mock;

describe('donation entry volunteer access', () => {
  beforeEach(() => {
    fetchMock = mockFetch();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      });
    localStorage.setItem('role', 'volunteer');
    localStorage.setItem('name', 'Donation User');
    localStorage.setItem('access', JSON.stringify(['donation_entry']));
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    restoreFetch();
    localStorage.clear();
  });

  it('redirects to donation log', async () => {
    renderWithProviders(<App />);
    expect(await screen.findByText(/Donation Log/i)).toBeInTheDocument();
  });
});
