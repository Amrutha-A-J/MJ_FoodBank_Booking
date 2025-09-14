import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../pages/booking/Profile';
import { getUserProfile, getUserPreferences } from '../api/users';
import { getVolunteerProfile } from '../api/volunteers';

jest.mock('../api/users', () => ({
  getUserProfile: jest.fn().mockResolvedValue({
    firstName: 'Test',
    lastName: 'User',
    email: 't@e.st',
    phone: '',
    role: 'shopper',
    clientId: 1,
  }),
  requestPasswordReset: jest.fn(),
  updateMyProfile: jest.fn().mockResolvedValue({
    firstName: 'Test',
    lastName: 'User',
    email: 't@e.st',
    phone: '',
    role: 'shopper',
    clientId: 1,
  }),
  getUserPreferences: jest.fn().mockResolvedValue({ emailReminders: true }),
  updateUserPreferences: jest.fn(),
}));

jest.mock('../api/volunteers', () => ({
  getVolunteerProfile: jest.fn().mockResolvedValue({
    firstName: 'Vol',
    lastName: 'User',
    email: 'v@e.st',
    phone: '',
    role: 'volunteer',
    clientId: 1,
  }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: 'volunteer', userRole: 'shopper' }),
}));

describe('Profile bottom nav', () => {
  it('shows schedule option for volunteers', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Profile role="volunteer" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(getVolunteerProfile).toHaveBeenCalled());
    await waitFor(() => expect(getUserPreferences).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: /shifts/i })).toBeInTheDocument();
  });

  it('does not show schedule option for shoppers', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Profile role="shopper" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(getUserProfile).toHaveBeenCalled());
    await waitFor(() => expect(getUserPreferences).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /shifts/i })).not.toBeInTheDocument();
  });
});

