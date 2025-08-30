import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffLogin from '../pages/auth/StaffLogin';
import { loginStaff, staffExists, resendPasswordSetup } from '../api/users';

jest.mock('../api/users', () => ({
  loginStaff: jest.fn(),
  staffExists: jest.fn(),
  createStaff: jest.fn(),
  resendPasswordSetup: jest.fn(),
}));

describe('StaffLogin component', () => {
  it('shows friendly message on unauthorized error', async () => {
    (staffExists as jest.Mock).mockResolvedValue(true);
    const apiErr = Object.assign(new Error('backend'), { status: 401 });
    (loginStaff as jest.Mock).mockRejectedValue(apiErr);
    const onLogin = jest.fn();
    render(
      <MemoryRouter>
        <StaffLogin onLogin={onLogin} />
      </MemoryRouter>
    );
    await screen.findByRole('button', { name: /login/i });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(
      await screen.findByText('Incorrect email or password')
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
