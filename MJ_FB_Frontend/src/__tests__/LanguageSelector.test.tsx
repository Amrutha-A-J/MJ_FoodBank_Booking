import { screen } from '@testing-library/react';
import App from '../App';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

describe('Language selector visibility', () => {
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

  it('shows language selector on login page', () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
      headers: new Headers(),
    });
    window.history.pushState({}, '', '/login');
    renderWithProviders(<App />);
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it('shows language selector on client dashboard', () => {
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Test User');
    window.history.pushState({}, '', '/');
    renderWithProviders(<App />);
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it('hides language selector on staff dashboard', () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Staff User');
    localStorage.setItem('access', JSON.stringify(['pantry']));
    window.history.pushState({}, '', '/pantry');
    renderWithProviders(<App />);
    expect(screen.queryByText("English")).not.toBeInTheDocument();
  });
});
