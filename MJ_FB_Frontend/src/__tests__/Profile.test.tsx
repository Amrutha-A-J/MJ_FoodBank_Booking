import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Profile from '../pages/booking/Profile';
import {
  requestPasswordReset,
  getUserProfile,
  getUserPreferences,
} from '../api/users';
import { getVolunteerProfile } from '../api/volunteers';
import type { Role, UserProfile } from '../types';

jest.mock('../api/users');
jest.mock('../api/volunteers');

describe('Profile password reset', () => {
  beforeEach(() => {
    (requestPasswordReset as jest.Mock).mockResolvedValue(undefined);
    (getUserPreferences as jest.Mock).mockResolvedValue({ emailReminders: true });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
    (console.error as jest.Mock).mockRestore();
  });

  it.each([
    ['staff', { firstName: 'S', lastName: 'Taff', email: 's@example.com', phone: null, role: 'staff' } as UserProfile, { email: 's@example.com' }],
    ['agency', { firstName: 'A', lastName: 'Gency', email: 'a@example.com', phone: null, role: 'agency' } as UserProfile, { email: 'a@example.com' }],
    ['shopper', { firstName: 'C', lastName: 'Lient', email: null, phone: null, role: 'shopper', clientId: 42 } as UserProfile, { clientId: '42' }],
    ['delivery', { firstName: 'D', lastName: 'Livery', email: null, phone: null, role: 'delivery', clientId: 84 } as UserProfile, { clientId: '84' }],
    ])('sends reset link for %s', async (role, profile, payload) => {
      (getUserProfile as jest.Mock).mockResolvedValue(profile);
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Profile role={role as Role} />} />
          </Routes>
        </MemoryRouter>
      );
      await waitFor(() => expect(getUserProfile).toHaveBeenCalled());
      if (role !== 'staff' && role !== 'agency') {
        await waitFor(() => expect(getUserPreferences).toHaveBeenCalled());
      }
      const btn = await screen.findByRole('button', { name: /Reset Password/i });
      await waitFor(() => expect(btn).toBeEnabled());
      fireEvent.click(btn);
      expect(requestPasswordReset).toHaveBeenCalledWith(payload);
    });

    it('sends reset link using email for volunteer', async () => {
      (getVolunteerProfile as jest.Mock).mockResolvedValue({
        firstName: 'V',
        lastName: 'Olunteer',
        email: 'v@example.com',
        phone: null,
        role: 'volunteer',
      } as UserProfile);
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Profile role="volunteer" />} />
          </Routes>
        </MemoryRouter>
      );
      await waitFor(() => expect(getVolunteerProfile).toHaveBeenCalled());
      await waitFor(() => expect(getUserPreferences).toHaveBeenCalled());
      const btn = await screen.findByRole('button', { name: /Reset Password/i });
      await waitFor(() => expect(btn).toBeEnabled());
      fireEvent.click(btn);
      expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'v@example.com' });
    });
});
