import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientBottomNav from '../components/ClientBottomNav';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('ClientBottomNav', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('highlights bookings tab on booking routes', () => {
    render(
      <MemoryRouter initialEntries={['/booking-history']}>
        <ClientBottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('bookings')).toHaveClass('Mui-selected');
  });

  it('navigates to profile when profile tab clicked', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ClientBottomNav />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText('profile'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });
});
