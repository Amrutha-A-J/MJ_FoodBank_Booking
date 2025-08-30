import { render, screen } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../hooks/useAuth';

const realFetch = global.fetch;

describe('AgencyManagement', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('shows tabs for adding agencies and managing clients', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['pantry']));
    window.history.pushState({}, '', '/pantry/agency-management');
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(
      await screen.findByRole('tab', { name: /add agency/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /add client to agency/i }),
    ).toBeInTheDocument();
  });
});
