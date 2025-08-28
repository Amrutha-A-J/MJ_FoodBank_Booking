import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientSignup from '../pages/auth/ClientSignup';
import { sendRegistrationOtp, registerUser } from '../api/users';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../api/users', () => ({
  sendRegistrationOtp: jest.fn(),
  registerUser: jest.fn(),
}));

describe('ClientSignup', () => {
  beforeEach(() => {
    (sendRegistrationOtp as jest.Mock).mockResolvedValue(undefined);
    (registerUser as jest.Mock).mockResolvedValue(undefined);
    mockNavigate.mockReset();
  });

  it('validates required fields', () => {
    render(
      <MemoryRouter>
        <ClientSignup />
      </MemoryRouter>
    );
    const submit = screen.getByRole('button', { name: /send code/i });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass' } });
    expect(submit).not.toBeDisabled();
  });

  it('handles OTP step and registration', async () => {
    jest.useFakeTimers();
    render(
      <MemoryRouter>
        <ClientSignup />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /send code/i }));
    await waitFor(() => expect(sendRegistrationOtp).toHaveBeenCalled());
    expect(screen.getByLabelText(/otp/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/otp/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => expect(registerUser).toHaveBeenCalled());
    jest.runAllTimers();
    expect(mockNavigate).toHaveBeenCalledWith('/login/user');
  });
});
