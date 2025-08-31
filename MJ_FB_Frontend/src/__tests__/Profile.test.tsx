import { render, screen, fireEvent } from '@testing-library/react';
import Profile from '../pages/booking/Profile';
import { requestPasswordReset, getUserProfile } from '../api/users';
import { getVolunteerProfile } from '../api/volunteers';
import type { Role, UserProfile } from '../types';

jest.mock('../api/users');
jest.mock('../api/volunteers');

describe('Profile password reset', () => {
  beforeEach(() => {
    (requestPasswordReset as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    ['staff', { firstName: 'S', lastName: 'Taff', email: 's@example.com', phone: null, role: 'staff' } as UserProfile, { email: 's@example.com' }],
    ['agency', { firstName: 'A', lastName: 'Gency', email: 'a@example.com', phone: null, role: 'agency' } as UserProfile, { email: 'a@example.com' }],
    ['shopper', { firstName: 'C', lastName: 'Lient', email: null, phone: null, role: 'shopper', clientId: 42 } as UserProfile, { clientId: '42' }],
    ['delivery', { firstName: 'D', lastName: 'Livery', email: null, phone: null, role: 'delivery', clientId: 84 } as UserProfile, { clientId: '84' }],
  ])('sends reset link for %s', async (role, profile, expected) => {
    (getUserProfile as jest.Mock).mockResolvedValue(profile);
    render(<Profile role={role as Role} />);
    const btn = await screen.findByRole('button', { name: /Reset Password/i });
    fireEvent.click(btn);
    await screen.findByText(/reset link/i);
    expect(requestPasswordReset).toHaveBeenCalledWith(expected);
  });

  it('sends reset link for volunteer', async () => {
    (getVolunteerProfile as jest.Mock).mockResolvedValue({
      firstName: 'V',
      lastName: 'Olunteer',
      email: null,
      phone: null,
      role: 'volunteer',
      username: 'vol1',
    } as UserProfile);
    render(<Profile role="volunteer" />);
    const btn = await screen.findByRole('button', { name: /Reset Password/i });
    fireEvent.click(btn);
    await screen.findByText(/reset link/i);
    expect(requestPasswordReset).toHaveBeenCalledWith({ username: 'vol1' });
  });
});
