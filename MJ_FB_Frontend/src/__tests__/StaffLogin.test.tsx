import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffLogin from '../pages/auth/StaffLogin';
import { loginStaff, staffExists, createStaff, resendPasswordSetup } from '../api/users';

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
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(
      await screen.findByText('Incorrect email or password')
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('shows account creation message and stays on form', async () => {
    (staffExists as jest.Mock).mockResolvedValue(false);
    (createStaff as jest.Mock).mockResolvedValue(undefined);
    const onLogin = jest.fn();
    render(
      <MemoryRouter>
        <StaffLogin onLogin={onLogin} />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: /create staff/i });
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Smith' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create staff/i }));
    expect(
      await screen.findByText(
        'Staff account created. Check your email to set a password before logging in.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
