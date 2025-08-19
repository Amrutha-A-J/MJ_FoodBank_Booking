import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../components/Login';
import { loginUser } from '../api/api';

jest.mock('../api/api', () => ({
  loginUser: jest.fn(),
}));

describe('Login component', () => {
  it('submits login credentials and calls onLogin', async () => {
    (loginUser as jest.Mock).mockResolvedValue({
      role: 'user',
      name: 'Test',
    });
    const onLogin = jest.fn();
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });
});
