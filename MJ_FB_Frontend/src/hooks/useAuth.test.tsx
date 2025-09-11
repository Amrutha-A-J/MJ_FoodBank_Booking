import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './useAuth';

describe('useAuth access parsing', () => {
  function AccessViewer() {
    const { access } = useAuth();
    return <div data-testid="access">{JSON.stringify(access)}</div>;
  }

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('reads valid access array from localStorage', () => {
    localStorage.setItem('access', JSON.stringify(['admin']));
    render(
      <AuthProvider>
        <AccessViewer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('access')).toHaveTextContent('["admin"]');
  });

  it('falls back to empty array on malformed localStorage access', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('access', 'not-json');
    render(
      <AuthProvider>
        <AccessViewer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('access')).toHaveTextContent('[]');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('uses empty array when storage event has malformed access', () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test');
    localStorage.setItem('access', JSON.stringify(['donor_management']));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <AuthProvider>
        <AccessViewer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('access')).toHaveTextContent('["donor_management"]');
    act(() => {
      localStorage.setItem('access', 'bad-json');
      window.dispatchEvent(new StorageEvent('storage', { key: 'access', newValue: 'bad-json' }));
    });
    expect(screen.getByTestId('access')).toHaveTextContent('[]');
    expect(warnSpy).toHaveBeenCalled();
  });
});
