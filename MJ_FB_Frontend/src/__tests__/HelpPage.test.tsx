import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HelpPage from '../pages/help/HelpPage';
import { useAuth } from '../hooks/useAuth';

jest.mock('../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function renderPage() {
  render(
    <MemoryRouter>
      <HelpPage />
    </MemoryRouter>
  );
}

describe('HelpPage', () => {
  it('filters content with search', () => {
    mockUseAuth.mockReturnValue({
      role: 'volunteer',
      access: [],
      token: '',
      name: '',
      userRole: '',
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
      ready: true,
      id: null,
    } as any);
    renderPage();
    expect(screen.getByText(/View schedule/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Recurring bookings/i)[0]).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: 'recurring' },
    });
    expect(screen.queryByText(/View schedule/i)).toBeNull();
    expect(screen.getAllByText(/Recurring bookings/i)[0]).toBeInTheDocument();
  });

  it('calls window.print when clicking Print', () => {
    mockUseAuth.mockReturnValue({
      role: 'volunteer',
      access: [],
      token: '',
      name: '',
      userRole: '',
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
      ready: true,
      id: null,
    } as any);
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('shows tabs for available roles', () => {
    mockUseAuth.mockReturnValue({
      role: 'staff',
      access: ['pantry', 'warehouse'],
      token: '',
      name: '',
      userRole: '',
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
      ready: true,
      id: null,
    } as any);
    renderPage();
    expect(screen.getByRole('tab', { name: /Pantry/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Warehouse/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Admin/i })).not.toBeInTheDocument();
  });

  it('includes updated timesheet help', () => {
    mockUseAuth.mockReturnValue({
      role: 'staff',
      access: ['pantry'],
      token: '',
      name: '',
      userRole: '',
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
      ready: true,
      id: null,
    } as any);
    renderPage();
    expect(
      screen.getByText(/Fill in hours or request leave days./i),
    ).toBeInTheDocument();
  });
});

