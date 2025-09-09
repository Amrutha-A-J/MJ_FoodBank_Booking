import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerBottomNav from '../components/VolunteerBottomNav';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('VolunteerBottomNav', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('selects schedule tab when on schedule route', () => {
    render(
      <MemoryRouter initialEntries={['/volunteer/schedule']}>
        <VolunteerBottomNav />
      </MemoryRouter>,
    );
    const scheduleBtn = screen.getByRole('button', { name: /schedule/i });
    expect(scheduleBtn).toHaveClass('Mui-selected');
  });

  it('navigates to dashboard when dashboard tab clicked', () => {
    render(
      <MemoryRouter initialEntries={['/volunteer/schedule']}>
        <VolunteerBottomNav />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/volunteer');
  });
});
