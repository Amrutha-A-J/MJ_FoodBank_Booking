import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerLogin from '../pages/auth/VolunteerLogin';
import { loginVolunteer } from '../api/volunteers';
import { resendPasswordSetup } from '../api/users';

jest.mock('../api/volunteers', () => ({
  loginVolunteer: jest.fn(),
}));

jest.mock('../api/users', () => ({
  resendPasswordSetup: jest.fn(),
}));

describe('VolunteerLogin component', () => {
  it('shows friendly message on unauthorized error', async () => {
    const apiErr = Object.assign(new Error('backend'), { status: 401 });
    (loginVolunteer as jest.Mock).mockRejectedValue(apiErr);
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <VolunteerLogin onLogin={onLogin} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(
      await screen.findByText('Incorrect email or password')
    ).toBeInTheDocument();
    expect(loginVolunteer).toHaveBeenCalledWith('user@example.com', 'pass');
    expect(onLogin).not.toHaveBeenCalled();
  });
});
